export const CHUNK = 96;
export type Manifest = {
    id: string;
    files: {
        name: string;
        size: number;
        type: string;
    }[];
};
export type Packet = {
    v: 1;
    id: string;
    kind: 'manifest';
    files: Manifest['files'];
} | {
    v: 1;
    id: string;
    kind: 'data';
    file: number;
    part: number;
    data: string;
} | {
    v: 1;
    id: string;
    kind: 'ack';
    keys: string[];
};
export const ACK_BATCH = 8;
export function encode(packet: Packet) {
    return JSON.stringify(packet.kind === 'data' ? [2, packet.id, 'd', packet.file, packet.part, packet.data] : packet.kind === 'ack' ? [2, packet.id, 'a', packet.keys] : [2, packet.id, 'm', packet.files]);
}
export function decode(raw: string): Packet {
    const wire = JSON.parse(raw);
    if (!Array.isArray(wire) || wire[0] !== 2)
        throw Error('Unsupported QR code. Refresh both devices.');
    const p = { v: 1, id: wire[1], kind: wire[2] === 'd' ? 'data' : wire[2] === 'a' ? 'ack' : wire[2] === 'm' ? 'manifest' : '', files: wire[3], keys: wire[3], file: wire[3], part: wire[4], data: wire[5] };
    if (p.v !== 1 || typeof p.id !== 'string')
        throw Error('Unsupported QR code.');
    if (p.kind === 'manifest' && Array.isArray(p.files) && p.files.length <= 100 && p.files.every((f: Manifest['files'][number]) => typeof f.name === 'string' && typeof f.type === 'string' && Number.isSafeInteger(f.size) && f.size >= 0) && p.files.reduce((n: number, f: Manifest['files'][number]) => n + f.size, 0) <= 100 * 1024 * 1024)
        return p as Packet;
    if (p.kind === 'data' && Number.isSafeInteger(p.file) && p.file >= 0 && Number.isSafeInteger(p.part) && p.part >= 0 && typeof p.data === 'string' && p.data.length <= 128 && /^[A-Za-z0-9+/]*={0,2}$/.test(p.data))
        return p as Packet;
    if (p.kind === 'ack' && Array.isArray(p.keys) && p.keys.length <= ACK_BATCH && p.keys.every((k: unknown) => typeof k === 'string' && /^\d+:\d+$/.test(k)))
        return p as Packet;
    throw Error('Invalid transfer QR code.');
}
export function key(p: {
    file: number;
    part: number;
}) { return `${p.file}:${p.part}`; }
export async function prepare(files: File[]): Promise<Packet[]> {
    const id = crypto.randomUUID();
    const packets: Packet[] = [{ v: 1, id, kind: 'manifest', files: files.map(f => ({ name: f.name, size: f.size, type: f.type })) }];
    for (let file = 0; file < files.length; file++) {
        const bytes = new Uint8Array(await files[file].arrayBuffer());
        for (let offset = 0; offset < bytes.length; offset += CHUNK)
            packets.push({ v: 1, id, kind: 'data', file, part: offset / CHUNK, data: btoa(String.fromCharCode(...bytes.slice(offset, offset + CHUNK))) });
    }
    return packets;
}
export function accept(manifest: Manifest, parts: Map<string, string>, p: Packet) {
    if (p.kind !== 'data' || p.id !== manifest.id)
        return;
    const f = manifest.files[p.file];
    if (!f || p.part >= Math.ceil(f.size / CHUNK))
        return;
    const bytes = atob(p.data);
    if (bytes.length !== Math.min(CHUNK, f.size - p.part * CHUNK))
        return;
    parts.set(key(p), bytes);
}
export function complete(f: Manifest['files'][number], index: number, parts: Map<string, string>) {
    return Array.from({ length: Math.ceil(f.size / CHUNK) }, (_, part) => parts.has(`${index}:${part}`)).every(Boolean);
}
export function assemble(f: Manifest['files'][number], index: number, parts: Map<string, string>) {
    if (!complete(f, index, parts))
        throw Error('File is incomplete.');
    return new Blob(Array.from({ length: Math.ceil(f.size / CHUNK) }, (_, part) => Uint8Array.from(parts.get(`${index}:${part}`)!, c => c.charCodeAt(0))), { type: f.type });
}
