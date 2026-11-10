import { formatRemaining, formatSpeed, type TransferProgress } from './transferSpeed';

export default function TransferSpeed({ progress, direction }: { progress: TransferProgress; direction: 'send' | 'receive' }) {
    const maximum = Math.max(1, ...progress.history);
    const points = progress.history.map((speed, index) => `${index * 300 / 29},${60 - speed / maximum * 52}`).join(' ');
    const eta = progress.secondsRemaining !== null
        ? formatRemaining(progress.secondsRemaining)
        : progress.total === null
            ? 'Waiting for file metadata.'
            : progress.status === 'stalled'
                ? 'Waiting for new data.'
                : direction === 'send' && progress.status === 'waiting' ? 'Waiting for receiver feedback.' : 'Measuring transfer speed.';
    return (
        <section className="rounded-lg border border-gray-200 p-4 space-y-4" aria-label="Transfer speed and time remaining">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <dt className="text-sm text-gray-600">Transfer speed</dt>
                    <dd className="text-xl font-bold tabular-nums">{formatSpeed(progress.bytesPerSecond)}</dd>
                </div>
                <div>
                    <dt className="text-sm text-gray-600">Estimated time remaining</dt>
                    <dd className="font-medium">{eta}</dd>
                </div>
            </dl>
            <div>
                <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="w-full h-16 text-primary" role="img" aria-label={`Transfer speed over the last 30 seconds. Current speed: ${formatSpeed(progress.bytesPerSecond)}.`}>
                    <line x1="0" y1="60" x2="300" y2="60" className="stroke-gray-200" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>30 seconds ago</span>
                    <span>Now</span>
                </div>
            </div>
            <p className="text-xs text-gray-600">
                {direction === 'send' ? 'Based on newly confirmed file bytes. Receiver feedback is needed to measure progress.' : 'Based on newly collected file bytes. Repeated packets are excluded.'}
                {' '}
                Speed and remaining time use the last 10 seconds.
            </p>
        </section>
    );
}
