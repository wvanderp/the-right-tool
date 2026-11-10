import type { Signal } from './signaling';
import type { FileInfo, Sink } from './storage';

export const WINDOW_BYTES = 1024 * 1024;
const HEADER = 12;
export type FileStatus = 'Waiting' | 'Receiving' | 'Sending' | 'Complete' | 'Skipped';
export interface TransferFile extends FileInfo { bytes: number; status: FileStatus }
export interface TransferEvents {
    status(message: string): void;
    files(files: TransferFile[]): void;
    ready(file: FileInfo | null): void;
    download(file: FileInfo, blob: Blob): void;
    error(message: string): void;
    connected(): void;
}
export function encodeChunk(id: number, offset: number, bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(HEADER + bytes.length);
    const view = new DataView(buffer);
    view.setUint32(0, id);
    view.setFloat64(4, offset);
    new Uint8Array(buffer, HEADER).set(bytes);
    return buffer;
}
export function decodeChunk(buffer: ArrayBuffer): { id: number; offset: number; bytes: Uint8Array } {
    if (buffer.byteLength <= HEADER || buffer.byteLength > 16384) throw new Error('Invalid file chunk size.');
    const view = new DataView(buffer);
    const offset = view.getFloat64(4);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid file offset.');
    return { id: view.getUint32(0), offset, bytes: new Uint8Array(buffer, HEADER) };
}
export function validateFile(value: unknown, expected: number): FileInfo {
    const f = value as Partial<FileInfo> | null;
    if (!f || f.id !== expected || typeof f.name !== 'string' || !f.name.length || f.name.length > 1024 ||
        typeof f.size !== 'number' || !Number.isSafeInteger(f.size) || f.size < 0) throw new Error('Invalid file manifest.');
    return f as FileInfo;
}
export function validateAck(bytes: number, previous: number, sent: number): void {
    if (!Number.isSafeInteger(bytes) || bytes < previous || bytes > sent) throw new Error('Invalid write acknowledgment.');
}
function message(error: unknown): string { return error instanceof Error ? error.message : 'The connection failed.'; }

export class TransferConnection {
    readonly pc: RTCPeerConnection;
    private channel: RTCDataChannel | null = null;
    private stopped = false;
    private items: TransferFile[] = [];
    private index = 0;
    private manifestReady = false;
    private sink: Sink | null = null;
    private received = 0;
    private pending: Uint8Array[] = [];
    private pendingBytes = 0;
    private sent = 0;
    private acknowledged = 0;
    private sending = false;
    private receiveChain = Promise.resolve();
    private timer: ReturnType<typeof setTimeout> | undefined;
    private abortGather: (() => void) | undefined;
    private lastProgress = 0;
    private opened = false;
    constructor(readonly session: string, private sources: File[] | null, private events: TransferEvents) {
        this.pc = new RTCPeerConnection({ iceServers: [] });
        if (sources) this.items = sources.map((file, id) => ({ id, name: file.name, size: file.size, bytes: 0, status: 'Waiting' }));
        this.pc.onconnectionstatechange = () => {
            if (this.stopped) return;
            if (this.pc.connectionState === 'failed') {
                // Firefox can exhaust its initial checks before a manually exchanged
                // answer reaches the sender. Keep the receiver and its QR alive:
                // incoming checks can still recover this same ICE session.
                if (!this.sources && !this.opened) this.events.status('Waiting for the sender to scan the reply. Keep this page open.');
                else this.fail(new Error('Could not connect directly. Check guest Wi-Fi isolation, VPNs, and local network permissions. Start a new session to retry.'));
            }
            if (this.pc.connectionState === 'disconnected') this.fail(new Error('Connection interrupted. Keep both devices awake and start a new session.'));
        };
        this.pc.ondatachannel = event => {
            if (this.channel) { event.channel.close(); this.fail(new Error('Unexpected additional data channel.')); return; }
            this.attach(event.channel);
        };
    }
    private notify(force = false) {
        if (!force && performance.now() - this.lastProgress < 100) return;
        this.lastProgress = performance.now();
        this.events.files(this.items.map(item => ({ ...item })));
    }
    private fail(error: unknown) {
        if (this.stopped) return;
        this.events.error(message(error));
        this.close();
    }
    close() {
        if (this.stopped) return;
        this.stopped = true;
        this.pending = [];
        this.pendingBytes = 0;
        clearTimeout(this.timer);
        this.abortGather?.();
        const sink = this.sink;
        this.sink = null;
        void sink?.abort().catch(() => {});
        this.channel?.close();
        this.pc.close();
    }
    private armConnectionTimeout() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.fail(new Error('Direct connection timed out. Use the same local network and start a new session.')), 30000);
    }
    private attach(channel: RTCDataChannel) {
        this.channel = channel;
        channel.binaryType = 'arraybuffer';
        channel.bufferedAmountLowThreshold = 256 * 1024;
        channel.onopen = () => {
            this.opened = true;
            clearTimeout(this.timer);
            this.events.connected();
            this.events.status('Connected. Review and save files on the receiving device.');
            this.notify(true);
            if (this.sources) void this.publishManifest().catch(error => this.fail(error));
        };
        channel.onmessage = event => {
            this.receiveChain = this.receiveChain.then(async () => {
                if (!this.stopped) await this.receive(event.data);
            }).catch(error => this.fail(error));
        };
        channel.onerror = () => this.fail(new Error('The data channel failed. Start a new session.'));
        channel.onclose = () => {
            if (this.items.length && this.index === this.items.length) {
                this.events.status('Session closed. Completed files remain saved.');
                this.close();
            } else this.fail(new Error('The other device disconnected. Start a new session to transfer more files.'));
        };
    }
    private async gather(type: 'offer' | 'answer'): Promise<Signal> {
        this.events.status('Preparing connection information.');
        await this.pc.setLocalDescription(type === 'offer' ? await this.pc.createOffer() : await this.pc.createAnswer());
        if (this.stopped) throw new Error('Session canceled.');
        if (this.pc.iceGatheringState !== 'complete') await new Promise<void>((resolve, reject) => {
            const finish = (error?: Error) => {
                clearTimeout(timeout);
                this.pc.removeEventListener('icegatheringstatechange', change);
                this.abortGather = undefined;
                if (error) reject(error); else resolve();
            };
            const change = () => { if (this.pc.iceGatheringState === 'complete') finish(); };
            const timeout = setTimeout(() => finish(new Error('ICE gathering timed out. Start a new session to retry.')), 20000);
            this.abortGather = () => finish(new Error('Session canceled.'));
            this.pc.addEventListener('icegatheringstatechange', change);
            change();
        });
        if (this.stopped) throw new Error('Session canceled.');
        return { version: 1, session: this.session, type, sdp: this.pc.localDescription!.sdp };
    }
    async offer(): Promise<Signal> {
        this.attach(this.pc.createDataChannel('files', { ordered: true }));
        return this.gather('offer');
    }
    async answer(signal: Signal): Promise<Signal> {
        if (signal.type !== 'offer' || signal.session !== this.session) throw new Error('Expected an offer for this session.');
        await this.pc.setRemoteDescription({ type: signal.type, sdp: signal.sdp });
        return this.gather('answer');
    }
    async applyAnswer(signal: Signal) {
        if (signal.type !== 'answer' || signal.session !== this.session) throw new Error('This reply belongs to a different session.');
        this.armConnectionTimeout();
        await this.pc.setRemoteDescription({ type: signal.type, sdp: signal.sdp });
    }
    private async waitFor(predicate: () => boolean) {
        while (!predicate()) {
            if (this.stopped || this.channel?.readyState !== 'open') throw new Error('Session closed.');
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        if (this.stopped) throw new Error('Session closed.');
    }
    private control(value: object) {
        if (this.stopped || this.channel?.readyState !== 'open') throw new Error('Session closed.');
        const text = JSON.stringify(value);
        const limit = Math.min(16384, this.pc.sctp?.maxMessageSize ?? 16384);
        if (new TextEncoder().encode(text).length > limit) throw new Error('Control message exceeds the negotiated limit.');
        this.channel.send(text);
    }
    private async publishManifest() {
        this.control({ type: 'hello', version: 1 });
        for (const file of this.items) {
            await this.waitFor(() => this.channel!.bufferedAmount < WINDOW_BYTES);
            this.control({ type: 'file', file: { id: file.id, name: file.name, size: file.size } });
        }
        this.control({ type: 'manifest-end' });
    }
    async accept(sink: Sink) {
        if (this.sources || !this.manifestReady || this.sink || !this.items[this.index] || this.stopped) {
            await sink.abort(); throw new Error('No file is ready to receive.');
        }
        this.sink = sink;
        this.received = 0;
        this.items[this.index].status = 'Receiving';
        this.events.ready(null);
        this.control({ type: 'accept', id: this.index });
        this.notify(true);
    }
    skip() {
        if (this.sources || !this.manifestReady || this.sink || !this.items[this.index]) return;
        this.control({ type: 'skip', id: this.index });
        this.items[this.index].status = 'Skipped';
        this.index++;
        this.next();
    }
    private next() {
        this.notify(true);
        this.events.ready(this.items[this.index] ?? null);
        if (this.index === this.items.length) this.events.status('Transfer finished. Start a new session to send more files.');
    }
    private async sendFile() {
        const file = this.sources![this.index];
        const id = this.index;
        this.sending = true;
        this.sent = this.acknowledged = 0;
        this.items[id].status = 'Sending';
        this.notify(true);
        const max = Math.min(16384, this.pc.sctp?.maxMessageSize ?? 16384) - HEADER;
        if (max < 1) throw new Error('Negotiated message size is too small.');
        while (this.sent < file.size) {
            const size = Math.min(max, file.size - this.sent);
            await this.waitFor(() => this.sent - this.acknowledged + size <= WINDOW_BYTES && this.channel!.bufferedAmount < WINDOW_BYTES);
            const bytes = new Uint8Array(await file.slice(this.sent, this.sent + size).arrayBuffer());
            if (this.stopped) return;
            if (bytes.length !== size) throw new Error('Source file could not be read completely.');
            this.channel!.send(encodeChunk(id, this.sent, bytes));
            this.sent += size;
        }
        // Ordered end flushes the receiver’s partial storage batch before completion.
        this.control({ type: 'end', id });
    }
    private async flush() {
        if (!this.pendingBytes || !this.sink) return;
        const batch = new Uint8Array(this.pendingBytes);
        let offset = 0;
        for (const chunk of this.pending) { batch.set(chunk, offset); offset += chunk.length; }
        this.pending = [];
        this.pendingBytes = 0;
        await this.sink.write(batch);
        if (this.stopped) return;
        const file = this.items[this.index];
        file.bytes += batch.length;
        this.control({ type: 'ack', id: this.index, bytes: file.bytes });
        this.notify();
    }
    private hello = false;
    private async receive(data: unknown) {
        if (data instanceof ArrayBuffer) {
            if (this.sources || !this.sink) throw new Error('Unexpected file data.');
            const { id, offset, bytes } = decodeChunk(data);
            const file = this.items[this.index];
            if (id !== this.index || offset !== this.received || offset + bytes.length > file.size) throw new Error('Invalid file data offset or size.');
            this.received += bytes.length;
            this.pending.push(bytes);
            this.pendingBytes += bytes.length;
            if (this.pendingBytes >= 240 * 1024) await this.flush();
            return;
        }
        if (typeof data !== 'string' || data.length > 16384) throw new Error('Invalid control message.');
        const m = JSON.parse(data) as Record<string, unknown>;
        if (!m || typeof m !== 'object') throw new Error('Invalid control message.');
        if (!this.sources) {
            if (m.type === 'hello' && m.version === 1 && !this.hello) { this.hello = true; return; }
            if (!this.hello) throw new Error('Unsupported transfer protocol.');
            if (m.type === 'file' && !this.manifestReady && this.items.length < 1000) {
                this.items.push({ ...validateFile(m.file, this.items.length), bytes: 0, status: 'Waiting' });
                return;
            }
            if (m.type === 'manifest-end' && !this.manifestReady && this.items.length) { this.manifestReady = true; this.next(); return; }
            if (m.type === 'end' && m.id === this.index && this.sink) {
                await this.flush();
                if (this.stopped) return;
                const file = this.items[this.index];
                if (file.bytes !== file.size) throw new Error('File ended before all bytes were received.');
                const blob = await this.sink.close();
                this.sink = null;
                if (this.stopped) return;
                file.status = 'Complete';
                this.control({ type: 'complete', id: this.index });
                this.index++;
                if (blob) this.events.download(file, blob);
                this.next();
                return;
            }
        } else if (m.id === this.index && this.items[this.index]) {
            if (m.type === 'accept' && !this.sending) { void this.sendFile().catch(error => this.fail(error)); return; }
            if (m.type === 'skip' && !this.sending) { this.items[this.index].status = 'Skipped'; this.index++; this.next(); return; }
            if (m.type === 'ack' && this.sending && typeof m.bytes === 'number') {
                validateAck(m.bytes, this.acknowledged, this.sent);
                this.acknowledged = m.bytes;
                this.items[this.index].bytes = m.bytes;
                this.notify();
                return;
            }
            if (m.type === 'complete' && this.sending && this.acknowledged === this.items[this.index].size) {
                this.items[this.index].status = 'Complete'; this.sending = false; this.index++; this.next(); return;
            }
        }
        throw new Error('Unexpected transfer message.');
    }
}
