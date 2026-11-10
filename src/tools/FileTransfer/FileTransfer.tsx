import { useEffect, useRef, useState } from 'react';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import { TransferConnection, type TransferFile } from './connection';
import { encodeSignal, type Signal } from './signaling';
import { canStreamToDisk, createSink, MEMORY_LIMIT, safeName, type FileInfo } from './storage';
import { QrDisplay, QrReader } from './QrPairing';

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
    return `${(bytes / 1024 ** unit).toFixed(1)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][unit]}`;
}
export default function FileTransfer() {
    const [files, setFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<'send' | 'receive'>(() => new URLSearchParams(window.location.search).get('mode') === 'receive' ? 'receive' : 'send');
    const [role, setRole] = useState<'send' | 'receive' | null>(() => new URLSearchParams(window.location.search).get('mode') === 'receive' ? 'receive' : null);
    const [frames, setFrames] = useState<string[]>([]);
    const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'receive' ? 'Scan the QR shown on the sending device.' : 'Choose files to send, or receive files from another device.');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [connected, setConnected] = useState(false);
    const [rows, setRows] = useState<TransferFile[]>([]);
    const [ready, setReady] = useState<FileInfo | null>(null);
    const [download, setDownload] = useState<{ file: FileInfo; url: string } | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const connection = useRef<TransferConnection | null>(null);
    const url = useRef<string | null>(null);
    const started = useRef(0);
    const generation = useRef(0);
    const pairing = useRef(false);
    const signalApplied = useRef(false);
    const supported = typeof RTCPeerConnection !== 'undefined' && window.isSecureContext;
    const disk = canStreamToDisk();

    useEffect(() => () => { generation.current++; connection.current?.close(); if (url.current) URL.revokeObjectURL(url.current); }, []);
    useEffect(() => {
        if (!connected) return;
        const timer = setInterval(() => { if (started.current) setElapsed((performance.now() - started.current) / 1000); }, 1000);
        return () => clearInterval(timer);
    }, [connected]);
    function reset() {
        generation.current++;
        pairing.current = false; signalApplied.current = false;
        connection.current?.close(); connection.current = null;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = null; started.current = 0;
        setRole(null); setFrames([]); setStatus('Choose files to send, or receive files from another device.');
        setError(''); setBusy(false); setConnected(false); setRows([]); setReady(null); setDownload(null); setElapsed(0);
    }
    function create(session: string, source: File[] | null) {
        const currentGeneration = generation.current;
        const active = () => generation.current === currentGeneration;
        const peer = new TransferConnection(session, source, {
            status: value => { if (active()) setStatus(value); },
            files: value => {
                if (!active()) return;
                if (!started.current && value.some(file => file.status === 'Sending' || file.status === 'Receiving')) started.current = performance.now();
                setRows(value);
            },
            ready: value => { if (active()) setReady(value); },
            connected: () => { if (active()) { setConnected(true); setFrames([]); setBusy(false); } },
            error: value => { if (active()) { setError(value); setStatus('Session ended. Start a new session to retry.'); setBusy(false); setReady(null); setFrames([]); } },
            download: (file, blob) => {
                if (!active()) return;
                if (url.current) URL.revokeObjectURL(url.current);
                url.current = URL.createObjectURL(blob);
                setDownload({ file, url: url.current });
            },
        });
        connection.current = peer;
        return peer;
    }
    async function startSending() {
        setError(''); setBusy(true); setRole('send');
        const token = generation.current;
        try {
            if (!files.length || files.length > 1000) throw new Error('Select between 1 and 1,000 files.');
            const peer = create(crypto.randomUUID(), files);
            const offer = await peer.offer();
            const codes = await encodeSignal(offer);
            if (token !== generation.current) return;
            setFrames(codes); setStatus('Open the receive page on the other device, then start both cameras. Keep each screen visible to the other device’s camera until connected.');
        } catch (err) { if (token === generation.current) { connection.current?.close(); setError(err instanceof Error ? err.message : 'Could not create transfer.'); } }
        finally { if (token === generation.current) setBusy(false); }
    }
    async function handleSignal(signal: Signal) {
        if (pairing.current || signalApplied.current || busy || connected) return;
        pairing.current = true;
        setError(''); setBusy(true);
        const token = generation.current;
        try {
            if (role === 'send') {
                if (!connection.current) throw new Error('Start a new session first.');
                await connection.current.applyAnswer(signal);
                if (token === generation.current) { signalApplied.current = true; setStatus('Connecting directly to the receiving device. Keep both screens and cameras facing each other.'); }
            } else {
                if (signal.type !== 'offer') throw new Error('Scan the sender’s offer, not a reply.');
                connection.current?.close();
                const peer = create(signal.session, null);
                const reply = await peer.answer(signal);
                const codes = await encodeSignal(reply);
                if (token !== generation.current) return;
                signalApplied.current = true;
                setFrames(codes); setStatus('Reply ready. Keep both screens visible to the other device’s camera. Pairing continues automatically.');
            }
        } catch (err) {
            if (token === generation.current) { connection.current?.close(); setError(err instanceof Error ? err.message : 'Pairing failed.'); }
        } finally { if (token === generation.current) { pairing.current = false; setBusy(false); } }
    }
    async function receiveFile() {
        if (!ready || busy || download) return;
        const peer = connection.current;
        if (!peer) return;
        setBusy(true); setError('');
        const token = generation.current;
        try {
            const sink = await createSink(ready, disk);
            if (token !== generation.current) { await sink.abort(); return; }
            await peer.accept(sink);
        } catch (err) { if (token === generation.current) setError(err instanceof Error ? err.message : 'Could not save this file.'); }
        finally { if (token === generation.current) setBusy(false); }
    }
    const total = rows.reduce((sum, file) => sum + file.size, 0);
    const received = rows.reduce((sum, file) => sum + file.bytes, 0);
    const resolved = rows.reduce((sum, file) => sum + (file.status === 'Skipped' ? file.size : file.bytes), 0);
    const speed = elapsed > 0 ? received / elapsed : 0;
    const finished = rows.length > 0 && rows.every(file => file.status === 'Complete' || file.status === 'Skipped');
    return <ToolPage title="File Transfer">
        <ToolDescription>Send files directly between two devices on the same local network. Pair by scanning each other’s QR codes. Transfers are encrypted, with no uploads, accounts, signaling service, STUN, or TURN.</ToolDescription>
        <div className="w-full space-y-6">
            {!supported && <p role="alert" className="border border-orange-200 rounded-lg p-4 bg-orange-50">Open this tool over HTTPS in a browser that supports WebRTC. Localhost is also supported for development.</p>}
            <p className="text-gray-600">Keep both devices awake and both tabs open. Guest Wi-Fi isolation, VPNs, and network permissions can prevent a direct connection.</p>
            {!role && <div className="space-y-6">
                <div role="group" aria-label="Transfer direction" className="flex flex-wrap gap-4">
                    <button className={mode === 'send' ? 'btn-primary' : 'btn-secondary'} aria-pressed={mode === 'send'} onClick={() => setMode('send')}>Send files.</button>
                    <button className={mode === 'receive' ? 'btn-primary' : 'btn-secondary'} aria-pressed={mode === 'receive'} onClick={() => setMode('receive')}>Receive files.</button>
                </div>
                {mode === 'send' ? <section className="card space-y-4" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files)); }}>
                    <h2 className="text-xl font-medium">1. Select files to send.</h2>
                    <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6">Choose files or drop them here.
                        <input type="file" multiple className="block w-full mt-4" onChange={e => setFiles(Array.from(e.target.files ?? []))} />
                    </label>
                    {files.length > 0 && <><p>{files.length} files · {formatBytes(files.reduce((sum, f) => sum + f.size, 0))}.</p>
                        <ul className="max-h-48 overflow-y-auto text-sm space-y-2">{files.map((file, i) => <li key={i} className="break-all">{file.name} · {formatBytes(file.size)}</li>)}</ul>
                        <button className="btn-primary" disabled={!supported || busy} onClick={() => void startSending()}>Create transfer.</button></>}
                </section> : <section className="card space-y-4">
                    <h2 className="text-xl font-medium">Receive files.</h2>
                    <p>Start the camera on both devices and face their screens toward each other’s cameras. Connection codes are exchanged automatically.</p>
                    <p>{disk ? 'This browser can stream large files to disk.' : 'This browser uses memory downloads, limited to 100 MiB per file. Use desktop Chrome or Edge for larger files.'}</p>
                    <button className="btn-primary" disabled={!supported} onClick={() => { setRole('receive'); setStatus('Scan the QR shown on the sending device.'); }}>Start receiving.</button>
                </section>}
            </div>}
            {role && <h2 className="text-xl font-medium">{role === 'send' ? 'Sending files.' : 'Receiving files.'}</h2>}
            {role && <div role="status" aria-live="polite" className="border border-gray-200 rounded-lg p-4 bg-gray-50">{status}</div>}
            {error && <p role="alert" className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-4">{error}</p>}
            {role && !connected && !error && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="card space-y-4"><h2 className="text-xl font-medium">{role === 'send' ? '2. Show this offer.' : '2. Show this reply.'}</h2>
                    {frames.length > 0 ? <QrDisplay frames={frames} receiveUrl={role === 'send' ? new URL('/file-transfer?mode=receive', window.location.origin).href : undefined} /> : <p>{role === 'send' ? 'Preparing connection codes.' : 'Your reply appears here automatically after scanning the offer. Keep the camera running.'}</p>}
                </section>
                <section className="card space-y-4"><h2 className="text-xl font-medium">{role === 'send' ? '3. Scan the receiver’s reply.' : '1. Scan the sender’s offer.'}</h2><QrReader onSignal={handleSignal} /></section>
            </div>}
            {busy && <p role="status">Preparing. If a save dialog is open, choose a destination or cancel it.</p>}
            {rows.length > 0 && <section className="card space-y-4">
                <h2 className="text-xl font-medium">Files.</h2>
                <progress className="w-full accent-primary" max={total || 1} value={finished ? total || 1 : resolved} aria-label="Overall transfer progress" />
                <p>{rows.filter(f => f.status === 'Complete').length} of {rows.length} files saved · {formatBytes(received)} transferred{speed > 0 && !finished ? ` · ${formatBytes(speed)}/s · About ${Math.ceil((total - resolved) / speed)} seconds remaining` : ''}.</p>
                <ul className="space-y-4">{rows.map(file => <li key={file.id} className="border-b border-gray-100 pb-4">
                    <p className="break-all font-medium">{file.name}</p><p className="text-sm text-gray-600">{file.status} · {formatBytes(file.bytes)} / {formatBytes(file.size)}.</p>
                    <progress className="w-full accent-primary" max={file.size || 1} value={file.status === 'Complete' ? file.size || 1 : file.bytes} aria-label={`Progress for ${file.name}`} />
                </li>)}</ul>
            </section>}
            {role === 'receive' && ready && <section className="card space-y-4">
                <h2 className="text-xl font-medium break-all">Save {ready.name}.</h2>
                <p>{formatBytes(ready.size)}. Files are received one at a time. Only accept files from the device you intended to pair with.</p>
                {!disk && ready.size > MEMORY_LIMIT && <p className="text-orange-800">This file exceeds this browser’s 100 MiB limit. Skip it or retry in desktop Chrome or Edge.</p>}
                <div className="flex flex-wrap gap-4"><button className="btn-primary" disabled={busy || !!download || (!disk && ready.size > MEMORY_LIMIT)} onClick={() => void receiveFile()}>{disk ? 'Choose destination and receive.' : 'Receive into memory.'}</button>
                    <button className="btn-secondary" disabled={busy || !!download} onClick={() => connection.current?.skip()}>Skip file.</button></div>
            </section>}
            {download && <section className="card space-y-4"><p className="break-all">Ready to download: {download.file.name}.</p>
                <a href={download.url} download={safeName(download.file.name)} className="btn-primary inline-block">Download file.</a>
                <p>After downloading, release this file to continue receiving. Releasing removes the in-browser copy.</p>
                <button className="btn-secondary" onClick={() => { if (url.current) URL.revokeObjectURL(url.current); url.current = null; setDownload(null); }}>Release downloaded file.</button>
            </section>}
            {role && <button className="btn-secondary" onClick={reset}>{finished ? 'Start a new session.' : 'Cancel and start over.'}</button>}
        </div>
    </ToolPage>;
}
