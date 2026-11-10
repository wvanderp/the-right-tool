import { afterEach, expect, it, vi } from 'vitest';
import { startRotation } from '../rotation';
afterEach(() => vi.useRealTimers());
it('holds a QR for one second by default and stops cleanly', () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const stop = startRotation(advance);
    vi.advanceTimersByTime(999);
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(advance).toHaveBeenCalledTimes(1);
    stop();
    vi.advanceTimersByTime(2000);
    expect(advance).toHaveBeenCalledTimes(1);
});
it('allows slower rotation for cameras that need more time', () => {
    vi.useFakeTimers();
    const advance = vi.fn();
    const stop = startRotation(advance, 2000);
    vi.advanceTimersByTime(1999);
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(advance).toHaveBeenCalledTimes(1);
    stop();
});
