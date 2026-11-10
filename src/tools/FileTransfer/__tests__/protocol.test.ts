import { describe, expect, it } from 'vitest';
import { accept, assemble, CHUNK, complete, decode, encode, type Manifest, type Packet } from '../protocol';
describe('QR transfer', () => {
    it('reassembles out-of-order parts and ignores duplicates and other sessions', async () => {
        const m: Manifest = { id: 'a', files: [{ name: 'x', size: CHUNK + 1, type: '' }] };
        const parts = new Map<string, string>();
        const first: Packet = { v: 1, id: 'a', kind: 'data', file: 0, part: 0, data: btoa('a'.repeat(CHUNK)) };
        accept(m, parts, { ...first, part: 1, data: btoa('b') });
        expect(complete(m.files[0], 0, parts)).toBe(false);
        accept(m, parts, { ...first, id: 'other' });
        expect(parts.size).toBe(1);
        accept(m, parts, first);
        accept(m, parts, first);
        expect(parts.size).toBe(2);
        expect(await assemble(m.files[0], 0, parts).text()).toBe('a'.repeat(CHUNK) + 'b');
    });
    it('rejects malformed metadata and handles empty files', () => {
        expect(() => decode('{"v":1,"id":"x","kind":"manifest","files":[{"name":"x","type":"","size":-1}]}')).toThrow();
        expect(complete({ name: 'empty', type: '', size: 0 }, 0, new Map())).toBe(true);
    });
});
it('keeps data QR payloads small and round-trips compact packets', () => {
    expect(CHUNK).toBeLessThanOrEqual(96);
    const packet: Packet = { v: 1, id: 'session', kind: 'data', file: 0, part: 0, data: btoa('a'.repeat(CHUNK)) };
    expect(encode(packet).length).toBeLessThan(180);
    expect(decode(encode(packet))).toMatchObject(packet);
});
