import { expect, it } from 'vitest';
import { initialFeedback, recordScan } from '../feedback';
it('distinguishes camera reads from transfer progress', () => {
    const received = recordScan(initialFeedback, 'progress', 'Received a part.', 1000);
    const duplicate = recordScan(received, 'duplicate', 'Already received.', 2000);
    const ignored = recordScan(duplicate, 'ignored', 'Other transfer.', 3000);
    expect(ignored).toEqual({ reads: 3, duplicates: 1, ignored: 1, lastRead: 3000, lastProgress: 1000, message: 'Other transfer.' });
    expect(initialFeedback.reads).toBe(0);
});
