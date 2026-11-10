import { describe, expect, it } from 'vitest';
import { createReception, receive } from '../reception';
import { CHUNK, type Packet } from '../protocol';

const data: Packet = { v: 1, id: 'a', kind: 'data', file: 0, part: 0, data: btoa('a'.repeat(CHUNK)) };
const metadata: Packet = { v: 1, id: 'a', kind: 'manifest', files: [{ name: 'test.txt', size: CHUNK + 1, type: 'text/plain' }] };

describe('Reception before metadata', () => {
    it('collects unique parts before metadata and validates them when the file list arrives', () => {
        const state = createReception();
        expect(receive(state, data).outcome).toBe('progress');
        expect(receive(state, data).outcome).toBe('duplicate');
        expect(state.manifest).toBeNull();
        expect(state.pending.size).toBe(1);
        receive(state, { ...data, part: 9 });
        receive(state, metadata);
        expect(state.parts.size).toBe(1);
        expect(state.parts.get('0:0')).toBe('a'.repeat(CHUNK));
        expect(state.pending.size).toBe(0);
        expect(state.manifest?.files[0].name).toBe('test.txt');
        receive(state, { ...data, part: 1, data: btoa('b') });
        expect(state.parts.size).toBe(2);
    });

    it('keeps one transfer together and never treats confirmations as received data', () => {
        const state = createReception();
        expect(receive(state, { v: 1, id: 'other', kind: 'ack', keys: [] }).outcome).toBe('ignored');
        expect(state.id).toBeNull();
        receive(state, data);
        expect(receive(state, { ...metadata, id: 'other' }).outcome).toBe('ignored');
        expect(receive(state, { ...data, id: 'other' }).outcome).toBe('ignored');
        expect(state.pending.size).toBe(1);
        receive(state, metadata);
        expect(receive(state, metadata).outcome).toBe('duplicate');
    });

    it('ignores undecodable parts before they can interrupt later metadata reception', () => {
        const state = createReception();
        expect(receive(state, { ...data, data: 'a' }).outcome).toBe('ignored');
        expect(state.pending.size).toBe(0);
        expect(state.id).toBeNull();
        receive(state, data);
        receive(state, metadata);
        expect(state.parts.size).toBe(1);
    });
});
