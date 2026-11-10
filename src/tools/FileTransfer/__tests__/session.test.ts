import { describe, expect, it } from 'vitest';
import { CHUNK, prepare } from '../protocol';
import { decodeFrame, encodeFrame, metadataPackets, MAX_FRAME_BYTES, type FeedbackFrame, type TransferFrame } from '../framing';
import { DEFAULT_PROFILE, negotiate, PROFILES, ReceiverMeasurements } from '../negotiation';
import { ReceiverSession, SenderSession } from '../session';

const observation = { qrModules: 49, codePixels: 490 };
const files = (parts = 40) => [new File(['x'.repeat(CHUNK * parts - 1)], 'example.txt', { type: 'text/plain' })];
function deliver(sender: SenderSession, receiver: ReceiverSession, now: number, feedback = true) {
    const frame = sender.nextFrame(now);
    receiver.read(encodeFrame(frame), now, observation);
    const reply = receiver.nextFrame(now);
    if (feedback && reply) sender.read(encodeFrame(reply), now);
    return frame;
}

describe('QR frame protocol', () => {
    it('keeps fixed-size file packets and combines several into one bounded QR frame', async () => {
        const packets = await prepare(files());
        const data = packets.filter(p => p.kind === 'data');
        expect(atob(data[0].data).length).toBe(CHUNK);
        const frame: TransferFrame = { kind: 'transfer', id: data[0].id, sequence: 1, epoch: 1,
            profile: PROFILES[5], packets: data.slice(0, 8).map(p => ({ kind: 'data', file: p.file, part: p.part, data: p.data })) };
        const encoded = encodeFrame(frame);
        expect(new TextEncoder().encode(encoded).length).toBeLessThan(MAX_FRAME_BYTES);
        expect(decodeFrame(encoded)).toEqual(frame);
        const receiver = new ReceiverSession();
        receiver.read(encoded, 0, observation);
        expect(receiver.reception.pending.size).toBe(8);
    });

    it('fragments long Unicode metadata into standard packets and reassembles out of order', async () => {
        const fileList = Array.from({ length: 100 }, (_, i) => new File([], `日本語-${i}-${'a'.repeat(40)}.txt`));
        const sender = new SenderSession(await prepare(fileList));
        const receiver = new ReceiverSession();
        const pieces = metadataPackets(sender.manifest);
        expect(pieces.length).toBeGreaterThan(8);
        for (const [sequence, packet] of [...pieces].reverse().entries()) {
            const frame: TransferFrame = { kind: 'transfer', id: sender.manifest.id, sequence, epoch: 0, profile: PROFILES[0], packets: [packet] };
            expect(encodeFrame(frame).length).toBeLessThan(MAX_FRAME_BYTES);
            receiver.read(encodeFrame(frame), sequence * 1000);
        }
        expect(receiver.reception.manifest?.files).toEqual(sender.manifest.files);
    });

    it('rejects malformed, oversized, incompatible, and unbounded QR frames', () => {
        const valid = [4, 'a', 't', 1, 0, 1, 1000, [['d', 0, 0, btoa('x')]]];
        expect(() => decodeFrame(JSON.stringify(valid))).not.toThrow();
        for (const invalid of [
            [2, 'a', 't', 1, 0, 1, 1000, []],
            [3, 'a', 't', 1, 0, 1, 1000, [['d', 0, 0, btoa('x')]]],
            [4, 'a', 't', -1, 0, 1, 1000, []],
            [4, 'a', 't', 1, 0, 100, 1000, []],
            [4, 'a', 't', 1, 0, 1, 1, [['d', 0, 0, btoa('x')]]],
            [4, 'a', 't', 1, 0, 1, 1000, [['d', 0, 0, 'a']]],
            [4, 'a', 't', 1, 0, 1, 1000, [['m', 2, 2, btoa('x')]]],
            [4, 'a', 'f', 1, ['bad-key'], 8, 350, null],
            [4, 'a', 'f', 1, [], 8, 350, [0, 3, 4, 1, 3000, 0, 1, 1000, 100, 49, 490, 'data']],
        ]) expect(() => decodeFrame(JSON.stringify(invalid))).toThrow();
        expect(() => decodeFrame('x'.repeat(MAX_FRAME_BYTES + 1))).toThrow();
    });
});

describe('React-free transfer sessions', () => {
    it('reconstructs multiple binary and empty files without confusing packet indices', async () => {
        const bytes = Uint8Array.from({ length: 1000 }, (_, i) => i % 256);
        const sender = new SenderSession(await prepare([
            new File([bytes], 'binary.dat'), new File([], 'empty.txt'), new File([bytes.slice(0, 100)], '短い.dat'),
        ]));
        const receiver = new ReceiverSession();
        for (let n = 0; n < 80; n++) deliver(sender, receiver, n * 1000);
        expect(new Uint8Array(await receiver.download(0).arrayBuffer())).toEqual(bytes);
        expect(receiver.download(1).size).toBe(0);
        expect(new Uint8Array(await receiver.download(2).arrayBuffer())).toEqual(bytes.slice(0, 100));
        expect(sender.confirmedParts).toBe(13);
    });

    it('completes one-way transfers at the faster starting profile without any feedback', async () => {
        const sender = new SenderSession(await prepare(files()));
        const receiver = new ReceiverSession();
        for (let n = 0; n < 100; n++) deliver(sender, receiver, n * 1000, false);
        expect(sender.profile).toEqual(PROFILES[DEFAULT_PROFILE]);
        expect(sender.confirmedParts).toBe(0);
        expect(await receiver.download(0).text()).toBe('x'.repeat(CHUNK * 40 - 1));
    });

    it('negotiates larger and faster QR frames and preserves exact file bytes', async () => {
        const sender = new SenderSession(await prepare(files(400)));
        const receiver = new ReceiverSession();
        let now = 0;
        const maximums = { packets: 1, speed: 1000 };
        for (let n = 0; n < 200; n++) {
            const frame = deliver(sender, receiver, now);
            maximums.packets = Math.max(maximums.packets, frame.packets.length);
            maximums.speed = Math.min(maximums.speed, frame.profile.intervalMs);
            now += sender.profile.intervalMs;
        }
        expect(maximums).toEqual({ packets: 10, speed: 250 });
        expect(sender.confirmedParts).toBe(400);
        expect(await receiver.download(0).text()).toBe('x'.repeat(CHUNK * 400 - 1));
        const frame = sender.nextFrame(now);
        expect(frame.packets.every(p => p.kind !== 'data')).toBe(true);
    });

    it('recovers from dropped, duplicated, and out-of-order QR frames and feedback', async () => {
        const sender = new SenderSession(await prepare(files(60)));
        const receiver = new ReceiverSession();
        const frames: TransferFrame[] = [];
        for (let n = 0; n < 90; n++) frames.push(sender.nextFrame(n * 1000));
        for (const frame of frames.filter((_, i) => i % 5 !== 0).reverse()) {
            receiver.read(encodeFrame(frame), 90000);
            receiver.read(encodeFrame(frame), 90001);
        }
        for (let n = 0; n < 160; n++) deliver(sender, receiver, 100000 + n * 1000);
        expect(await receiver.download(0).text()).toBe('x'.repeat(CHUNK * 60 - 1));
        expect(sender.confirmedParts).toBe(60);
    });

    it('does not let unknown acknowledgements or another transfer alter sender state', async () => {
        const sender = new SenderSession(await prepare(files()));
        const frame: FeedbackFrame = { kind: 'feedback', id: 'other', sequence: 0, keys: ['0:0'], maxPackets: 8, minIntervalMs: 350, report: null };
        expect(sender.read(encodeFrame(frame), 0).outcome).toBe('ignored');
        sender.read(encodeFrame({ ...frame, id: sender.manifest.id, keys: ['99:9999', 'm:999'] }), 0);
        expect(sender.confirmed.size).toBe(0);
        expect(sender.profile).toEqual(PROFILES[DEFAULT_PROFILE]);
    });

    it('falls back to small, slow frames when fresh feedback disappears', async () => {
        const sender = new SenderSession(await prepare(files(400)));
        const receiver = new ReceiverSession();
        for (let n = 0; n < 10; n++) deliver(sender, receiver, n * 1000);
        expect(sender.profile.packetsPerFrame).toBeGreaterThan(1);
        const stale = receiver.nextFrame(9000)!;
        for (let n = 10; n < 30; n++) {
            sender.read(encodeFrame(stale), n * 1000);
            sender.nextFrame(n * 1000);
        }
        expect(sender.profile).toEqual(PROFILES[0]);
        expect(sender.negotiated).toBe(false);
    });

    it('reduces capacity when frame losses rise despite continued feedback', async () => {
        const sender = new SenderSession(await prepare(files(400)));
        const receiver = new ReceiverSession();
        let now = 0;
        for (let n = 0; n < 4; n++) {
            const frame = deliver(sender, receiver, now);
            now += frame.profile.intervalMs;
        }
        const startingProfile = sender.profile;
        for (let n = 4; n < 24; n++) {
            const frame = sender.nextFrame(now);
            if (n % 3 === 1) receiver.read(encodeFrame(frame), now, observation);
            sender.read(encodeFrame(receiver.nextFrame(now)!), now);
            now += frame.profile.intervalMs;
        }
        expect(sender.profile.packetsPerFrame).toBeLessThan(startingProfile.packetsPerFrame);
    });

    it('honors receiver limits and ignores stale epochs even in newly numbered feedback', async () => {
        const sender = new SenderSession(await prepare(files(400)));
        const receiver = new ReceiverSession();
        for (let n = 0; n < 10; n++) {
            receiver.read(encodeFrame(sender.nextFrame(n * 1000)), n * 1000, observation);
            sender.read(encodeFrame({ ...receiver.nextFrame(n * 1000)!, maxPackets: 1 }), n * 1000);
        }
        expect(sender.profile).toEqual(PROFILES[0]);
        receiver.read(encodeFrame(sender.nextFrame(10000)), 10000, observation);
        const old = receiver.nextFrame(10000)!;
        sender.read(encodeFrame(old), 10000);
        expect(sender.profile).toEqual(PROFILES[1]);
        sender.read(encodeFrame({ ...old, sequence: old.sequence + 1 }), 12000);
        expect(sender.profile).toEqual(PROFILES[1]);
    });

    it('retains parts before fragmented metadata, and starts feedback before knowing totals', async () => {
        const sender = new SenderSession(await prepare(files(2)));
        const receiver = new ReceiverSession();
        receiver.read(encodeFrame({ kind: 'transfer', id: sender.manifest.id, sequence: 0, epoch: 0, profile: PROFILES[0], packets: [sender.data[0]] }), 0);
        expect(receiver.reception.manifest).toBeNull();
        expect(receiver.reception.pending.size).toBe(1);
        expect(receiver.nextFrame(0)?.keys).toEqual([]);
        for (let n = 0; n < 20; n++) deliver(sender, receiver, (n + 1) * 1000);
        expect(await receiver.download(0).text()).toBe('x'.repeat(CHUNK * 2 - 1));
    });
});

describe('Receiver measurements', () => {
    it('counts distinct QR frames rather than repeated reads and measures loss, density, and rate', () => {
        const measurements = new ReceiverMeasurements();
        const frame: TransferFrame = { kind: 'transfer', id: 'a', sequence: 0, epoch: 0, profile: PROFILES[0], packets: [{ kind: 'data', file: 0, part: 0, data: btoa('x') }] };
        measurements.observe(frame, 0, observation);
        measurements.observe(frame, 100, observation);
        measurements.observe({ ...frame, sequence: 2 }, 2000, observation);
        const report = measurements.report(2500)!;
        expect(report).toMatchObject({ frames: 2, sequenceSpan: 3, elapsedMs: 2000, ageMs: 500, qrModules: 49, codePixels: 490, frameKind: 'data', packetsPerFrame: 1, intervalMs: 800 });
        expect(report.encodedBytes).toBeGreaterThan(0);
        measurements.observe({ ...frame, sequence: 3, epoch: 1, profile: PROFILES[1] }, 3000, observation);
        measurements.observe(frame, 4000, observation);
        expect(measurements.report(4000)).toMatchObject({ epoch: 1, frames: 1, sequenceSpan: 1 });
    });

    it('requires enough fresh evidence, respects camera density, and changes one setting at a time', () => {
        const report = { ...PROFILES[0], ...observation, epoch: 0, lastSequence: 3, frames: 4, sequenceSpan: 4,
            elapsedMs: 3000, ageMs: 0, encodedBytes: 200, frameKind: 'data' as const };
        expect(negotiate(0, report)).toBe(1);
        expect(negotiate(0, { ...report, frames: 1, elapsedMs: 0 })).toBe(0);
        expect(negotiate(0, { ...report, ageMs: 4000 })).toBe(0);
        expect(negotiate(0, { ...report, codePixels: 98 })).toBe(0);
        expect(negotiate(0, report, 1)).toBe(0);
        expect(negotiate(1, { ...report, ...PROFILES[1] }, 8, 1000)).toBe(1);
        expect(negotiate(3, { ...report, ...PROFILES[3], frames: 2, sequenceSpan: 8 })).toBe(2);
    });
});
