import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { rotationDelay, startRotation } from './rotation';
import QrScanner from 'qr-scanner';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import { accept, ACK_BATCH, assemble, CHUNK, complete, decode, encode, key, prepare, type Manifest, type Packet } from './protocol';
function Display({ value }: { value: string }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 useEffect(() => { if (canvas.current) void QRCode.toCanvas(canvas.current, value, { width: 480, margin: 4, errorCorrectionLevel: 'L' }); }, [value]);
 return <canvas ref={canvas} className="w-full max-w-lg" aria-label="Transfer QR code" />;
}
export default function FileTransfer() {
 const [mode, setMode] = useState('send');
 const [packets, setPackets] = useState<Packet[]>([]);
 const [acks, setAcks] = useState<Set<string>>(new Set());
 const [manifest, setManifest] = useState<Manifest | null>(null);
 const [parts] = useState(() => new Map<string, string>());
 const [revision, setRevision] = useState(0);
 const [tick, setTick] = useState(0);
 const [scanning, setScanning] = useState(false);
 const [camera, setCamera] = useState('environment');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const video = useRef<HTMLVideoElement>(null);
 const handler = useRef<(raw: string) => void>(() => {});
 useEffect(() => { handler.current = raw => {
 try {
 const p = decode(raw);
 if (mode === 'send') {
 if (p.kind === 'ack' && p.id === packets[0]?.id) setAcks(old => new Set([...old, ...p.keys]));
 } else if (p.kind === 'manifest') {
 if (!manifest) { parts.clear(); setManifest({ id: p.id, files: p.files }); }
 } else if (manifest) { accept(manifest, parts, p); setRevision(n => n + 1); }
 } catch { /* Ignore unrelated or partially read QR codes. */ }
 }; });
 const delay = mode === 'send' ? rotationDelay(acks.size) : 1000;
 useEffect(() => startRotation(() => setTick(n => n + 1), delay), [delay]);
 useEffect(() => {
 if (!scanning || !video.current) return;
 const scanner = new QrScanner(video.current, result => handler.current(result.data), { preferredCamera: camera, returnDetailedScanResult: true, maxScansPerSecond: 12 });
 void scanner.start().catch(e => { setError(String(e)); setScanning(false); });
 return () => scanner.destroy();
 }, [scanning, camera]);
 const rotation = packets.filter(p => p.kind !== 'data' || !acks.has(key(p)));
 const keys = [...parts.keys()];
 const ack: Packet | null = manifest ? { v: 1, id: manifest.id, kind: 'ack', keys: keys.slice((tick % Math.max(1, Math.ceil(keys.length / ACK_BATCH))) * ACK_BATCH, (tick % Math.max(1, Math.ceil(keys.length / ACK_BATCH)) + 1) * ACK_BATCH) } : null;
 const shown = mode === 'send' ? (tick % 8 === 0 ? packets[0] : rotation[tick % rotation.length]) : ack;
 function reset() { setScanning(false); setPackets([]); setAcks(new Set()); setManifest(null); parts.clear(); setRevision(0); setError(''); }
 function download(index: number) {
 if (!manifest) return;
 const f = manifest.files[index]; const url = URL.createObjectURL(assemble(f, index, parts));
 const a = document.createElement('a'); a.href = url; a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
 }
 return <ToolPage title="File Transfer"><ToolDescription>Transfer files locally using animated QR codes. Scan the sender’s screen to receive; optionally scan the receiver’s confirmations to remove received parts from rotation. No files leave your devices through the network.</ToolDescription>
 <div className="flex flex-wrap gap-4 my-4">{['send', 'receive'].map(value => <button className={mode === value ? 'btn-primary' : 'btn-secondary'} key={value} onClick={() => { reset(); setMode(value); }}>{value === 'send' ? 'Send files' : 'Receive files'}</button>)}<button className="btn-secondary" onClick={reset}>Reset transfer</button></div>
 <p>QR transfer is best for small files. Keep both screens bright and steady. Camera access requires HTTPS or localhost.</p>
 {mode === 'send' && <label className="card block my-4 border-dashed">Choose files (up to 100 files and 100 MiB total).<input className="block mt-4" type="file" multiple disabled={busy} onChange={async e => { const files = [...(e.target.files || [])]; reset(); if (files.length > 100 || files.reduce((n, f) => n + f.size, 0) > 100 * 1024 * 1024) { setError('Choose at most 100 files and 100 MiB total.'); return; } setBusy(true); try { setPackets(await prepare(files)); } catch (e) { setError(String(e)); } finally { setBusy(false); } }} /></label>}
 {busy && <p role="status">Preparing QR codes.</p>}{error && <p role="alert">{error}</p>}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><section className="card">{shown && <Display value={encode(shown)} />}{mode === 'send' && packets.length > 0 && <p>{acks.size} of {packets.length - 1} parts confirmed. QR display time: {delay} ms. Metadata repeats throughout the transfer.</p>}{mode === 'receive' && <p>Point this confirmation QR at the sender’s camera for faster transfers. One-way reception also works.</p>}</section>
 <section className="card"><button className="btn-primary" onClick={() => setScanning(!scanning)}>{scanning ? 'Stop camera' : 'Start camera'}</button><label className="block my-4">Camera.<select className="ml-4" value={camera} onChange={e => setCamera(e.target.value)}><option value="environment">Rear camera</option><option value="user">Front camera</option></select></label>{scanning && <video ref={video} muted playsInline className="w-full" />}</section></div>
 {manifest && <section className="card mt-4" aria-live="polite" data-revision={revision}><h2>Receiving files</h2>{manifest.files.map((f, i) => { const count = keys.filter(k => k.startsWith(`${i}:`)).length; return <div key={i} className="my-4"><p>{f.name} · {f.size} bytes · {count}/{Math.ceil(f.size / CHUNK)} parts.</p><progress className="w-full accent-primary" value={count} max={Math.max(1, Math.ceil(f.size / CHUNK))} /><button className="btn-secondary" disabled={!complete(f, i, parts)} onClick={() => download(i)}>Download file</button></div>; })}</section>}
 </ToolPage>;
}




