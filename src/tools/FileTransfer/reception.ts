import { accept, key, type Manifest, type Packet } from './protocol.ts';

export function createReception() {
    return {
        id: null as string | null,
        manifest: null as Manifest | null,
        parts: new Map<string, string>(),
        pending: new Map<string, Extract<Packet, { kind: 'data' }>>(),
    };
}

type Result = { outcome: 'progress' | 'duplicate' | 'ignored'; message: string };

export function receive(state: ReturnType<typeof createReception>, packet: Packet): Result {
    if (packet.kind === 'ack')
        return { outcome: 'ignored', message: 'Read a confirmation. Point the camera at the sender’s QR code.' };
    if (state.id && state.id !== packet.id)
        return { outcome: 'ignored', message: 'Read a code for another transfer. Start over to receive it.' };
    if (packet.kind === 'data') {
        try {
            atob(packet.data);
        }
        catch {
            return { outcome: 'ignored', message: 'Read an invalid file part. Waiting for the next code.' };
        }
    }
    state.id = packet.id;
    if (packet.kind === 'manifest') {
        if (state.manifest)
            return { outcome: 'duplicate', message: 'Read the repeated file list. Waiting for more file parts.' };
        state.manifest = { id: packet.id, files: packet.files };
        for (const part of state.pending.values())
            accept(state.manifest, state.parts, part);
        state.pending.clear();
        return { outcome: 'progress', message: `File list received: ${packet.files.length} files.` };
    }
    if (!state.manifest) {
        const duplicate = state.pending.has(key(packet));
        state.pending.set(key(packet), packet);
        return { outcome: duplicate ? 'duplicate' : 'progress', message: duplicate ? 'Read a part already collected. Still waiting for the file list.' : 'Collected a file part. The total will appear when metadata arrives.' };
    }
    const duplicate = state.parts.has(key(packet));
    const before = state.parts.size;
    accept(state.manifest, state.parts, packet);
    return state.parts.size > before
        ? { outcome: 'progress', message: `Received part ${packet.part + 1} of ${state.manifest.files[packet.file].name}.` }
        : { outcome: duplicate ? 'duplicate' : 'ignored', message: duplicate ? 'Read a part already received. The camera is working.' : 'Read an invalid file part. Waiting for the next code.' };
}
