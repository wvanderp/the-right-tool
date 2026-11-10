import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import { deflateSync } from 'fflate';
import { CHUNK, prepare } from '../protocol';
import { decodeFrame, encodeFrame, MAX_FRAME_BYTES, type TransferFrame } from '../framing';
import { ReceiverSession, SenderSession } from '../session';
import { runThroughputScenario, THROUGHPUT_SCENARIOS } from './throughputHarness';

describe('QR throughput budget', () => {
    it.each(THROUGHPUT_SCENARIOS)('$name completes and verifies a binary file above $minimum B/s', async (scenario) => {
        const result = await runThroughputScenario(scenario);
        expect(result.receivedBytes).toBe(scenario.size);
        expect(result.confirmedBytes).toBe(scenario.feedback ? scenario.size : 0);
        expect(result.reconstructed).not.toBeNull();
        expect(result.reconstructed).toEqual(result.original);
        expect(result.ignoredReads).toBe(0);
        expect(result.bytesPerSecond).toBeGreaterThanOrEqual(scenario.minimum);
        if (scenario.small) expect(result.qrAreaFraction).toBeLessThan(0.25);
    });

    it('also completes and verifies a conservative-profile transfer above 100 B/s', async () => {
        const result = await runThroughputScenario({ ...THROUGHPUT_SCENARIOS[0], conservative: true });
        expect(result.reconstructed).not.toBeNull();
        expect(result.reconstructed).toEqual(result.original);
        expect(result.bytesPerSecond).toBeGreaterThanOrEqual(100);
    });

    it('still completes above 300 B/s without feedback after a late data frame is lost', async () => {
        const result = await runThroughputScenario({ ...THROUGHPUT_SCENARIOS[1], dropAfterPart: 220 });
        expect(result.droppedFrames).toBe(1);
        expect(result.reconstructed).not.toBeNull();
        expect(result.reconstructed).toEqual(result.original);
        expect(result.confirmedBytes).toBe(0);
        expect(result.bytesPerSecond).toBeGreaterThanOrEqual(300);
    });

    it('sends metadata in a dedicated, lower-density frame rather than mixing in file data', async () => {
        const sender = new SenderSession(await prepare([new File([crypto.getRandomValues(new Uint8Array(4096))], 'binary.bin')]));
        const frame = sender.nextFrame(0);
        expect(frame.packets.length).toBeGreaterThan(0);
        expect(frame.packets.every(packet => packet.kind === 'metadata')).toBe(true);
        expect(QRCode.create(encodeFrame(frame), { errorCorrectionLevel: 'L' }).modules.size).toBeLessThanOrEqual(65);
    });

    it('compresses repetitive frames into a QR with fewer modules and exact reconstruction', () => {
        const frame: TransferFrame = { kind: 'transfer', id: 'compression-test', sequence: 0, epoch: 0,
            profile: { packetsPerFrame: 8, intervalMs: 350 },
            packets: Array.from({ length: 8 }, (_, part) => ({ kind: 'data', file: 0, part, data: btoa('x'.repeat(CHUNK)) })) };
        const raw = encodeFrame(frame);
        const plain = JSON.stringify([4, frame.id, 't', 0, 0, 8, 350, frame.packets.map(p => ['d', 0, p.part, p.data])]);
        expect(raw.length).toBeLessThan(plain.length / 2);
        expect(QRCode.create(raw, { errorCorrectionLevel: 'L' }).modules.size)
            .toBeLessThan(QRCode.create(plain, { errorCorrectionLevel: 'L' }).modules.size);
        expect(decodeFrame(raw)).toEqual(frame);
    });

    it('rejects compressed payloads exceeding the decompressed frame budget', () => {
        const compressed = deflateSync(new TextEncoder().encode(' '.repeat(MAX_FRAME_BYTES * 100)));
        expect(() => decodeFrame(`TRT4:${btoa(String.fromCharCode(...compressed))}`)).toThrow();
    });

    it('supports ten-packet frames at 250 ms within the QR payload budget', () => {
        const frame: TransferFrame = { kind: 'transfer', id: 'f'.repeat(64), sequence: 999999999, epoch: 999999999,
            profile: { packetsPerFrame: 10, intervalMs: 250 },
            packets: Array.from({ length: 10 }, (_, part) => ({ kind: 'data', file: 99, part: 1000000 + part,
                data: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(CHUNK)))) })) };
        const raw = encodeFrame(frame);
        expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(MAX_FRAME_BYTES);
        expect(decodeFrame(raw)).toEqual(frame);
    });

    it('automatically backs off an unreadable initial profile when the feedback camera is enabled', async () => {
        const sender = new SenderSession(await prepare([new File(['x'.repeat(1000)], 'file.txt')]));
        sender.expectFeedback(true, 0);
        sender.nextFrame(6001);
        expect(sender.profile).toEqual({ packetsPerFrame: 1, intervalMs: 800 });
    });

    it('keeps conservative mode pinned through feedback and preserves received parts when toggled', async () => {
        const sender = new SenderSession(await prepare([new File(['x'.repeat(10000)], 'file.txt')]));
        const receiver = new ReceiverSession();
        receiver.read(encodeFrame(sender.nextFrame(0)), 0);
        const collected = receiver.progress(0).bytes;
        sender.setConservative(true, 0);
        for (let now = 1000; now <= 12000; now += 1000) {
            receiver.read(encodeFrame(sender.nextFrame(now)), now);
            sender.read(encodeFrame(receiver.nextFrame(now)!), now);
        }
        expect(sender.profile).toEqual({ packetsPerFrame: 1, intervalMs: 800 });
        sender.setConservative(false, 12000);
        expect(sender.profile).toEqual({ packetsPerFrame: 8, intervalMs: 500 });
        expect(receiver.progress(12000).bytes).toBeGreaterThan(collected);
    });
});
