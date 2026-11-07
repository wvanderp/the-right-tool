import { useEffect, useRef, useState } from 'react';
import { SignalAssembler, type Signal } from './signaling';

export function QrDisplay({ frames }: { frames: string[] }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const frame = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        let observer: ResizeObserver | undefined;
        const fail = () => { if (active) setError('Could not draw the QR code. Use connection text instead.'); };
        void import('qrcode').then(qr => {
            if (!active || !canvas.current || !frame.current) return;
            const target = canvas.current;
            const container = frame.current;
            const text = frames[index % frames.length];
            const modules = qr.create(text, { errorCorrectionLevel: 'M' }).modules.size + 8;
            let lastScale = 0;
            const draw = () => {
                if (!active || !container.clientWidth) return;
                const scale = Math.max(1, Math.floor(Math.min(480, container.clientWidth) / modules));
                if (scale === lastScale) return;
                lastScale = scale;
                // Keep both the raster and its CSS size at whole pixels per module.
                void qr.toCanvas(target, text, { errorCorrectionLevel: 'M', scale, margin: 4 }).then(() => {
                    if (active) { target.style.imageRendering = 'pixelated'; setError(''); }
                }).catch(fail);
            };
            observer = new ResizeObserver(draw);
            observer.observe(container);
            draw();
        }).catch(fail);
        return () => { active = false; observer?.disconnect(); };
    }, [frames, index]);
    useEffect(() => {
        if (paused || frames.length < 2) return;
        const timer = setInterval(() => setIndex(i => (i + 1) % frames.length), 750);
        return () => clearInterval(timer);
    }, [frames.length, paused]);
    return <div className="space-y-4">
        <div ref={frame} className="mx-auto flex aspect-square w-full max-w-[480px] items-center justify-center bg-white">
            <canvas ref={canvas} aria-label={`Connection QR frame ${index % frames.length + 1} of ${frames.length}`} className="block max-w-full h-auto" />
        </div>
        {error && <p role="alert">{error}</p>}
        <p className="text-center">QR frame {index % frames.length + 1} of {frames.length}.</p>
        {frames.length > 1 && <div className="flex flex-wrap justify-center gap-2">
            <button className="btn-secondary" onClick={() => { setPaused(true); setIndex(i => (i + frames.length - 1) % frames.length); }}>Previous.</button>
            <button className="btn-secondary" onClick={() => setPaused(p => !p)}>{paused ? 'Play.' : 'Pause.'}</button>
            <button className="btn-secondary" onClick={() => { setPaused(true); setIndex(i => (i + 1) % frames.length); }}>Next.</button>
        </div>}
        <details><summary className="cursor-pointer">Connection text fallback.</summary>
            <label className="block mt-4">Copy all lines to the other device.
                <textarea className="w-full h-32 mt-2 font-mono text-xs" readOnly value={frames.join('\n')} onFocus={e => e.target.select()} />
            </label>
        </details>
    </div>;
}

export function QrReader({ onSignal }: { onSignal: (signal: Signal) => Promise<void> }) {
    const video = useRef<HTMLVideoElement>(null);
    const assembler = useRef(new SignalAssembler());
    const locked = useRef(false);
    const [camera, setCamera] = useState(false);
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    const [progress, setProgress] = useState({ received: 0, total: 0 });
    const callback = useRef(onSignal);
    useEffect(() => { callback.current = onSignal; }, [onSignal]);

    const consume = async (input: string) => {
        if (locked.current) return;
        locked.current = true;
        try {
            let signal: Signal | null = null;
            for (const line of input.trim().split(/\r?\n/).filter(Boolean)) {
                signal = await assembler.current.add(line);
                setProgress(assembler.current.progress);
            }
            setError('');
            if (signal) { setCamera(false); await callback.current(signal); }
        } catch (err) { setError(err instanceof Error ? err.message : 'Could not read connection information.'); }
        finally { locked.current = false; }
    };
    const consumer = useRef(consume);
    useEffect(() => { consumer.current = consume; });
    useEffect(() => {
        if (!camera || !video.current) return;
        let disposed = false;
        let scanner: import('qr-scanner').default | undefined;
        void import('qr-scanner').then(async ({ default: QrScanner }) => {
            if (disposed || !video.current) return;
            scanner = new QrScanner(video.current, result => { void consumer.current(result.data); }, {
                preferredCamera: 'environment',
                returnDetailedScanResult: true,
                maxScansPerSecond: 8,
                calculateScanRegion: video => {
                    const size = Math.round(Math.min(video.videoWidth, video.videoHeight) * 2 / 3);
                    // Keep available camera detail for dense signaling codes, with bounded decoding work.
                    const resolution = Math.min(size, 800);
                    return {
                        x: Math.round((video.videoWidth - size) / 2),
                        y: Math.round((video.videoHeight - size) / 2),
                        width: size,
                        height: size,
                        downScaledWidth: resolution,
                        downScaledHeight: resolution,
                    };
                },
            });
            await scanner.start();
            if (disposed) scanner.destroy();
        }).catch(err => {
            scanner?.destroy();
            if (!disposed) { setError(`Camera unavailable. Check HTTPS and camera permission. ${err instanceof Error ? err.message : ''}`); setCamera(false); }
        });
        return () => { disposed = true; scanner?.destroy(); };
    }, [camera]);
    return <div className="space-y-4">
        <button className="btn-secondary" onClick={() => setCamera(c => !c)}>{camera ? 'Stop camera.' : 'Scan with camera.'}</button>
        {camera && <video ref={video} muted playsInline className="w-full rounded-lg bg-gray-100" aria-label="QR scanner camera preview" />}
        <p role="status">{progress.total ? `Scanned ${progress.received} of ${progress.total} QR frames.` : 'Scan every frame shown on the other device.'}</p>
        <label className="block">Import a QR image.
            <input type="file" accept="image/*" className="block mt-2 w-full" onChange={e => {
                const file = e.target.files?.[0]; e.target.value = '';
                if (file) void import('qr-scanner').then(qr => qr.default.scanImage(file, { returnDetailedScanResult: true })).then(result => consume(result.data)).catch(() => setError('No readable QR code found in this image.'));
            }} />
        </label>
        <details><summary className="cursor-pointer">Paste connection text instead.</summary>
            <label className="block mt-4">Connection text from the other device.
                <textarea className="w-full h-32 mt-2 font-mono text-xs" maxLength={52000} value={text} onChange={e => setText(e.target.value)} />
            </label>
            <button className="btn-secondary mt-2" disabled={!text.trim()} onClick={() => void consume(text)}>Read connection text.</button>
        </details>
        <button className="btn-secondary" onClick={() => { if (!locked.current) { assembler.current = new SignalAssembler(); setProgress({ received: 0, total: 0 }); setError(''); } }}>Reset scanned frames.</button>
        {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>;
}
