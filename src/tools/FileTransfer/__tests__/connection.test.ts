import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeChunk, encodeChunk, TransferConnection, validateAck, validateFile, WINDOW_BYTES, type TransferEvents, type TransferFile } from '../connection';
import { createSink, MEMORY_LIMIT, safeName, type FileInfo, type Sink } from '../storage';

class Channel {
    readyState = 'open'; bufferedAmount = 0; bufferedAmountLowThreshold = 0; binaryType = 'arraybuffer';
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onclose: (() => void) | null = null;
    onerror: (() => void) | null = null;
    other: Channel | null = null;
    sent: unknown[] = [];
    send(data: unknown) { this.sent.push(data); queueMicrotask(() => { if (this.other?.readyState === 'open') this.other.onmessage?.({ data }); }); }
    close() { this.readyState = 'closed'; }
}
class Peer extends EventTarget {
    static instances: Peer[] = [];
    connectionState = 'new'; iceGatheringState = 'complete'; sctp = { maxMessageSize: 16384 };
    localDescription: { sdp: string } | null = null;
    remoteDescription: { sdp: string } | null = null;
    onconnectionstatechange: (() => void) | null = null;
    ondatachannel: ((e: { channel: Channel }) => void) | null = null;
    channel = new Channel();
    config: unknown;
    constructor(config: unknown) { super(); this.config = config; Peer.instances.push(this); }
    createDataChannel() { return this.channel; }
    async createOffer() { return { type: 'offer', sdp: 'v=0\r\n' }; }
    async createAnswer() { return { type: 'answer', sdp: 'v=0\r\n' }; }
    async setLocalDescription(value: { sdp: string }) { this.localDescription = value; }
    async setRemoteDescription(value: { sdp: string }) { this.remoteDescription = value; }
    close() { this.connectionState = 'closed'; }
}
function events() {
    const state: { files: TransferFile[]; ready: FileInfo | null; blob: Blob | null; error: string } = { files: [], ready: null, blob: null, error: '' };
    const callbacks: TransferEvents = {
        status: vi.fn(), files: files => { state.files = files; }, ready: file => { state.ready = file; },
        download: (_file, blob) => { state.blob = blob; }, error: text => { state.error = text; }, connected: vi.fn(),
    };
    return { state, callbacks };
}
async function until(predicate: () => boolean) {
    const deadline = Date.now() + 5000;
    while (!predicate()) { if (Date.now() > deadline) throw new Error('Timed out waiting for transfer.'); await new Promise(r => setTimeout(r, 5)); }
}
async function pair(files: File[]) {
    Peer.instances = [];
    vi.stubGlobal('RTCPeerConnection', Peer);
    const sendEvents = events(), receiveEvents = events();
    const sender = new TransferConnection('session', files, sendEvents.callbacks);
    const receiver = new TransferConnection('session', null, receiveEvents.callbacks);
    const offer = await sender.offer();
    const answer = await receiver.answer(offer);
    const [a, b] = Peer.instances;
    a.channel.other = b.channel; b.channel.other = a.channel;
    b.ondatachannel!({ channel: b.channel });
    await sender.applyAnswer(answer);
    b.channel.onopen!(); a.channel.onopen!();
    await until(() => receiveEvents.state.ready !== null);
    return { sender, receiver, sendEvents, receiveEvents, a, b };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('transfer protocol', () => {
    it('keeps the receiver available when ICE fails before the reply is scanned', async () => {
        vi.stubGlobal('RTCPeerConnection', Peer);
        const receiveEvents = events();
        const receiver = new TransferConnection('session', null, receiveEvents.callbacks);
        const sdp = 'v=0\r\na=ice-ufrag:sender\r\na=ice-pwd:secret\r\na=fingerprint:sha-256 AA:BB\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\na=mid:0\r\na=candidate:1 1 udp 2113937151 device.local 63604 typ host\r\na=end-of-candidates\r\n';
        try {
            await receiver.answer({ version: 1, session: 'session', type: 'offer', sdp });
            const peer = receiver.pc as unknown as Peer;
            expect(peer.remoteDescription?.sdp).toBe(sdp);
            peer.connectionState = 'failed';
            peer.onconnectionstatechange!();
            expect(receiveEvents.state.error).toBe('');
            expect(peer.connectionState).toBe('failed');
            expect(receiveEvents.callbacks.status).toHaveBeenLastCalledWith('Waiting for the sender to scan the reply. Keep this page open.');
        } finally { receiver.close(); }
    });
    it('still closes failed sender connections and failed established receiver connections', async () => {
        vi.stubGlobal('RTCPeerConnection', Peer);
        const sendEvents = events();
        const sender = new TransferConnection('session', [], sendEvents.callbacks);
        const peer = sender.pc as unknown as Peer;
        peer.connectionState = 'failed';
        peer.onconnectionstatechange!();
        expect(sendEvents.state.error).toContain('Could not connect directly');
        expect(peer.connectionState).toBe('closed');

        const p = await pair([new File(['a'], 'a')]);
        try {
            p.b.connectionState = 'failed';
            p.b.onconnectionstatechange!();
            expect(p.receiveEvents.state.error).toContain('Could not connect directly');
            expect(p.b.connectionState).toBe('closed');
        } finally { p.sender.close(); p.receiver.close(); }
    });
    it('gives the sender every reply candidate so it can initiate connectivity checks', async () => {
        vi.stubGlobal('RTCPeerConnection', Peer);
        const sender = new TransferConnection('session', [], events().callbacks);
        const sdp = 'v=0\r\na=candidate:1 1 udp 2113937151 192.168.2.3 60367 typ host\r\na=end-of-candidates\r\n';
        try {
            await sender.applyAnswer({ version: 1, session: 'session', type: 'answer', sdp });
            expect((sender.pc as unknown as Peer).remoteDescription?.sdp).toBe(sdp);
        } finally { sender.close(); }
    });
    it('waits for complete ICE gathering and includes the final candidates', async () => {
        Peer.instances = [];
        vi.stubGlobal('RTCPeerConnection', Peer);
        const sender = new TransferConnection('session', [new File(['a'], 'a')], events().callbacks);
        const peer = Peer.instances[0];
        peer.iceGatheringState = 'gathering';
        let settled = false;
        const result = sender.offer().then(signal => { settled = true; return signal; });
        await new Promise(resolve => setTimeout(resolve, 5));
        expect(settled).toBe(false);
        peer.localDescription = { sdp: 'v=0\r\na=candidate:final.local\r\n' };
        peer.iceGatheringState = 'complete';
        peer.dispatchEvent(new Event('icegatheringstatechange'));
        expect((await result).sdp).toContain('candidate:final.local');
        sender.close();
    });
    it('rejects incomplete ICE gathering on timeout and cancellation', async () => {
        vi.useFakeTimers();
        Peer.instances = [];
        vi.stubGlobal('RTCPeerConnection', Peer);
        const sender = new TransferConnection('session', [new File(['a'], 'a')], events().callbacks);
        Peer.instances[0].iceGatheringState = 'gathering';
        const result = expect(sender.offer()).rejects.toThrow('ICE gathering timed out');
        await vi.advanceTimersByTimeAsync(20000);
        await result;
        sender.close();
        const second = new TransferConnection('session', [new File(['a'], 'a')], events().callbacks);
        Peer.instances[1].iceGatheringState = 'gathering';
        const canceled = expect(second.offer()).rejects.toThrow('canceled');
        await vi.advanceTimersByTimeAsync(1);
        second.close();
        await canceled;
    });
    it('validates binary framing, safe offsets, manifests and acknowledgments', () => {
        const decoded = decodeChunk(encodeChunk(7, 2 ** 33, new Uint8Array([1, 2, 3])));
        expect(decoded).toEqual({ id: 7, offset: 2 ** 33, bytes: new Uint8Array([1, 2, 3]) });
        expect(() => decodeChunk(new ArrayBuffer(12))).toThrow();
        expect(() => decodeChunk(encodeChunk(0, NaN, new Uint8Array([1])))).toThrow();
        expect(() => validateFile({ id: 0, name: 'a', size: -1 }, 0)).toThrow();
        expect(() => validateFile({ id: 2, name: 'a', size: 1 }, 0)).toThrow();
        expect(() => validateAck(11, 2, 10)).toThrow();
        expect(() => validateAck(1, 2, 10)).toThrow();
        expect(safeName('../a\u0000')).toBe('.._a_');
    });
    it('transfers multiple files, empty files, duplicate names and Unicode names exactly', async () => {
        const bytes = crypto.getRandomValues(new Uint8Array(65536));
        const files = [new File([bytes, bytes, bytes], '日本語.bin'), new File([], 'empty'), new File(['second'], '日本語.bin')];
        const p = await pair(files);
        try {
            expect(p.a.config).toEqual({ iceServers: [] });
            for (let i = 0; i < files.length; i++) {
                await until(() => p.receiveEvents.state.ready?.id === i);
                const sink = await createSink(p.receiveEvents.state.ready!, false);
                await p.receiver.accept(sink);
                await until(() => p.sendEvents.state.files[i]?.status === 'Complete');
                expect(new Uint8Array(await p.receiveEvents.state.blob!.arrayBuffer())).toEqual(new Uint8Array(await files[i].arrayBuffer()));
            }
            expect(p.sendEvents.state.error).toBe(''); expect(p.receiveEvents.state.error).toBe('');
        } finally { p.sender.close(); p.receiver.close(); }
    });
    it('coalesces small messages into bounded storage writes and flushes the final tail', async () => {
        const p = await pair([new File([new Uint8Array(100000)], 'batched')]);
        try {
            const write = vi.fn(async () => {});
            await p.receiver.accept({ write, close: async () => {}, abort: async () => {} });
            await until(() => p.sendEvents.state.files[0]?.status === 'Complete');
            expect(write).toHaveBeenCalledOnce();
            expect(write.mock.calls[0]).toHaveLength(1);
        } finally { p.sender.close(); p.receiver.close(); }
    });
    it('bounds outstanding bytes while a receiver blocks on storage', async () => {
        const p = await pair([new File([new Uint8Array(WINDOW_BYTES * 3)], 'large')]);
        let unblock: () => void = () => {};
        const gate = new Promise<void>(resolve => { unblock = resolve; });
        const sink: Sink = { write: () => gate, close: async () => {}, abort: async () => {} };
        try {
            await p.receiver.accept(sink);
            await until(() => p.a.channel.sent.filter(x => x instanceof ArrayBuffer).length > 50);
            await new Promise(r => setTimeout(r, 50));
            const queued = p.a.channel.sent.filter(x => x instanceof ArrayBuffer).reduce((n, x) => n + (x as ArrayBuffer).byteLength - 12, 0);
            expect(queued).toBeLessThanOrEqual(WINDOW_BYTES);
            expect(p.sendEvents.state.files[0].bytes).toBe(0);
            unblock();
            await until(() => p.sendEvents.state.files[0]?.status === 'Complete');
        } finally { unblock(); p.sender.close(); p.receiver.close(); }
    });
    it('skips a file without sending bytes and aborts an active sink on cancellation', async () => {
        const p = await pair([new File(['skip'], 'a'), new File(['save'], 'b')]);
        try {
            p.receiver.skip();
            await until(() => p.sendEvents.state.files[0]?.status === 'Skipped');
            const abort = vi.fn(async () => {});
            await p.receiver.accept({ write: async () => {}, close: async () => {}, abort });
            p.receiver.close();
            expect(abort).toHaveBeenCalledOnce();
        } finally { p.sender.close(); p.receiver.close(); }
    });
    it('rejects out-of-order data and reports storage failures', async () => {
        const p = await pair([new File(['abc'], 'a')]);
        try {
            // Inject invalid data before consent.
            p.b.channel.onmessage!({ data: encodeChunk(0, 0, new Uint8Array([1])) });
            await until(() => !!p.receiveEvents.state.error);
            expect(p.receiveEvents.state.error).toContain('Unexpected file data');
        } finally { p.sender.close(); p.receiver.close(); }
        const q = await pair([new File(['abc'], 'a')]);
        try {
            const abort = vi.fn(async () => {});
            await q.receiver.accept({ write: async () => { throw new Error('Disk full.'); }, close: async () => {}, abort });
            await until(() => !!q.receiveEvents.state.error);
            expect(q.receiveEvents.state.error).toBe('Disk full.'); expect(abort).toHaveBeenCalledOnce();
        } finally { q.sender.close(); q.receiver.close(); }
    });
    it('rejects oversized memory downloads before allocating', async () => {
        await expect(createSink({ id: 0, name: 'large', size: MEMORY_LIMIT + 1 }, false)).rejects.toThrow('100 MiB');
        const sink = await createSink({ id: 0, name: 'a', size: 1 }, false);
        await expect(sink.write(new Uint8Array(2))).rejects.toThrow('memory limit');
    });
});
