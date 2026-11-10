import { assemble, key, type Manifest, type Packet } from './protocol.ts';
import { createReception, receive } from './reception.ts';
import { decodeFrame, decodeMetadata, encodeFrame, metadataPackets, packetKey, MAX_PACKETS, MIN_INTERVAL,
    type FeedbackFrame, type FramePacket, type Observation, type TransferFrame } from './framing.ts';
import { FEEDBACK_TIMEOUT, negotiate, PROFILES, ReceiverMeasurements } from './negotiation.ts';

export type ReadResult = { outcome: 'progress' | 'duplicate' | 'ignored'; message: string };
const unsupported: ReadResult = { outcome: 'ignored', message: 'Unsupported transfer QR code. Refresh both devices if this is a transfer code.' };

export class SenderSession {
    readonly manifest: Manifest;
    readonly data: Extract<Packet, { kind: 'data' }>[];
    readonly confirmed = new Set<string>();
    private readonly metadata: FramePacket[];
    private readonly validKeys: Set<string>;
    private profileIndex = 0;
    private epoch = 0;
    private sequence = 0;
    private dataCursor = 0;
    private metadataCursor = 0;
    private lastFeedbackSequence = -1;
    private lastEvidenceSequence = -1;
    private lastEvidenceAt = 0;
    private changedAt = 0;
    private confirmedDataCount = 0;
    negotiated = false;

    constructor(packets: Packet[]) {
        const manifest = packets[0];
        if (manifest?.kind !== 'manifest') throw Error('A file manifest is required.');
        this.manifest = { id: manifest.id, files: manifest.files };
        this.data = packets.filter((p): p is Extract<Packet, { kind: 'data' }> => p.kind === 'data');
        this.metadata = metadataPackets(this.manifest);
        this.validKeys = new Set([...this.metadata.map(packetKey), ...this.data.map(key)]);
    }

    get profile() { return PROFILES[this.profileIndex]; }
    get confirmedParts() {
        return this.confirmedDataCount;
    }

    private changeProfile(index: number, now: number) {
        if (index === this.profileIndex) return;
        this.profileIndex = index;
        this.epoch++;
        this.changedAt = now;
        this.lastEvidenceAt = now;
        this.lastEvidenceSequence = -1;
    }

    nextFrame(now: number): TransferFrame {
        if (now - this.lastEvidenceAt > FEEDBACK_TIMEOUT) {
            this.changeProfile(0, now);
            this.negotiated = false;
        }
        const packets: FramePacket[] = [];
        // Revisit metadata every fourth frame even for very large transfers.
        // Packet identifiers never change when QR capacity or timing changes.
        if (this.sequence % 4 === 0 || this.confirmedParts === this.data.length) {
            for (let tried = 0; tried < this.metadata.length && packets.length < this.profile.packetsPerFrame; tried++) {
                const p = this.metadata[this.metadataCursor++ % this.metadata.length];
                if (!this.confirmed.has(packetKey(p))) packets.push(p);
            }
        }
        for (let tried = 0; this.confirmedParts < this.data.length && tried < this.data.length && packets.length < this.profile.packetsPerFrame; tried++) {
            const p = this.data[this.dataCursor++ % this.data.length];
            if (!this.confirmed.has(key(p))) packets.push({ kind: 'data', file: p.file, part: p.part, data: p.data });
        }
        if (!packets.length) packets.push(this.metadata[0]);
        return { kind: 'transfer', id: this.manifest.id, sequence: this.sequence++, epoch: this.epoch, profile: { ...this.profile }, packets };
    }

    read(raw: string, now: number): ReadResult {
        try {
            const frame = decodeFrame(raw);
            if (frame.kind !== 'feedback' || frame.id !== this.manifest.id)
                return { outcome: 'ignored', message: 'Read a QR code, but it is not feedback for this transfer.' };
            const before = this.confirmed.size;
            for (const k of frame.keys) {
                if (!this.validKeys.has(k) || this.confirmed.has(k)) continue;
                this.confirmed.add(k);
                if (!k.startsWith('m:')) this.confirmedDataCount++;
            }
            if (frame.sequence > this.lastFeedbackSequence) {
                this.lastFeedbackSequence = frame.sequence;
                const report = frame.report;
                if (report && report.epoch === this.epoch && report.packetsPerFrame === this.profile.packetsPerFrame
                    && report.intervalMs === this.profile.intervalMs && report.ageMs <= 3000 && report.lastSequence < this.sequence
                    && report.lastSequence > this.lastEvidenceSequence) {
                    this.lastEvidenceSequence = report.lastSequence;
                    this.lastEvidenceAt = now;
                    this.negotiated = true;
                    if (now - this.changedAt >= 2000) this.changeProfile(negotiate(this.profileIndex, report, frame.maxPackets, frame.minIntervalMs), now);
                }
            }
            const added = this.confirmed.size - before;
            return { outcome: added ? 'progress' : 'duplicate', message: added ? `Confirmed ${added} packets. Receiver measurements updated.` : 'Read receiver feedback. Waiting for new confirmations or measurements.' };
        }
        catch { return unsupported; }
    }
}

export class ReceiverSession {
    readonly reception = createReception();
    readonly measurements = new ReceiverMeasurements();
    private metadata = new Map<number, string>();
    private metadataTotal = 0;
    private feedbackSequence = 0;
    private ackCursor = 0;
    private metadataReady = false;

    read(raw: string, now: number, observation: Observation = { qrModules: 0, codePixels: 0 }): ReadResult {
        try {
            const frame = decodeFrame(raw);
            if (frame.kind !== 'transfer') return { outcome: 'ignored', message: 'Read a feedback code. Point the camera at the sender.' };
            if (this.reception.id && this.reception.id !== frame.id)
                return { outcome: 'ignored', message: 'Read a code for another transfer. Start over to receive it.' };
            this.reception.id = frame.id;
            let progress = false;
            let message = 'Read packets already received. The camera is working.';
            for (const p of frame.packets) {
                if (p.kind === 'metadata') {
                    if (this.metadataTotal && this.metadataTotal !== p.total) continue;
                    this.metadataTotal = p.total;
                    if (!this.metadata.has(p.part)) {
                        this.metadata.set(p.part, atob(p.data));
                        progress = true;
                        message = 'Collecting file metadata. File parts are saved while the list is assembled.';
                    }
                    if (!this.metadataReady && this.metadata.size === p.total) {
                        try {
                            const manifest = decodeMetadata(frame.id, this.metadata, p.total);
                            receive(this.reception, manifest);
                            this.metadataReady = true;
                            message = `File list received: ${manifest.files.length} files. Collecting file parts.`;
                        }
                        catch {
                            this.metadata.clear();
                            this.metadataTotal = 0;
                            return { outcome: 'ignored', message: 'Invalid file metadata. Waiting for it to repeat.' };
                        }
                    }
                }
                else {
                    const result = receive(this.reception, { v: 1, id: frame.id, ...p });
                    if (result.outcome === 'progress') {
                        progress = true;
                        message = result.message;
                    }
                }
            }
            this.measurements.observe(frame, now, observation);
            return { outcome: progress ? 'progress' : 'duplicate', message };
        }
        catch { return unsupported; }
    }

    nextFrame(now: number): FeedbackFrame | null {
        if (!this.reception.id) return null;
        const keys = [...this.reception.parts.keys()];
        if (this.metadataReady) for (let part = 0; part < this.metadataTotal; part++) keys.push(`m:${part}`);
        if (this.ackCursor >= keys.length) this.ackCursor = 0;
        const batch = keys.slice(this.ackCursor, this.ackCursor + 16);
        this.ackCursor += batch.length;
        return { kind: 'feedback', id: this.reception.id, sequence: this.feedbackSequence++, keys: batch,
            maxPackets: MAX_PACKETS, minIntervalMs: MIN_INTERVAL, report: this.measurements.report(now) };
    }

    download(index: number) {
        const manifest = this.reception.manifest;
        if (!manifest) throw Error('File metadata is not available.');
        return assemble(manifest.files[index], index, this.reception.parts);
    }
}

export function sessionFrame(session: SenderSession | ReceiverSession, now: number) {
    const frame = session.nextFrame(now);
    return frame ? encodeFrame(frame) : null;
}
