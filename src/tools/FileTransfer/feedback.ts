export type ScanFeedback = {
    reads: number;
    duplicates: number;
    ignored: number;
    lastRead: number | null;
    lastProgress: number | null;
    message: string;
};
export const initialFeedback: ScanFeedback = { reads: 0, duplicates: 0, ignored: 0, lastRead: null, lastProgress: null, message: 'No QR codes read yet.' };
export function recordScan(previous: ScanFeedback, outcome: 'progress' | 'duplicate' | 'ignored', message: string, now = Date.now()): ScanFeedback {
    return { reads: previous.reads + 1, duplicates: previous.duplicates + Number(outcome === 'duplicate'), ignored: previous.ignored + Number(outcome === 'ignored'), lastRead: now, lastProgress: outcome === 'progress' ? now : previous.lastProgress, message };
}
