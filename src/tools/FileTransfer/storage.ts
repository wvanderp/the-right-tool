export const MEMORY_LIMIT = 100 * 1024 * 1024;
export interface FileInfo { id: number; name: string; size: number }
export interface Sink {
    write(data: Uint8Array): Promise<void>;
    close(): Promise<Blob | void>;
    abort(): Promise<void>;
}
interface SaveHandle { createWritable(): Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }
type SaveWindow = Window & { showSaveFilePicker?: (options: { suggestedName: string }) => Promise<SaveHandle> };
export function canStreamToDisk(): boolean { return typeof (window as SaveWindow).showSaveFilePicker === 'function'; }
export function safeName(name: string): string {
    return Array.from(name, char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '/' || char === '\\' ? '_' : char).join('').slice(0, 255) || 'Download';
}
export async function createSink(file: FileInfo, disk: boolean): Promise<Sink> {
    if (disk) {
        // Must be the first asynchronous operation after the user's click.
        const handle = await (window as SaveWindow).showSaveFilePicker!({ suggestedName: safeName(file.name) });
        const stream = await handle.createWritable();
        return { write: data => stream.write(data), close: () => stream.close(), abort: () => stream.abort() };
    }
    if (file.size > MEMORY_LIMIT) throw new Error('This browser can receive files up to 100 MiB. Use desktop Chrome or Edge for larger files.');
    let chunks: ArrayBuffer[] = [];
    let length = 0;
    return {
        async write(data) {
            if (length + data.length > file.size || length + data.length > MEMORY_LIMIT) throw new Error('Download exceeds its memory limit.');
            chunks.push(new Uint8Array(data).buffer);
            length += data.length;
        },
        async close() { const blob = new Blob(chunks, { type: 'application/octet-stream' }); chunks = []; return blob; },
        async abort() { chunks = []; length = 0; },
    };
}
