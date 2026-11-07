import { describe, expect, it } from 'vitest';
import { deflateSync } from 'fflate';
import { encodeSignal, SignalAssembler, type Signal } from '../signaling';

const signal: Signal = { version: 1, session: '12345678-1234-1234-1234-123456789abc', type: 'offer', sdp: 'v=0\r\na=candidate:local.local 1 udp 123 192.168.1.1 1234 typ host\r\n' };
describe('QR signaling', () => {
    it('round trips complete SDP without altering candidates', async () => {
        const frames = await encodeSignal(signal);
        expect(frames.every(frame => frame.length <= 800)).toBe(true);
        expect(await new SignalAssembler().add(frames[0])).toEqual(signal);
    });
    it('reassembles reversed frames and deduplicates scans', async () => {
        const random = Array.from(crypto.getRandomValues(new Uint8Array(12000)), b => String.fromCharCode(33 + b % 90)).join('');
        const source = { ...signal, sdp: `v=0\r\n${random}` };
        const frames = await encodeSignal(source);
        expect(frames.length).toBeGreaterThan(1);
        const assembler = new SignalAssembler();
        expect(await assembler.add(frames[frames.length - 1])).toBeNull();
        expect(await assembler.add(frames[frames.length - 1])).toBeNull();
        expect(assembler.progress.received).toBe(1);
        let result;
        for (const frame of frames.slice(0, -1).reverse()) result = await assembler.add(frame);
        expect(result).toEqual(source);
    });
    it('rejects mixed sessions, malformed frames, oversized frames and unsupported versions', async () => {
        const random = Array.from(crypto.getRandomValues(new Uint8Array(4000)), b => b.toString(16)).join('');
        const frames = await encodeSignal({ ...signal, sdp: `v=0${random}` });
        const assembler = new SignalAssembler();
        await assembler.add(frames[0]);
        await expect(assembler.add(frames[1].replace(signal.session, 'aaaaaaaa-1234-1234-1234-123456789abc'))).rejects.toThrow('different sessions');
        for (const frame of ['hello', 'a'.repeat(801), frames[0].replace('TRT1', 'TRT2'), frames[0].replace(':0:', ':-1:')]) {
            await expect(new SignalAssembler().add(frame)).rejects.toThrow();
        }
        await expect(encodeSignal({ ...signal, version: 2 } as unknown as Signal)).rejects.toThrow();
    });
    it('detects modified compressed payloads', async () => {
        const [frame] = await encodeSignal(signal);
        const modified = frame.slice(0, -1) + (frame.endsWith('A') ? 'B' : 'A');
        await expect(new SignalAssembler().add(modified)).rejects.toThrow('checksum');
    });
    it('bounds decompression of hostile payloads', async () => {
        const raw = new TextEncoder().encode(JSON.stringify({ ...signal, sdp: `v=0${'x'.repeat(200000)}` }));
        const bytes = deflateSync(raw);
        const b64 = (value: Uint8Array) => btoa(Array.from(value, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const hash = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)));
        const payload = b64(bytes);
        expect(payload.length).toBeLessThan(640);
        await expect(new SignalAssembler().add(`TRT1:${signal.session}:offer:0:1:${hash}:${payload}`)).rejects.toThrow('size limit');
    });
});
