import { CHUNK, decode, encode, type Manifest, type Packet } from './protocol.ts';
import { deflateSync, inflateSync } from 'fflate';

export const MAX_PACKETS = 10;
export const MIN_INTERVAL = 250;
export const MAX_FRAME_BYTES = 1800;
export const MAX_METADATA_BYTES = 128 * 1024;
export type Profile = { packetsPerFrame: number; intervalMs: number };
export type FramePacket
    = | { kind: 'metadata'; part: number; total: number; data: string }
        | { kind: 'data'; file: number; part: number; data: string };
export type Observation = { qrModules: number; codePixels: number };
export type Report = Observation & Profile & {
    epoch: number;
    lastSequence: number;
    frames: number;
    sequenceSpan: number;
    elapsedMs: number;
    ageMs: number;
    encodedBytes: number;
    frameKind: 'metadata' | 'data' | 'mixed';
};
export type TransferFrame = {
    kind: 'transfer'; id: string; sequence: number; epoch: number;
    profile: Profile; packets: FramePacket[];
};
export type FeedbackFrame = {
    kind: 'feedback'; id: string; sequence: number; keys: string[];
    maxPackets: number; minIntervalMs: number; report: Report | null;
};
export type Frame = TransferFrame | FeedbackFrame;

export function packetKey(packet: FramePacket) {
    return packet.kind === 'metadata' ? `m:${packet.part}` : `${packet.file}:${packet.part}`;
}
export function frameBytes(raw: string) {
    return new TextEncoder().encode(raw).length;
}
export function encodeFrame(frame: Frame): string {
    const report = frame.kind === 'feedback' ? frame.report : null;
    const wire = frame.kind === 'transfer'
        ? [4, frame.id, 't', frame.sequence, frame.epoch, frame.profile.packetsPerFrame, frame.profile.intervalMs,
                frame.packets.map(p => p.kind === 'metadata' ? ['m', p.part, p.total, p.data] : ['d', p.file, p.part, p.data])]
        : [4, frame.id, 'f', frame.sequence, frame.keys, frame.maxPackets, frame.minIntervalMs,
                report && [report.epoch, report.lastSequence, report.frames, report.sequenceSpan, report.elapsedMs, report.ageMs,
                    report.packetsPerFrame, report.intervalMs, report.encodedBytes, report.qrModules, report.codePixels, report.frameKind]];
    const raw = JSON.stringify(wire);
    if (frameBytes(raw) > MAX_FRAME_BYTES) throw Error('QR frame exceeds the payload limit.');
    // Independent frames need no dictionary or previously decoded QR. Keep the
    // plain form when compression plus base64 would barely help or grow it.
    const compressed = `TRT4:${btoa(String.fromCharCode(...deflateSync(new TextEncoder().encode(raw))))}`;
    return compressed.length + 32 < raw.length ? compressed : raw;
}

function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
    return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
}
function payload(value: unknown): value is string {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value) || value.length > 128) return false;
    return value.length > 0 && atob(value).length <= CHUNK;
}
function profile(packets: unknown, interval: unknown) {
    return integer(packets, 1, MAX_PACKETS) && integer(interval, MIN_INTERVAL, 2000);
}
export function decodeFrame(raw: string): Frame {
    if (frameBytes(raw) > MAX_FRAME_BYTES) throw Error('QR frame exceeds the payload limit.');
    if (raw.startsWith('TRT4:')) {
        const data = raw.slice(5);
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw Error('Invalid compressed QR frame.');
        // fflate truncates into this fixed output buffer. The extra byte lets
        // us detect overflow without allocating an attacker-controlled size.
        const bytes = inflateSync(Uint8Array.from(atob(data), c => c.charCodeAt(0)), { out: new Uint8Array(MAX_FRAME_BYTES + 1) });
        if (bytes.length > MAX_FRAME_BYTES) throw Error('QR frame exceeds the payload limit.');
        raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    const w: unknown = JSON.parse(raw);
    if (!Array.isArray(w) || w.length !== 8 || w[0] !== 4 || typeof w[1] !== 'string' || !w[1].length || w[1].length > 64 || !integer(w[3]))
        throw Error('Unsupported transfer QR code. Refresh both devices.');
    if (w[2] === 't' && integer(w[4]) && profile(w[5], w[6]) && Array.isArray(w[7]) && w[7].length > 0 && w[7].length <= w[5]) {
        const packets: FramePacket[] = w[7].map((p: unknown) => {
            if (!Array.isArray(p) || p.length !== 4 || !payload(p[3])) throw Error('Invalid QR packet.');
            if (p[0] === 'd' && integer(p[1], 0, 99) && integer(p[2], 0, Math.ceil(100 * 1024 * 1024 / CHUNK) - 1))
                return { kind: 'data', file: p[1], part: p[2], data: p[3] };
            if (p[0] === 'm' && integer(p[2], 1, Math.ceil(MAX_METADATA_BYTES / CHUNK)) && integer(p[1], 0, p[2] - 1))
                return { kind: 'metadata', part: p[1], total: p[2], data: p[3] };
            throw Error('Invalid QR packet.');
        });
        return { kind: 'transfer', id: w[1], sequence: w[3], epoch: w[4], profile: { packetsPerFrame: w[5], intervalMs: w[6] }, packets };
    }
    if (w[2] === 'f' && Array.isArray(w[4]) && w[4].length <= 32 && w[4].every((k: unknown) => typeof k === 'string' && /^(?:m:\d+|\d+:\d+)$/.test(k) && k.length <= 24) && integer(w[5], 1, MAX_PACKETS) && integer(w[6], MIN_INTERVAL, 2000)) {
        let report: Report | null = null;
        const r = w[7];
        if (r !== null) {
            if (!Array.isArray(r) || r.length !== 12 || !r.slice(0, 9).every((n: unknown) => integer(n)) || !profile(r[6], r[7])
                || r[2] < 1 || r[2] > 32 || r[3] < r[2] || r[3] > r[1] + 1 || r[8] > MAX_FRAME_BYTES
                || !integer(r[9], 0, 177) || (r[9] !== 0 && (r[9] < 21 || (r[9] - 21) % 4 !== 0))
                || typeof r[10] !== 'number' || !Number.isFinite(r[10]) || r[10] < 0 || r[10] > 16384
                || !['metadata', 'data', 'mixed'].includes(r[11])) throw Error('Invalid receiver measurements.');
            report = { epoch: r[0], lastSequence: r[1], frames: r[2], sequenceSpan: r[3], elapsedMs: r[4], ageMs: r[5],
                packetsPerFrame: r[6], intervalMs: r[7], encodedBytes: r[8], qrModules: r[9], codePixels: r[10], frameKind: r[11] };
        }
        return { kind: 'feedback', id: w[1], sequence: w[3], keys: w[4], maxPackets: w[5], minIntervalMs: w[6], report };
    }
    throw Error('Invalid transfer QR frame.');
}

export function metadataPackets(manifest: Manifest): FramePacket[] {
    const bytes = new TextEncoder().encode(JSON.stringify(manifest.files));
    if (bytes.length > MAX_METADATA_BYTES) throw Error('File metadata is too large. Use shorter file names or fewer files.');
    const packets: FramePacket[] = [];
    for (let offset = 0; offset < bytes.length; offset += CHUNK)
        packets.push({ kind: 'metadata', part: offset / CHUNK, total: Math.ceil(bytes.length / CHUNK), data: btoa(String.fromCharCode(...bytes.slice(offset, offset + CHUNK))) });
    return packets;
}
export function decodeMetadata(id: string, pieces: Map<number, string>, total: number): Extract<Packet, { kind: 'manifest' }> {
    const bytes = Uint8Array.from(Array.from({ length: total }, (_, i) => pieces.get(i) || '').join(''), c => c.charCodeAt(0));
    const files = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const packet = decode(encode({ v: 1, id, kind: 'manifest', files }));
    if (packet.kind !== 'manifest') throw Error('Invalid metadata.');
    return packet;
}
