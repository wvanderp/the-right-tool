export type TransferProgress = {
    bytes: number;
    total: number | null;
    bytesPerSecond: number;
    secondsRemaining: number | null;
    history: number[];
    status: 'waiting' | 'measuring' | 'active' | 'stalled' | 'complete';
};

// Count unique file bytes, not QR payload bytes or repeated camera reads.
// Store one bucket per second so memory stays bounded during long transfers.
export class TransferSpeedTracker {
    private buckets = new Map<number, number>();
    private bytes = 0;
    private startedAt: number | null = null;
    private firstProgressAt: number | null = null;
    private lastProgressAt: number | null = null;
    private recordedAt = 0;

    record(bytes: number, now: number) {
        if (this.startedAt === null || bytes < this.bytes) {
            this.buckets.clear();
            this.startedAt = now;
            this.firstProgressAt = null;
            this.lastProgressAt = null;
            this.bytes = bytes < this.bytes ? bytes : 0;
        }
        now = Math.max(now, this.recordedAt);
        this.recordedAt = now;
        const second = Math.floor(now / 1000);
        const added = bytes - this.bytes;
        if (added > 0) {
            this.buckets.set(second, (this.buckets.get(second) ?? 0) + added);
            this.firstProgressAt ??= now;
            this.lastProgressAt = now;
        }
        this.bytes = bytes;
        for (const bucket of this.buckets.keys()) if (bucket < second - 29) this.buckets.delete(bucket);
    }

    snapshot(now: number, total: number | null): TransferProgress {
        now = Math.max(now, this.recordedAt);
        const second = Math.floor(now / 1000);
        const history = Array.from({ length: 30 }, (_, index) => this.buckets.get(second - 29 + index) ?? 0);
        const duration = this.startedAt === null ? 1 : Math.min(10, Math.max(1, (now - this.startedAt) / 1000));
        const bytesPerSecond = history.slice(-10).reduce((sum, bytes) => sum + bytes, 0) / duration;
        const complete = total !== null && this.bytes >= total;
        const stalled = this.lastProgressAt !== null && now - this.lastProgressAt >= 10000;
        const measuring = this.firstProgressAt === null || now - this.firstProgressAt < 3000;
        return {
            bytes: this.bytes, total, bytesPerSecond, history,
            secondsRemaining: complete ? 0 : total !== null && !measuring && !stalled && bytesPerSecond > 0 ? (total - this.bytes) / bytesPerSecond : null,
            status: complete ? 'complete' : stalled ? 'stalled' : this.firstProgressAt === null ? 'waiting' : measuring ? 'measuring' : 'active',
        };
    }
}

export function formatSpeed(bytesPerSecond: number) {
    if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MiB/s`;
    if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KiB/s`;
    return `${Math.round(bytesPerSecond)} B/s`;
}
export function formatRemaining(seconds: number) {
    if (seconds <= 0) return 'Complete.';
    if (seconds < 60) return `About ${Math.ceil(seconds)} sec.`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `About ${minutes} min.`;
    const hours = Math.floor(minutes / 60);
    return `About ${hours} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}.`;
}
