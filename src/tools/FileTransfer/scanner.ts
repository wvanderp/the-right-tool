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
