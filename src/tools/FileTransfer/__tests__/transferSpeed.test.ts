import { describe, expect, it } from 'vitest';
import { formatRemaining, formatSpeed, TransferSpeedTracker } from '../transferSpeed';
import { CHUNK, prepare } from '../protocol';
import { encodeFrame, metadataPackets, type TransferFrame } from '../framing';
import { ReceiverSession, SenderSession } from '../session';

describe('Transfer speed and ETA', () => {
    it('smooths unique file bytes over elapsed time and estimates remaining work', () => {
        const tracker = new TransferSpeedTracker();
        tracker.record(0, 0);
        for (let second = 1; second <= 5; second++) tracker.record(second * 100, second * 1000);
        const progress = tracker.snapshot(5000, 1000);
        expect(progress.bytesPerSecond).toBe(100);
        expect(progress.secondsRemaining).toBe(5);
        expect(progress.history.slice(-5)).toEqual([100, 100, 100, 100, 100]);
        expect(progress.status).toBe('active');
    });

    it('does not count duplicates and removes stale rates and ETA when progress stalls', () => {
        const tracker = new TransferSpeedTracker();
        tracker.record(0, 0);
        tracker.record(100, 1000);
        for (let n = 0; n < 100; n++) tracker.record(100, 2000);
        expect(tracker.snapshot(2000, 1000).bytesPerSecond).toBe(50);
        expect(tracker.snapshot(11000, 1000)).toMatchObject({ bytesPerSecond: 0, secondsRemaining: null, status: 'stalled' });
        expect(tracker.snapshot(40000, 1000).history.every(speed => speed === 0)).toBe(true);
        tracker.record(200, 41000);
        expect(tracker.snapshot(42000, 1000)).toMatchObject({ bytesPerSecond: 10, secondsRemaining: 80, status: 'active' });
    });

    it('waits for totals and sufficient observations, and handles empty and completed files', () => {
        const tracker = new TransferSpeedTracker();
        expect(tracker.snapshot(0, null)).toMatchObject({ status: 'waiting', secondsRemaining: null });
        expect(tracker.snapshot(0, 0)).toMatchObject({ status: 'complete', secondsRemaining: 0 });
        tracker.record(96, 1000);
        expect(tracker.snapshot(1000, 192).secondsRemaining).toBeNull();
        expect(tracker.snapshot(5000, null).secondsRemaining).toBeNull();
        expect(tracker.snapshot(5000, 192).secondsRemaining).toBe(4);
        tracker.record(192, 6000);
        expect(tracker.snapshot(6000, 192)).toMatchObject({ status: 'complete', secondsRemaining: 0 });
    });

    it('resets the estimate if metadata validation discards provisional bytes', () => {
        const tracker = new TransferSpeedTracker();
        tracker.record(500, 1000);
        tracker.record(96, 2000);
        expect(tracker.snapshot(2000, 1000)).toMatchObject({ bytes: 96, bytesPerSecond: 0, secondsRemaining: null });
        tracker.record(192, 3000);
        expect(tracker.snapshot(3000, 1000).bytesPerSecond).toBe(96);
    });

    it('keeps a 30-second sparkline across long idle gaps', () => {
        const tracker = new TransferSpeedTracker();
        for (let n = 0; n < 1000; n++) tracker.record(n * 96, n * 1000);
        const progress = tracker.snapshot(999000, null);
        expect(progress.history).toHaveLength(30);
        expect(progress.history.every(speed => speed === 96)).toBe(true);
        expect(progress.bytesPerSecond).toBe(96);
    });

    it('formats byte rates and approximate durations clearly', () => {
        expect(formatSpeed(96)).toBe('96 B/s');
        expect(formatSpeed(1536)).toBe('1.5 KiB/s');
        expect(formatSpeed(2 * 1024 * 1024)).toBe('2.0 MiB/s');
        expect(formatRemaining(0)).toBe('Complete.');
        expect(formatRemaining(3.2)).toBe('About 4 sec.');
        expect(formatRemaining(61)).toBe('About 2 min.');
        expect(formatRemaining(3700)).toBe('About 1 hr 2 min.');
    });
});

describe('Session byte accounting', () => {
    it('counts short final packets exactly and excludes repeated reads, metadata, and acknowledgements', async () => {
        const packets = await prepare([new File(['a'.repeat(CHUNK) + 'b'], 'test.txt')]);
        const sender = new SenderSession(packets);
        const receiver = new ReceiverSession();
        const data = packets.filter(p => p.kind === 'data');
        const frame = (sequence: number, packets: TransferFrame['packets']): TransferFrame => ({
            kind: 'transfer', id: sender.manifest.id, sequence, epoch: 0, profile: { packetsPerFrame: 2, intervalMs: 1000 }, packets,
        });
        const raw = encodeFrame(frame(0, data));
        receiver.read(raw, 0);
        receiver.read(raw, 1000);
        expect(receiver.progress(1000)).toMatchObject({ bytes: 97, total: null });
        receiver.read(encodeFrame(frame(1, metadataPackets(sender.manifest))), 2000);
        expect(receiver.progress(2000)).toMatchObject({ bytes: 97, total: 97, secondsRemaining: 0 });
        const feedback = encodeFrame(receiver.nextFrame(3000)!);
        sender.read(feedback, 3000);
        sender.read(feedback, 4000);
        expect(sender.progress(4000)).toMatchObject({ bytes: 97, total: 97, status: 'complete' });
    });

    it('does not invent a sending rate without receiver confirmations', async () => {
        const sender = new SenderSession(await prepare([new File(['some data'], 'test.txt')]));
        for (let n = 0; n < 20; n++) sender.nextFrame(n * 1000);
        expect(sender.progress(20000)).toMatchObject({ bytes: 0, bytesPerSecond: 0, secondsRemaining: null, status: 'waiting' });
    });
});
