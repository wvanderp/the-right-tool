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
