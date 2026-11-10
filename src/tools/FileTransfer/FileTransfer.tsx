import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowUpRight, FiDownload, FiUpload } from 'react-icons/fi';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import { initialFeedback, recordScan } from './feedback';
import { startRotation } from './rotation';
import { CHUNK, prepare, type Manifest } from './protocol';
import { ReceiverSession, SenderSession, sessionFrame } from './session';
import { cameraScanRegion, qrObservation } from './scanner';
import { keepScreenAwake, type WakeStatus } from './wakeLock';
import TransferSpeed from './TransferSpeedPanel';

function Display({ value, label }: { value: string; label: string }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        if (canvas.current) {
            void QRCode.toCanvas(canvas.current, value, { width: 1200, margin: 4, errorCorrectionLevel: 'L' }).then(() => {
                if (active) setError('');
            }).catch(() => {
                if (active) setError('This QR code is too large. Start over with fewer files or shorter file names.');
            });
        }
        return () => {
            active = false;
        };
    }, [value]);
    return (
        <div className="w-full mx-auto max-w-[78dvh]">
            {error && <p role="alert" className="p-4 text-red-700">{error}</p>}
            <canvas ref={canvas} className={error ? 'hidden' : 'w-full! h-auto! aspect-square'} aria-label={label} role="img" />
        </div>
    );
}

function ReceivedFile({ file, index, parts, onDownload }: { file: Manifest['files'][number]; index: number; parts: Map<string, string>; onDownload: () => void }) {
    const [page, setPage] = useState(0);
    const total = Math.ceil(file.size / CHUNK);
    let count = 0;
    for (const id of parts.keys()) {
        if (id.startsWith(`${index}:`)) count++;
    }
    const pageSize = 512;
    const start = page * pageSize;
    return (
        <article className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="font-bold break-all">{file.name}</h3>
                    <p className="text-sm text-gray-600">
                        {file.size.toLocaleString()}
                        {' '}
                        bytes ·
                        {' '}
                        {count.toLocaleString()}
                        {' '}
                        of
                        {' '}
                        {total.toLocaleString()}
                        {' '}
                        parts received.
                    </p>
                </div>
                <button className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed" disabled={count !== total} onClick={onDownload}>Download file</button>
            </div>
            {total === 0
                ? <p className="text-green-700">Empty file. Ready to download.</p>
                : (
                        <>
                            <div className="flex flex-wrap gap-1" role="img" aria-label={`${file.name}: ${count} of ${total} parts received. Green means received; red means missing.`}>
                                {Array.from({ length: Math.min(pageSize, total - start) }, (_, offset) => {
                                    const part = start + offset;
                                    const received = parts.has(`${index}:${part}`);
                                    return <span key={part} className={`h-3 w-3 rounded-sm ${received ? 'bg-green-600' : 'bg-red-500'}`} title={`Part ${part + 1}: ${received ? 'Received' : 'Missing'}.`} />;
                                })}
                            </div>
                            {total > pageSize && (
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <button className="btn-secondary disabled:opacity-50" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous parts</button>
                                    <span>
                                        Parts
                                        {start + 1}
                                        –
                                        {Math.min(start + pageSize, total)}
                                        {' '}
                                        of
                                        {total.toLocaleString()}
                                        .
                                    </span>
                                    <button className="btn-secondary disabled:opacity-50" disabled={start + pageSize >= total} onClick={() => setPage(p => p + 1)}>Next parts</button>
                                </div>
                            )}
                        </>
                    )}
        </article>
    );
}

export default function FileTransfer() {
    const [mode, setMode] = useState<'send' | 'receive' | null>(null);
    const [sender, setSender] = useState<SenderSession | null>(null);
    const [receiver, setReceiver] = useState(() => new ReceiverSession());
    const { manifest, parts, pending } = receiver.reception;
    const [revision, setRevision] = useState(0);
    const [shown, setShown] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [camera, setCamera] = useState('environment');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [keepAwake, setKeepAwake] = useState(true);
    const [wakeStatus, setWakeStatus] = useState<WakeStatus>('requesting');
    const wakeActive = mode === 'receive' || (mode === 'send' && sender !== null);
    useEffect(() => {
        if (!wakeActive || !keepAwake) return;
        return keepScreenAwake({ page: document, wakeLock: navigator.wakeLock }, setWakeStatus);
    }, [wakeActive, keepAwake]);
    const [feedback, setFeedback] = useState(initialFeedback);
    const [cameraStatus, setCameraStatus] = useState('Camera is off.');
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    const video = useRef<HTMLVideoElement>(null);
    const handler = useRef<(result: QrScanner.ScanResult) => void>(() => {});
    useEffect(() => {
        handler.current = (scan) => {
            const at = Date.now();
            const result = mode === 'send'
                ? sender?.read(scan.data, at)
                : mode === 'receive' ? receiver.read(scan.data, at, qrObservation(scan)) : null;
            if (result) {
                setFeedback(old => recordScan(old, result.outcome, result.message, at));
                setRevision(n => n + 1);
            }
        };
    });
    const delay = mode === 'send' ? sender?.profile.intervalMs ?? 1000 : 1000;
    useEffect(() => {
        const session = mode === 'send' ? sender : mode === 'receive' ? receiver : null;
        if (!session) return;
        const advance = () => {
            setShown(sessionFrame(session, Date.now()));
            setRevision(n => n + 1);
        };
        const initial = setTimeout(advance, 0);
        const stop = startRotation(advance, delay);
        return () => {
            clearTimeout(initial);
            stop();
        };
    }, [mode, sender, receiver, delay]);
    useEffect(() => {
        if (!scanning || !video.current) return;
        const scanner = new QrScanner(video.current, result => handler.current(result), {
            preferredCamera: camera,
            returnDetailedScanResult: true,
            maxScansPerSecond: 12,
            calculateScanRegion: cameraScanRegion,
        });
        let active = true;
        setCameraStatus('Starting camera. Allow camera access when prompted.');
        void scanner.start().then(() => {
            if (active) setCameraStatus('Camera is scanning for QR codes.');
        }).catch((e) => {
            if (active) {
                setError(String(e));
                setCameraStatus('Camera could not start. Check camera permission and try again.');
                setScanning(false);
            }
        });
        return () => {
            active = false;
            scanner.destroy();
        };
    }, [scanning, camera]);
    const total = manifest?.files.reduce((sum, f) => sum + Math.ceil(f.size / CHUNK), 0);
    const finished = manifest !== null && parts.size === total;
    const sending = mode === 'send' && sender !== null;
    const senderManifest = sender?.manifest;
    const packetCount = sender?.data.length ?? 0;
    const confirmedParts = sender?.confirmedParts ?? 0;
    const measurements = receiver.measurements.report(now);

    function reset() {
        setScanning(false);
        setSender(null);
        setReceiver(new ReceiverSession());
        setShown(null);
        setRevision(0);
        setError('');
        setFeedback(initialFeedback);
        setCameraStatus('Camera is off.');
    }
    function download(index: number) {
        if (!manifest) return;
        const url = URL.createObjectURL(receiver.download(index));
        const a = document.createElement('a');
        a.href = url;
        a.download = manifest.files[index].name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    const cameraPanel = (
        <section className="space-y-4">
            <h2 className="text-xl font-bold">{mode === 'send' ? 'Scan receiver feedback' : 'Scan sender codes'}</h2>
            <div className="flex flex-wrap items-center gap-4">
                <button
                    className="btn-primary"
                    onClick={() => {
                        setError('');
                        setCameraStatus(scanning ? 'Camera is off.' : 'Starting camera.');
                        setScanning(!scanning);
                    }}
                >
                    {scanning ? 'Stop camera' : 'Start camera'}
                </button>
                <label className="flex items-center gap-2">
                    Camera.
                    <select className="rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-primary" value={camera} onChange={e => setCamera(e.target.value)}>
                        <option value="environment">Rear camera</option>
                        <option value="user">Front camera</option>
                    </select>
                </label>
            </div>
            <div className="rounded-lg bg-gray-100 overflow-hidden">
                {scanning ? <video ref={video} muted playsInline className="w-full max-h-64 object-contain" /> : <p className="p-8 text-center text-gray-600">{mode === 'send' ? 'Start the camera to remove confirmed parts from the sequence.' : 'Start the camera and point it at the sender’s QR code.'}</p>}
            </div>
            <p role="status" aria-live="polite">{cameraStatus}</p>
            <p className="text-sm text-gray-600">{feedback.message}</p>
            <dl className="grid grid-cols-3 gap-4 text-sm">
                <div>
                    <dt>QR reads</dt>
                    <dd className="text-xl font-bold">{feedback.reads}</dd>
                </div>
                <div>
                    <dt>Repeated</dt>
                    <dd className="text-xl font-bold">{feedback.duplicates}</dd>
                </div>
                <div>
                    <dt>Ignored</dt>
                    <dd className="text-xl font-bold">{feedback.ignored}</dd>
                </div>
            </dl>
            <p className="text-sm text-gray-600">{feedback.lastRead === null ? 'No QR code has been decoded yet.' : `Last QR read ${Math.max(0, Math.floor((now - feedback.lastRead) / 1000))} seconds ago.`}</p>
            {scanning && (feedback.lastRead === null || now - feedback.lastRead > 5000) && <p className="rounded border border-orange-300 bg-orange-50 p-4 text-orange-900">Waiting for a readable QR code. Fit the whole code in view, reduce glare, and adjust the distance until it is sharp.</p>}
            {scanning && feedback.lastProgress !== null && now - feedback.lastProgress > 10000 && <p className="rounded border border-orange-300 bg-orange-50 p-4 text-orange-900">No new parts or confirmations in the last 10 seconds. Keep scanning for missing parts.</p>}
        </section>
    );

    return (
        <ToolPage title="File Transfer">
            <div className="w-full space-y-6">
                <ToolDescription>Transfer small files locally using animated QR codes. Choose a role on each device to get started. Files stay in browser memory and never travel through a server.</ToolDescription>
                {mode === null
                    ? (
                            <section className="space-y-6">
                                <h2 className="text-2xl font-bold">Are you sending or receiving?</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(['send', 'receive'] as const).map(role => (
                                        <button key={role} className="card flex min-h-56 flex-col items-start justify-center gap-4 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMode(role)}>
                                            {role === 'send' ? <FiUpload className="text-primary text-4xl" aria-hidden="true" /> : <FiDownload className="text-primary text-4xl" aria-hidden="true" />}
                                            <span className="text-2xl font-bold">{role === 'send' ? 'Send files' : 'Receive files'}</span>
                                            <span className="text-gray-600">{role === 'send' ? 'Choose files on this device, then show QR codes to the receiver.' : 'Scan the sender’s QR codes and download the received files.'}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-gray-600">Keep both screens bright and steady. Camera access requires HTTPS or localhost.</p>
                            </section>
                        )
                    : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <button
                                        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                                        disabled={busy}
                                        onClick={() => {
                                            reset();
                                            setMode(null);
                                        }}
                                    >
                                        <FiArrowLeft aria-hidden="true" />
                                        Start over
                                    </button>
                                    <p className="font-medium">{mode === 'receive' ? 'Receive files' : sending ? 'Send files · 2. Show QR codes' : 'Send files · 1. Choose files'}</p>
                                </div>
                                {wakeActive && (
                                    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                                        <label className="flex items-center gap-2 font-medium">
                                            <input type="checkbox" className="h-4 w-4 accent-primary" checked={keepAwake} onChange={e => setKeepAwake(e.target.checked)} />
                                            Keep screen awake.
                                        </label>
                                        <p role="status">
                                            {!keepAwake
                                                ? 'Normal screen timeout is enabled.'
                                                : wakeStatus === 'active'
                                                    ? 'Keeping the screen awake while this page is visible.'
                                                    : wakeStatus === 'requesting'
                                                        ? 'Requesting screen wake lock.'
                                                        : wakeStatus === 'released'
                                                            ? 'Screen wake lock was released. Toggle this option to try again.'
                                                            : 'Automatic screen wake lock is unavailable. Your device may still dim the screen.'}
                                        </p>
                                    </div>
                                )}
                                {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>}
                                {mode === 'send' && !sending && (
                                    <section className="space-y-4">
                                        <h2 className="text-2xl font-bold">Choose the files to send</h2>
                                        <p className="text-gray-600">The next screen will show a large QR code for the receiver to scan. Small files work best.</p>
                                        <label className="card flex min-h-56 flex-col items-center justify-center gap-4 border-dashed">
                                            <FiUpload className="text-4xl text-primary" aria-hidden="true" />
                                            <span className="font-medium">Select up to 100 files and 100 MiB total.</span>
                                            <input
                                                className="block max-w-full rounded p-2 file:mr-4 file:rounded file:border-0 file:bg-gray-200 file:px-4 file:py-2 hover:file:bg-gray-300"
                                                type="file"
                                                multiple
                                                disabled={busy}
                                                onChange={async (e) => {
                                                    const files = [...(e.target.files || [])];
                                                    e.target.value = '';
                                                    if (!files.length) return;
                                                    reset();
                                                    setBusy(true);
                                                    try {
                                                        setSender(new SenderSession(await prepare(files)));
                                                    }
                                                    catch (e) { setError(String(e)); }
                                                    finally { setBusy(false); }
                                                }}
                                            />
                                        </label>
                                        {busy && <p role="status">Preparing QR codes.</p>}
                                    </section>
                                )}
                                {sending && (
                                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
                                        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                                            <h2 className="text-xl font-bold">Scan this code on the receiving device</h2>
                                            {shown && <Display value={shown} label="Sending file QR code" />}
                                        </section>
                                        <aside className="card space-y-6 min-w-0">
                                            <div className="space-y-4">
                                                <h2 className="text-xl font-bold">Sending progress</h2>
                                                {sender && <TransferSpeed progress={sender.progress(now)} direction="send" />}
                                                <p className="text-2xl font-bold">
                                                    {confirmedParts.toLocaleString()}
                                                    {' '}
                                                    /
                                                    {' '}
                                                    {packetCount.toLocaleString()}
                                                </p>
                                                <p className="text-gray-600">File parts confirmed by the receiver.</p>
                                                {packetCount > 0 && <progress className="w-full accent-primary" aria-label="Confirmed file parts" value={confirmedParts} max={packetCount} />}
                                                <p>
                                                    {senderManifest?.files.length}
                                                    {' '}
                                                    files ·
                                                    {' '}
                                                    {senderManifest?.files.reduce((sum, f) => sum + f.size, 0).toLocaleString()}
                                                    {' '}
                                                    bytes.
                                                </p>
                                                <p className="text-sm text-gray-600">{`QR display time: ${delay} ms. File metadata repeats automatically.`}</p>
                                                <p className="text-sm text-gray-600">{`${sender?.profile.packetsPerFrame} packets per QR · ${CHUNK} bytes per file packet.`}</p>
                                                <p className="text-sm text-gray-600">{sender?.negotiated ? 'Two-way adaptation is active.' : 'Waiting for receiver measurements. Conservative defaults are used.'}</p>
                                                {confirmedParts === packetCount && packetCount > 0 && <p role="status" className="text-green-700">All file parts are confirmed. Download the files on the receiver.</p>}
                                            </div>
                                            {cameraPanel}
                                            <p className="text-sm text-gray-600">Point this camera at the receiver’s feedback QR code. Confirmed parts leave the sequence. Receiver measurements tune QR capacity and speed. Without feedback, small codes repeat at one-second intervals.</p>
                                        </aside>
                                    </div>
                                )}
                                {mode === 'receive' && (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start" data-revision={revision}>
                                        <section className="card min-w-0 space-y-6">
                                            <div className="space-y-4">
                                                <h2 className="text-xl font-bold">Receiving progress</h2>
                                                <TransferSpeed progress={receiver.progress(now)} direction="receive" />
                                                <p role="status" aria-live="polite" className={`font-medium ${finished ? 'text-green-700' : ''}`}>
                                                    {finished ? 'Transfer complete. All files are ready to download.' : manifest ? `${parts.size.toLocaleString()} of ${total?.toLocaleString()} parts received.` : `${pending.size.toLocaleString()} parts collected. Total parts and file list are not known yet.`}
                                                </p>
                                                {!manifest && <p className="text-sm text-gray-600">Keep scanning. Parts are saved while waiting for file metadata.</p>}
                                                {measurements && (
                                                    <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
                                                        <p>{`Observed QR: ${measurements.frameKind} · ${measurements.encodedBytes} encoded bytes · up to ${measurements.packetsPerFrame} packets.`}</p>
                                                        <p>{`Size: ${measurements.qrModules} modules per side · about ${Math.round(measurements.codePixels)} camera pixels.`}</p>
                                                        <p>{measurements.elapsedMs > 0 ? `${((measurements.frames - 1) * 1000 / measurements.elapsedMs).toFixed(1)} distinct QR codes decoded per second.` : 'Measuring decode speed.'}</p>
                                                        <p>{`${measurements.frames} of ${measurements.sequenceSpan} frame sequences seen.`}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {cameraPanel}
                                            <div className="space-y-4">
                                                <h2 className="text-xl font-bold">{manifest ? `Files (${manifest.files.length})` : 'Waiting for the file list'}</h2>
                                                {manifest && (
                                                    <p className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                        <span>
                                                            <span className="inline-block h-3 w-3 rounded-sm bg-green-600 mr-2" />
                                                            Received.
                                                        </span>
                                                        <span>
                                                            <span className="inline-block h-3 w-3 rounded-sm bg-red-500 mr-2" />
                                                            Missing.
                                                        </span>
                                                    </p>
                                                )}
                                                {manifest?.files.map((file, index) => <ReceivedFile key={index} file={file} index={index} parts={parts} onDownload={() => download(index)} />)}
                                            </div>
                                        </section>
                                        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 space-y-4 xl:sticky xl:top-6">
                                            <h2 className="text-xl font-bold flex items-center gap-2">
                                                Feedback QR code
                                                <FiArrowUpRight aria-hidden="true" />
                                            </h2>
                                            <p className="text-gray-600">Show this half of the screen to the sender’s camera. Received parts will be removed from its QR sequence.</p>
                                            {shown ? <Display value={shown} label="Received file parts feedback QR code" /> : <div className="aspect-square rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center p-8 text-center text-gray-600">The feedback QR code will appear after the first sender code is read.</div>}
                                            <p className="text-sm text-gray-600">Feedback reports received packets and camera performance automatically. Receiving also works without a feedback camera on the sender.</p>
                                        </section>
                                    </div>
                                )}
                            </>
                        )}
            </div>
        </ToolPage>
    );
}
