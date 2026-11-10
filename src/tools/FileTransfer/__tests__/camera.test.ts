import { afterEach, expect, it, vi, type Mock } from 'vitest';
import QrScanner from 'qr-scanner';
import { createCameraScanner } from '../camera';

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

function setup() {
    vi.useFakeTimers();
    const events = new EventTarget();
    vi.stubGlobal('document', { hidden: false, createElement: () => ({}),
        addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const terminate = vi.fn();
    vi.spyOn(QrScanner, 'createQrEngine').mockResolvedValue({ terminate } as unknown as Worker);
    // spyOn otherwise infers the library's deprecated string-return overload.
    const decode = vi.spyOn(QrScanner, 'scanImage') as unknown as Mock<() => Promise<QrScanner.ScanResult>>;
    decode.mockResolvedValue({ data: 'frame', cornerPoints: [
        { x: 100, y: 100 }, { x: 400, y: 100 }, { x: 400, y: 400 }, { x: 100, y: 400 },
    ] });
    const video = { videoWidth: 1280, videoHeight: 720, srcObject: null, play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(), requestVideoFrameCallback: vi.fn() } as unknown as HTMLVideoElement;
    const read = vi.fn();
    const scanner = createCameraScanner(video, read, { facingMode: 'environment', maxScansPerSecond: 10 });
    return { scanner, decode, video, read, stop, terminate, stream, getUserMedia, events };
}

it('scans at the configured cadence without waiting for video presentation callbacks and releases resources', async () => {
    const { scanner, decode, video, read, stop, terminate } = setup();
    await scanner.start();
    await vi.advanceTimersByTimeAsync(200);
    expect(decode).toHaveBeenCalledTimes(3);
    expect(read).toHaveBeenCalledTimes(3);
    expect(video.requestVideoFrameCallback).not.toHaveBeenCalled();
    scanner.destroy();
    await vi.advanceTimersByTimeAsync(1000);
    expect(decode).toHaveBeenCalledTimes(3);
    expect(stop).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
});

it('stops a camera permission request that completes after scanning was cancelled', async () => {
    const { scanner, getUserMedia, stream, stop, decode } = setup();
    let resolve!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((done) => {
        resolve = done;
    }));
    const starting = scanner.start();
    scanner.destroy();
    resolve(stream);
    await starting;
    expect(stop).toHaveBeenCalledOnce();
    expect(decode).not.toHaveBeenCalled();
});

it('never starts overlapping decodes when the decoder is slower than the scan budget', async () => {
    const { scanner, decode } = setup();
    decode.mockReturnValue(new Promise(() => {}));
    await scanner.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(decode).toHaveBeenCalledOnce();
    scanner.destroy();
});

it('releases the camera while hidden and resumes without overlapping the old loop', async () => {
    const { scanner, events, decode, stop, terminate, getUserMedia } = setup();
    await scanner.start();
    await vi.advanceTimersByTimeAsync(0);
    const before = decode.mock.calls.length;
    Object.assign(document, { hidden: true });
    events.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(decode).toHaveBeenCalledTimes(before);
    expect(stop).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();
    Object.assign(document, { hidden: false });
    events.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(decode).toHaveBeenCalledTimes(before + 1);
    scanner.destroy();
});

it('terminates a decoder that finishes loading after scanning was cancelled', async () => {
    const { scanner, terminate, decode } = setup();
    let resolve!: (engine: Worker) => void;
    vi.mocked(QrScanner.createQrEngine).mockReturnValue(new Promise<Worker>((done) => {
        resolve = done;
    }));
    const starting = scanner.start();
    await vi.advanceTimersByTimeAsync(0);
    scanner.destroy();
    resolve({ terminate } as unknown as Worker);
    await starting;
    expect(terminate).toHaveBeenCalledOnce();
    expect(decode).not.toHaveBeenCalled();
});
