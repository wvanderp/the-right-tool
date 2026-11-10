import QRCode from 'qrcode';
import type { Observation } from './framing';

export function qrObservation(scan: { data: string; cornerPoints: { x: number; y: number }[] }): Observation {
    let qrModules = 0;
    try {
        qrModules = QRCode.create(scan.data, { errorCorrectionLevel: 'L' }).modules.size;
    }
    catch { /* Unsupported codes are rejected by the session. */ }
    const points = scan.cornerPoints;
    const codePixels = points.length === 4
        ? points.reduce((sum, p, i) => sum + Math.hypot(p.x - points[(i + 1) % 4].x, p.y - points[(i + 1) % 4].y), 0) / 4
        : 0;
    return { qrModules, codePixels: Math.round(codePixels) };
}

// Scan everything shown in the preview. qr-scanner defaults to a center crop
// resized to 400px, which can cut off large codes and lose small QR modules.
export function cameraScanRegion(video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>) {
    const width = Math.max(1, video.videoWidth);
    const height = Math.max(1, video.videoHeight);
    const scale = Math.min(1, 1920 / Math.max(width, height));
    return {
        x: 0,
        y: 0,
        width,
        height,
        downScaledWidth: Math.max(1, Math.round(width * scale)),
        downScaledHeight: Math.max(1, Math.round(height * scale)),
    };
}

// qr-scanner retains the object returned by calculateScanRegion. Updating this
// shared window avoids private scanner APIs and preserves its conversion of
// decoded corners back into full-camera coordinates.
export class CameraScanWindow {
    private full = cameraScanRegion({ videoWidth: 0, videoHeight: 0 });
    private region = { ...this.full };
    private failures = 0;

    calculate(video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>) {
        this.full = cameraScanRegion(video);
        this.reset();
        return this.region;
    }

    private reset() {
        Object.assign(this.region, this.full);
        this.failures = 0;
    }

    observe(points: { x: number; y: number }[]) {
        if (points.length !== 4 || !points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) {
            this.reset();
            return;
        }
        const left = Math.min(...points.map(p => p.x));
        const top = Math.min(...points.map(p => p.y));
        const right = Math.max(...points.map(p => p.x));
        const bottom = Math.max(...points.map(p => p.y));
        const padding = Math.max(16, Math.max(right - left, bottom - top) * 0.2);
        const x = Math.max(0, Math.floor(left - padding));
        const y = Math.max(0, Math.floor(top - padding));
        const width = Math.min(this.full.width, Math.ceil(right + padding)) - x;
        const height = Math.min(this.full.height, Math.ceil(bottom + padding)) - y;
        if (right <= left || bottom <= top || width <= 0 || height <= 0) {
            this.reset();
            return;
        }
        Object.assign(this.region, cameraScanRegion({ videoWidth: width, videoHeight: height }), { x, y });
        this.failures = 0;
    }

    miss() {
        if (++this.failures >= 3) this.reset();
    }
}
