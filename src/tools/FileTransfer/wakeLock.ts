export type WakeStatus = 'requesting' | 'active' | 'unavailable' | 'released';
type Environment = {
    wakeLock?: Pick<WakeLock, 'request'>;
    page: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
};

// The owner controls the lifetime. Late requests are released after cleanup,
// and visibility changes never start overlapping wake-lock requests.
export function keepScreenAwake({ wakeLock, page }: Environment, report: (status: WakeStatus) => void) {
    let stopped = false;
    let pending = false;
    let generation = 0;
    let lock: WakeLockSentinel | null = null;
    const release = (sentinel: WakeLockSentinel) => {
        void sentinel.release().catch(() => {});
    };
    const acquire = async () => {
        if (stopped || pending || lock || page.visibilityState !== 'visible') return;
        if (!wakeLock) {
            report('unavailable');
            return;
        }
        pending = true;
        const requestGeneration = generation;
        report('requesting');
        try {
            const sentinel = await wakeLock.request('screen');
            if (stopped || page.visibilityState !== 'visible' || requestGeneration !== generation) {
                release(sentinel);
                return;
            }
            lock = sentinel;
            sentinel.addEventListener('release', () => {
                if (stopped || lock !== sentinel) return;
                lock = null;
                report('released');
            }, { once: true });
            if (sentinel.released) {
                lock = null;
                report('released');
            }
            else report('active');
        }
        catch {
            if (!stopped && requestGeneration === generation) report('unavailable');
        }
        finally {
            pending = false;
            if (!stopped && requestGeneration !== generation) void acquire();
        }
    };
    const visibilityChanged = () => {
        if (page.visibilityState === 'visible') void acquire();
        else {
            generation++;
            const previous = lock;
            lock = null;
            if (previous) release(previous);
            report('released');
        }
    };
    page.addEventListener('visibilitychange', visibilityChanged);
    queueMicrotask(() => {
        void acquire();
    });
    return () => {
        stopped = true;
        page.removeEventListener('visibilitychange', visibilityChanged);
        if (lock) release(lock);
        lock = null;
    };
}
