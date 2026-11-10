import { describe, expect, it } from 'vitest';
import { cameraScanRegion, qrObservation } from '../scanner';

it('measures QR density and camera size from the payload and rotated corner points', () => {
    const observation = qrObservation({ data: 'QR test payload', cornerPoints: [
        { x: 0, y: 50 }, { x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 },
    ] });
    expect(observation.qrModules).toBeGreaterThanOrEqual(21);
    expect((observation.qrModules - 21) % 4).toBe(0);
    expect(observation.codePixels).toBe(71);
});

describe('Camera scan region', () => {
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
