import QrScanner from 'qr-scanner';
import { CameraScanWindow } from './scanner';

type Options = { facingMode: string; maxScansPerSecond: number; onError?: (error: unknown) => void };

// Decode independently of requestVideoFrameCallback: browsers can throttle
// presentation callbacks even while the camera has fresh frames to read.
export function createCameraScanner(video: HTMLVideoElement, onRead: (result: QrScanner.ScanResult) => void, options: Options) {
    const window = new CameraScanWindow();
    const canvas = document.createElement('canvas');
    let region = window.calculate(video);
    let active = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stream: MediaStream | null = null;
    let engine: Awaited<ReturnType<typeof QrScanner.createQrEngine>> | null = null;

    const closeEngine = (decoder: NonNullable<typeof engine>) => {
        if ('terminate' in decoder) decoder.terminate();
    };
    const release = () => {
        generation++;
        clearTimeout(timer);
        timer = undefined;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            if (video.srcObject === stream) {
                video.pause();
                video.srcObject = null;
            }
            stream = null;
        }
        if (engine) closeEngine(engine);
        engine = null;
    };

    const scan = async (token: number) => {
        if (!active || token !== generation || !engine) return;
        const started = performance.now();
        try {
            const result = await QrScanner.scanImage(video, { qrEngine: engine, canvas, scanRegion: region, returnDetailedScanResult: true });
            if (!active || token !== generation) return;
            window.observe(result.cornerPoints);
            onRead(result);
        }
        catch {
            if (active && token === generation) window.miss();
        }
        if (active && token === generation) {
            timer = setTimeout(() => void scan(token), Math.max(0, 1000 / options.maxScansPerSecond - (performance.now() - started)));
        }
    };

    const resume = async () => {
        release();
        const token = generation;
        if (!active || document.hidden) return;
        try {
            const media = await navigator.mediaDevices.getUserMedia({ audio: false,
                video: { facingMode: { ideal: options.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } });
            if (!active || token !== generation) {
                media.getTracks().forEach(track => track.stop());
                return;
            }
            stream = media;
            video.srcObject = media;
            await video.play();
            if (!active || token !== generation) return;
            const decoder = await QrScanner.createQrEngine();
            if (!active || token !== generation) {
                closeEngine(decoder);
                return;
            }
            engine = decoder;
            region = window.calculate(video);
            void scan(token);
        }
        catch (error) {
            if (active && token === generation) throw error;
        }
    };
    const visibility = () => {
        if (document.hidden) release();
        else void resume().catch((error) => {
            release();
            options.onError?.(error);
        });
    };
    const destroy = () => {
        active = false;
        document.removeEventListener('visibilitychange', visibility);
        release();
    };
    return {
        async start() {
            if (active) return;
            active = true;
            document.addEventListener('visibilitychange', visibility);
            try {
                await resume();
            }
            catch (error) {
                destroy();
                throw error;
            }
        },
        destroy,
    };
}
