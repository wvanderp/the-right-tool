import { MAX_PACKETS, MIN_INTERVAL, frameBytes, encodeFrame, type Observation, type Profile, type Report, type TransferFrame } from './framing.ts';

export const PROFILES: readonly Profile[] = [
    { packetsPerFrame: 1, intervalMs: 1000 },
    { packetsPerFrame: 2, intervalMs: 1000 },
    { packetsPerFrame: 2, intervalMs: 750 },
    { packetsPerFrame: 4, intervalMs: 750 },
    { packetsPerFrame: 4, intervalMs: 500 },
    { packetsPerFrame: 8, intervalMs: 500 },
    { packetsPerFrame: 8, intervalMs: 350 },
];
export const FEEDBACK_TIMEOUT = 6000;

export class ReceiverMeasurements {
    private samples = new Map<number, number>();
    private latest: { frame: TransferFrame; at: number; observation: Observation } | null = null;

    observe(frame: TransferFrame, now: number, observation: Observation) {
        if (this.latest && frame.epoch < this.latest.frame.epoch) return;
        if (!this.latest || frame.epoch !== this.latest.frame.epoch) this.samples.clear();
        if (this.samples.has(frame.sequence)) return;
        if (this.latest && frame.epoch === this.latest.frame.epoch && frame.sequence <= this.latest.frame.sequence - 32) return;
        this.samples.set(frame.sequence, now);
        if (this.samples.size > 32) this.samples.delete(Math.min(...this.samples.keys()));
        if (!this.latest || frame.epoch !== this.latest.frame.epoch || frame.sequence > this.latest.frame.sequence)
            this.latest = { frame, at: now, observation };
    }

    report(now: number): Report | null {
        if (!this.latest) return null;
        const { frame, at, observation } = this.latest;
        const sequences = [...this.samples.keys()];
        const times = [...this.samples.values()];
        const kinds = new Set(frame.packets.map(p => p.kind));
        return {
            ...frame.profile, ...observation, epoch: frame.epoch, lastSequence: Math.max(...sequences),
            frames: sequences.length, sequenceSpan: Math.max(...sequences) - Math.min(...sequences) + 1,
            elapsedMs: Math.max(...times) - Math.min(...times), ageMs: Math.max(0, now - at),
            encodedBytes: frameBytes(encodeFrame(frame)), frameKind: kinds.size > 1 ? 'mixed' : frame.packets[0].kind,
        };
    }
}

// Evaluate one epoch's evidence. The sender rejects stale reports and applies
// each change in a new epoch, so replaying feedback cannot keep raising speed.
export function negotiate(current: number, report: Report, maxPackets = MAX_PACKETS, minIntervalMs = MIN_INTERVAL) {
    if (report.ageMs > 3000 || report.elapsedMs < 2000 || report.sequenceSpan < 4) return current;
    const reliability = report.frames / report.sequenceSpan;
    const rate = (report.frames - 1) * 1000 / Math.max(1, report.elapsedMs);
    const expectedRate = 1000 / PROFILES[current].intervalMs;
    if (reliability < 0.65 || rate < expectedRate * 0.6) return Math.max(0, current - 1);
    const next = PROFILES[current + 1];
    if (!next || report.frames < 4 || reliability < 0.85 || rate < expectedRate * 0.8) return current;
    if (next.packetsPerFrame > maxPackets || next.intervalMs < minIntervalMs) return current;
    if (next.packetsPerFrame > PROFILES[current].packetsPerFrame && report.qrModules > 0 && report.codePixels > 0 && report.codePixels / report.qrModules < 3) return current;
    return current + 1;
}
