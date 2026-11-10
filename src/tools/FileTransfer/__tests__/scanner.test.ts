import { describe, expect, it } from 'vitest';
import { CameraScanWindow, cameraScanRegion, qrObservation } from '../scanner';

it('measures QR density and camera size from the payload and rotated corner points', () => {
    const observation = qrObservation({ data: 'QR test payload', cornerPoints: [
        { x: 0, y: 50 }, { x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 },
    ] });
    expect(observation.qrModules).toBeGreaterThanOrEqual(21);
    expect((observation.qrModules - 21) % 4).toBe(0);
    expect(observation.codePixels).toBe(71);
});

describe('Camera scan region', () => {
    it('tracks a decoded QR with a quiet-zone margin and reacquires the full frame after failures', () => {
        const video = { videoWidth: 1280, videoHeight: 720 };
        const window = new CameraScanWindow();
        const region = window.calculate(video);
        window.observe([{ x: 100, y: 100 }, { x: 400, y: 100 }, { x: 400, y: 400 }, { x: 100, y: 400 }]);
        expect(region.x).toBeLessThan(100);
        expect(region.y).toBeLessThan(100);
        expect(region.width).toBeGreaterThan(300);
        expect(region.width * region.height).toBeLessThan(1280 * 720 / 4);
        window.miss();
        window.miss();
        expect(region.width).toBeLessThan(1280);
        window.miss();
        expect(region).toEqual(cameraScanRegion(video));
    });

    it('clamps tracked corners to the camera bounds and rejects invalid geometry', () => {
        const window = new CameraScanWindow();
        const region = window.calculate({ videoWidth: 1280, videoHeight: 720 });
        window.observe([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 300 }, { x: 0, y: 300 }]);
        expect(region.x).toBe(0);
        expect(region.y).toBe(0);
        expect(region.width).toBeLessThan(1280);
        window.observe([{ x: NaN, y: 0 }]);
        expect(region.width).toBe(1280);
    });

    it('keeps the entire camera frame at its original HD resolution', () => {
        expect(cameraScanRegion({ videoWidth: 1280, videoHeight: 720 })).toEqual({
            x: 0, y: 0, width: 1280, height: 720, downScaledWidth: 1280, downScaledHeight: 720,
        });
    });

    it('bounds processing size without cropping or distorting landscape and portrait frames', () => {
        expect(cameraScanRegion({ videoWidth: 3840, videoHeight: 2160 })).toEqual({
            x: 0, y: 0, width: 3840, height: 2160, downScaledWidth: 1920, downScaledHeight: 1080,
        });
        expect(cameraScanRegion({ videoWidth: 2160, videoHeight: 3840 })).toEqual({
            x: 0, y: 0, width: 2160, height: 3840, downScaledWidth: 1080, downScaledHeight: 1920,
        });
    });

    it('handles video dimensions before the camera metadata is available', () => {
        expect(cameraScanRegion({ videoWidth: 0, videoHeight: 0 })).toEqual({
            x: 0, y: 0, width: 1, height: 1, downScaledWidth: 1, downScaledHeight: 1,
        });
    });
});
