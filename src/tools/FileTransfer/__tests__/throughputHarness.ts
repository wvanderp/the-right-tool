import QRCode from 'qrcode';
import { prepare } from '../protocol.ts';
import { encodeFrame } from '../framing.ts';
import { ReceiverSession, SenderSession } from '../session.ts';

export const THROUGHPUT_SCENARIOS = [
    { name: 'Small QR, no feedback', size: 8192, minimum: 100, codeSize: 320, small: true, feedback: false },
    { name: 'Default QR, no feedback', size: 24576, minimum: 300, codeSize: 600, small: false, feedback: false },
    { name: 'Adaptive QR, with feedback', size: 65536, minimum: 1024, codeSize: 600, small: false, feedback: true },
];

// Virtual-time protocol test. Geometry is supplied to real negotiation logic;
// optical decoding of the same scenarios belongs in camera.browser.mjs.
export async function runThroughputScenario(scenario: typeof THROUGHPUT_SCENARIOS[number] & { conservative?: boolean; dropAfterPart?: number }) {
    let seed = 123456789;
    const original = Uint8Array.from({ length: scenario.size }, () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return seed & 255;
    });
    const sender = new SenderSession(await prepare([new File([original], 'binary.bin')]));
    const receiver = new ReceiverSession();
    if (scenario.conservative) sender.setConservative(true, 0);
    sender.expectFeedback(scenario.feedback, 0);
    let sendAt = 0;
    let replyAt = 0;
    let elapsedMs = 0;
    let ignoredReads = 0;
    let droppedFrames = 0;
    const deadline = scenario.size / scenario.minimum * 1000;
    while (Math.min(sendAt, scenario.feedback ? replyAt : Infinity) <= deadline) {
        if (!scenario.feedback || sendAt <= replyAt) {
            const frame = sender.nextFrame(sendAt);
            const raw = encodeFrame(frame);
            const modules = QRCode.create(raw, { errorCorrectionLevel: 'L' }).modules.size;
            const observation = { qrModules: modules, codePixels: scenario.codeSize * modules / (modules + 8) };
            const drop = !droppedFrames && scenario.dropAfterPart !== undefined
                && frame.packets.some(packet => packet.kind === 'data' && packet.part >= scenario.dropAfterPart!);
            if (drop) droppedFrames++;
            else if (receiver.read(raw, sendAt, observation).outcome === 'ignored') ignoredReads++;
            elapsedMs = sendAt + frame.profile.intervalMs;
            sendAt = elapsedMs;
        }
        else {
            const frame = receiver.nextFrame(replyAt);
            if (frame) sender.read(encodeFrame(frame), replyAt);
            elapsedMs = replyAt;
            replyAt += 1000;
        }
        if (receiver.progress(elapsedMs).bytes === scenario.size && (!scenario.feedback || sender.progress(elapsedMs).bytes === scenario.size)) break;
    }
    const receivedBytes = receiver.progress(elapsedMs).bytes;
    return {
        original, receivedBytes, confirmedBytes: sender.progress(elapsedMs).bytes, elapsedMs, ignoredReads, droppedFrames,
        reconstructed: receivedBytes === scenario.size ? new Uint8Array(await receiver.download(0).arrayBuffer()) : null,
        bytesPerSecond: scenario.size / (elapsedMs / 1000),
        qrAreaFraction: scenario.codeSize ** 2 / (1280 * 720),
    };
}
