import { deflateSync, Inflate } from 'fflate';

export type Signal = { version: 1; session: string; type: 'offer' | 'answer'; sdp: string };
const MAX_SIGNAL = 128 * 1024;
const MAX_FRAMES = 144;
const PART_SIZE = 180;
const encoder = new TextEncoder();

function base64(bytes: Uint8Array): string {
    return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unbase64(text: string): Uint8Array {
    if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error('Invalid signaling encoding.');
    return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}
async function digest(bytes: Uint8Array): Promise<string> {
    return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)));
}
function validate(value: unknown): Signal {
    const s = value as Partial<Signal> | null;
    if (!s || s.version !== 1 || !/^[a-f0-9-]{36}$/.test(s.session ?? '') ||
        (s.type !== 'offer' && s.type !== 'answer') || typeof s.sdp !== 'string' || !s.sdp.startsWith('v=0')) {
        throw new Error('Unsupported or invalid connection information.');
    }
    return s as Signal;
}
export async function encodeSignal(signal: Signal): Promise<string[]> {
    validate(signal);
    const raw = encoder.encode(JSON.stringify(signal));
    if (raw.length > MAX_SIGNAL) throw new Error('Connection information is too large.');
    const compressed = deflateSync(raw);
    const payload = base64(compressed);
    const count = Math.ceil(payload.length / PART_SIZE);
    if (count > MAX_FRAMES) throw new Error('Connection information needs too many QR frames.');
    const hash = await digest(compressed);
    return Array.from({ length: count }, (_, i) =>
        `TRT1:${signal.session}:${signal.type}:${i}:${count}:${hash}:${payload.slice(i * PART_SIZE, (i + 1) * PART_SIZE)}`);
}

export class SignalAssembler {
    private key = '';
    private parts = new Map<number, string>();
    private count = 0;
    get progress() { return { received: this.parts.size, total: this.count }; }

    async add(frame: string): Promise<Signal | null> {
        if (frame.length > 800) throw new Error('QR frame is too large.');
        try {
            const link = new URL(frame.trim());
            if (['https:', 'http:'].includes(link.protocol) && link.pathname === '/file-transfer' && link.searchParams.get('mode') === 'receive') return null;
        } catch { /* Connection frames are not URLs. */ }
        const fields = frame.trim().split(':');
        if (fields.length !== 7) throw new Error('This is not a File Transfer QR code.');
        const [version, session, type, indexText, countText, hash, payload] = fields;
        const index = Number(indexText), count = Number(countText);
        if (version !== 'TRT1' || !/^[a-f0-9-]{36}$/.test(session) || !['offer', 'answer'].includes(type) ||
            !/^\d+$/.test(indexText) || !/^\d+$/.test(countText) || count < 1 || count > MAX_FRAMES || index >= count ||
            !/^[A-Za-z0-9_-]{43}$/.test(hash) || !/^[A-Za-z0-9_-]{1,640}$/.test(payload)) {
            throw new Error('Invalid or unsupported QR frame.');
        }
        const key = `${session}:${type}:${count}:${hash}`;
        if (this.key && key !== this.key) throw new Error('QR frames belong to different sessions. Reset scanning to try again.');
        if (this.parts.has(index) && this.parts.get(index) !== payload) throw new Error('Conflicting QR frame.');
        this.key = key;
        this.count = count;
        this.parts.set(index, payload);
        if (this.parts.size !== count) return null;
        const compressed = unbase64(Array.from({ length: count }, (_, i) => this.parts.get(i)!).join(''));
        if (await digest(compressed) !== hash) throw new Error('Connection information failed its checksum.');
        const chunks: Uint8Array[] = [];
        let length = 0;
        const inflate = new Inflate(chunk => {
            length += chunk.length;
            if (length > MAX_SIGNAL) throw new Error('Decompressed signaling exceeds the size limit.');
            chunks.push(chunk);
        });
        // Small inputs also bound temporary output allocations for hostile compressed data.
        for (let i = 0; i < compressed.length; i += 64) inflate.push(compressed.subarray(i, i + 64), i + 64 >= compressed.length);
        const raw = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.length; }
        const signal = validate(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)));
        if (signal.session !== session || signal.type !== type) throw new Error('Signaling envelope does not match its frames.');
        return signal;
    }
}
