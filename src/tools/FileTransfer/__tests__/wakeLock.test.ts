import { describe, expect, it, vi } from 'vitest';
import { keepScreenAwake } from '../wakeLock';

function setup() {
    const events = new EventTarget();
    const page = Object.assign(events, { visibilityState: 'visible' as DocumentVisibilityState });
    const locks: WakeLockSentinel[] = [];
    const request = vi.fn(async () => {
        const target = new EventTarget();
        const sentinel = Object.assign(target, {
            released: false,
            type: 'screen' as const,
            onrelease: null,
            release: vi.fn(async () => {
                sentinel.released = true;
                target.dispatchEvent(new Event('release'));
            }),
        });
        locks.push(sentinel);
        return sentinel;
    });
    const report = vi.fn();
    const visibility = (state: DocumentVisibilityState) => {
        page.visibilityState = state;
        page.dispatchEvent(new Event('visibilitychange'));
    };
    return { page, locks, request, report, visibility };
}
const settle = async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
};

describe('Screen wake lock', () => {
    it('waits for visibility and cancels queued requests on immediate cleanup', async () => {
        const env = setup();
        env.visibility('hidden');
        const stop = keepScreenAwake({ page: env.page, wakeLock: { request: env.request } }, env.report);
        await settle();
        expect(env.request).not.toHaveBeenCalled();
        stop();
        env.visibility('visible');
        const cancel = keepScreenAwake({ page: env.page, wakeLock: { request: env.request } }, env.report);
        cancel();
        await settle();
        expect(env.request).not.toHaveBeenCalled();
    });

    it('requests a screen lock and releases it when the transfer ends', async () => {
        const env = setup();
        const stop = keepScreenAwake({ page: env.page, wakeLock: { request: env.request } }, env.report);
        await settle();
        expect(env.request).toHaveBeenCalledWith('screen');
        expect(env.report).toHaveBeenLastCalledWith('active');
        stop();
        expect(env.locks[0].release).toHaveBeenCalledOnce();
        env.visibility('visible');
        expect(env.request).toHaveBeenCalledOnce();
    });

    it('reacquires the lock when returning to the visible tab without overlapping requests', async () => {
        const env = setup();
        const stop = keepScreenAwake({ page: env.page, wakeLock: { request: env.request } }, env.report);
        await settle();
        env.visibility('hidden');
        expect(env.locks[0].release).toHaveBeenCalledOnce();
        env.visibility('visible');
        env.visibility('visible');
        await settle();
        expect(env.request).toHaveBeenCalledTimes(2);
        expect(env.report).toHaveBeenLastCalledWith('active');
        stop();
    });

    it('releases a request that resolves after cleanup without updating the UI', async () => {
        const env = setup();
        const sentinel = await env.request();
        let resolve!: (lock: WakeLockSentinel) => void;
        const request = vi.fn(() => new Promise<WakeLockSentinel>((done) => {
            resolve = done;
        }));
        const stop = keepScreenAwake({ page: env.page, wakeLock: { request } }, env.report);
        await settle();
        stop();
        env.report.mockClear();
        resolve(sentinel);
        await settle();
        expect(sentinel.release).toHaveBeenCalledOnce();
        expect(env.report).not.toHaveBeenCalled();
    });

    it('handles unsupported browsers and denied requests without throwing', async () => {
        const env = setup();
        const stop = keepScreenAwake({ page: env.page }, env.report);
        await settle();
        expect(env.report).toHaveBeenLastCalledWith('unavailable');
        stop();
        const rejected = keepScreenAwake({ page: env.page, wakeLock: { request: vi.fn().mockRejectedValue(new Error('Denied')) } }, env.report);
        await settle();
        expect(env.report).toHaveBeenLastCalledWith('unavailable');
        rejected();
    });

    it('reports a system release and retries on the next visibility change', async () => {
        const env = setup();
        const stop = keepScreenAwake({ page: env.page, wakeLock: { request: env.request } }, env.report);
        await settle();
        await env.locks[0].release();
        expect(env.report).toHaveBeenLastCalledWith('released');
        env.visibility('hidden');
        env.visibility('visible');
        await settle();
        expect(env.request).toHaveBeenCalledTimes(2);
        stop();
    });
});
