// Run the app first: pnpm run dev. Install a browser: pnpm exec playwright install chromium.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.FILE_TRANSFER_URL || 'http://127.0.0.1:5173';
const launchOptions = {
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    ...(process.env.FILE_TRANSFER_BROWSER ? { executablePath: process.env.FILE_TRANSFER_BROWSER } : {}),
};
const browser = await chromium.launch(launchOptions);
let diskContext;
const directory = await mkdtemp(join(tmpdir(), 'file-transfer-check-'));
const errors = [];
const artifacts = process.env.FILE_TRANSFER_ARTIFACTS;
if (artifacts) await mkdir(artifacts, { recursive: true });

async function installWebcamFeed(context, placement = { x: 160, y: 160, size: 400, width: 720, height: 720 }) {
    await context.addInitScript(placement => {
        // Exercise the bundled software decoder used by browsers without BarcodeDetector.
        delete window.BarcodeDetector;
        // Substitute only the camera hardware. The application still uses getUserMedia,
        // a real video MediaStream, its normal QR decoder, and normal SDP handling.
        const canvas = document.createElement('canvas');
        canvas.width = placement.width;
        canvas.height = placement.height;
        const ctx = canvas.getContext('2d');
        // Match the application's pixelated QR display instead of blurring modules on resize.
        ctx.imageSmoothingEnabled = false;
        let image = null;
        window.webcamTracks = [];
        window.webcamPaints = 0;
        const paint = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (image) ctx.drawImage(image, placement.x, placement.y, placement.size, placement.size);
            window.webcamPaints++;
            for (const track of window.webcamTracks) if (track.readyState === 'live') track.requestFrame();
        };
        paint();
        setInterval(paint, 100);
        window.setWebcamImage = async data => {
            const next = new Image();
            next.src = data;
            await next.decode();
            image = next;
            paint();
        };
        navigator.mediaDevices.getUserMedia = async constraints => {
            if (!constraints.video || constraints.audio) throw new Error('Unexpected media request.');
            const stream = canvas.captureStream(0);
            window.webcamTracks.push(...stream.getTracks());
            paint();
            return stream;
        };
    }, placement);
}

async function pair(context, sourceFiles, qrImages) {
    const sender = await context.newPage(), receiver = await context.newPage();
    for (const page of [sender, receiver]) page.on('pageerror', error => errors.push(error.message));
    await Promise.all([sender.goto(`${baseURL}/file-transfer`), receiver.goto(`${baseURL}/file-transfer?mode=receive`)]);
    await sender.locator('input[type=file]').setInputFiles(sourceFiles);
    await sender.getByRole('button', { name: 'Create transfer.', exact: true }).click();
    await receiver.getByRole('button', { name: 'Scan with camera.', exact: true }).waitFor();
    for (const [from, to] of [[sender, receiver], [receiver, sender]]) {
        if (qrImages === 'webcam-auto') {
            await from.locator('canvas').waitFor();
            await from.waitForFunction(() => document.querySelector('canvas')?.style.imageRendering === 'pixelated');
            await to.getByRole('button', { name: 'Scan with camera.', exact: true }).click();
            await to.bringToFront();
            await to.waitForFunction(() => document.querySelector('video')?.srcObject instanceof MediaStream);
            const deadline = Date.now() + 30000;
            while (await to.locator('video').count()) {
                if (Date.now() > deadline) throw new Error('Automatic webcam QR exchange timed out.');
                // Sample the displayed QR continuously, without pausing it or reading signaling text.
                const image = await from.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png'));
                await to.evaluate(image => window.setWebcamImage(image), image);
                await to.waitForTimeout(150);
            }
            continue;
        }
        if (qrImages) {
            await from.locator('canvas').waitFor();
            await from.waitForFunction(() => {
                const canvas = document.querySelector('canvas');
                return canvas?.width > 0 && canvas.style.imageRendering === 'pixelated';
            });
            const pause = from.getByRole('button', { name: 'Pause.', exact: true });
            if (await pause.count()) await pause.click();
            while (!(await from.getByText(/^QR frame 1 of \d+\.$/).count())) {
                await from.getByRole('button', { name: 'Previous.', exact: true }).click();
            }
            await from.waitForTimeout(150);
            const count = Number((await from.getByText(/^QR frame \d+ of \d+\.$/).innerText()).match(/of (\d+)/)[1]);
            const bounds = await from.locator('canvas').evaluate(canvas => {
                const rect = canvas.getBoundingClientRect(), parent = canvas.parentElement.getBoundingClientRect();
                return { right: rect.right, parentRight: parent.right, width: rect.width, pixels: canvas.width };
            });
            assert.ok(bounds.right <= bounds.parentRight + 1, 'QR must fit its panel.');
            assert.ok(Math.abs(bounds.width - bounds.pixels) < 1, 'QR must not be stretched by CSS.');
            if (qrImages === 'webcam') {
                await from.bringToFront();
                await from.waitForTimeout(500);
                await to.getByRole('button', { name: 'Scan with camera.', exact: true }).click();
                await to.waitForFunction(() => document.querySelector('video')?.srcObject instanceof MediaStream);
            }
            for (let i = 0; i < count; i++) {
                // Let the asynchronous QR renderer draw after a manual frame change.
                await from.waitForTimeout(150);
                if (qrImages === 'webcam') {
                    const image = await from.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png'));
                    await to.bringToFront();
                    await to.evaluate(image => window.setWebcamImage(image), image);
                } else {
                    const buffer = await from.locator('canvas').screenshot({ path: join(directory, 'qr.png') });
                    await to.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'frame.png', mimeType: 'image/png', buffer });
                }
                if (i < count - 1) {
                    const linkOffset = from === sender ? 1 : 0;
                    if (linkOffset && i === 0) {
                        await to.waitForTimeout(1000);
                        assert.equal(await to.locator('[role=alert]').count(), 0, 'The receive link must be ignored by the scanner.');
                        await to.getByText('Scan every frame shown on the other device.', { exact: true }).waitFor();
                    } else await to.getByText(`Scanned ${i + 1 - linkOffset} of ${count - linkOffset} QR frames.`, { exact: true }).waitFor().catch(async error => {
                        throw new Error(`${error.message} Scanner errors: ${(await to.locator('[role=alert]').allTextContents()).join(' ')}`);
                    });
                    if (qrImages === 'webcam' && i === 0 && artifacts) {
                        const direction = from === sender ? 'offer' : 'answer';
                        await to.screenshot({ path: join(artifacts, `webcam-${direction}.png`), fullPage: true });
                    }
                    const previous = await from.locator('canvas').evaluate(canvas => canvas.toDataURL());
                    await from.bringToFront();
                    await from.getByRole('button', { name: 'Next.', exact: true }).click();
                    await from.waitForFunction(previous => document.querySelector('canvas').toDataURL() !== previous, previous);
                } else if (qrImages === 'webcam') {
                    await to.locator('video').waitFor({ state: 'detached' }).catch(async error => {
                        console.log('Webcam diagnostics', await to.evaluate(() => ({ visibility: document.visibilityState, paints: window.webcamPaints, tracks: window.webcamTracks.map(t => t.readyState), paused: document.querySelector('video')?.paused, time: document.querySelector('video')?.currentTime })));
                        if (artifacts) await to.screenshot({ path: join(artifacts, 'webcam-failure.png'), fullPage: true });
                        throw new Error(`${error.message} Webcam status: ${(await to.locator('[role=status], [role=alert]').allTextContents()).join(' ')}`);
                    });
                }
            }
        } else {
            await from.getByText('Connection text fallback.', { exact: true }).click();
            const text = await from.locator('textarea[readonly]').inputValue();
            await to.getByText('Paste connection text instead.', { exact: true }).click();
            await to.locator('textarea:not([readonly])').fill(text);
            await to.getByRole('button', { name: 'Read connection text.', exact: true }).click();
        }
    }
    return { sender, receiver };
}
async function makeContext(disk) {
    // Private profiles can keep OPFS data in memory. Use a normal temporary profile for disk stress tests.
    const context = disk
        ? await chromium.launchPersistentContext(join(directory, 'profile'), { ...launchOptions, acceptDownloads: true })
        : await browser.newContext({ acceptDownloads: true });
    await context.addInitScript(useDisk => {
        // Use a real browser-managed file stream without automating OS save dialogs.
        Object.defineProperty(window, 'showSaveFilePicker', {
            configurable: true,
            value: useDisk ? async () => (await navigator.storage.getDirectory()).getFileHandle('received.bin', { create: true }) : undefined,
        });
        window.transferStats = { sent: 0, acked: 0, maxOutstanding: 0 };
        const nativeSend = RTCDataChannel.prototype.send;
        RTCDataChannel.prototype.send = function (data) {
            if (data instanceof ArrayBuffer) {
                const stats = window.transferStats;
                stats.sent += data.byteLength - 12;
                stats.maxOutstanding = Math.max(stats.maxOutstanding, stats.sent - stats.acked);
            }
            return nativeSend.call(this, data);
        };
        const nativeCreate = RTCPeerConnection.prototype.createDataChannel;
        RTCPeerConnection.prototype.createDataChannel = function (...args) {
            if ((this.getConfiguration().iceServers || []).length) throw new Error('Unexpected ICE service configuration.');
            const channel = nativeCreate.apply(this, args);
            channel.addEventListener('message', event => {
                if (typeof event.data === 'string') {
                    const message = JSON.parse(event.data);
                    if (message.type === 'ack') window.transferStats.acked = message.bytes;
                }
            });
            return channel;
        };
    }, disk);
    context.on('request', request => {
        if (request.method() !== 'GET' && request.method() !== 'HEAD') errors.push(`Unexpected HTTP request: ${request.method()} ${request.url()}`);
    });
    return context;
}
async function hash(path) {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(path)) digest.update(chunk);
    return digest.digest('hex');
}
try {
    const context = await makeContext(false);
    const cameraPage = await context.newPage();
    await cameraPage.goto(`${baseURL}/file-transfer`);
    assert.equal(await cameraPage.getByRole('button', { name: 'Start receiving.', exact: true }).count(), 0);
    await cameraPage.getByRole('button', { name: 'Receive files.', exact: true }).click();
    assert.equal(await cameraPage.locator('input[type=file]').count(), 0);
    await cameraPage.getByRole('button', { name: 'Start receiving.', exact: true }).click();
    for (const cancelSession of [false, true]) {
        await cameraPage.getByRole('button', { name: 'Scan with camera.', exact: true }).click();
        await cameraPage.waitForFunction(() => {
            const stream = document.querySelector('video')?.srcObject;
            if (!(stream instanceof MediaStream) || !stream.active) return false;
            if (stream.getAudioTracks().length) throw new Error('Unexpected microphone access.');
            window.cameraTracks = stream.getTracks();
            return true;
        });
        await cameraPage.getByRole('button', { name: cancelSession ? 'Cancel and start over.' : 'Stop camera.', exact: true }).click();
        await cameraPage.waitForFunction(() => window.cameraTracks.every(track => track.readyState === 'ended'));
    }
    await cameraPage.close();
    const content = Buffer.alloc(2 * 1024 * 1024 + 17);
    for (let i = 0; i < content.length; i++) content[i] = i % 251;
    const { sender, receiver } = await pair(context, [
        { name: '日本語.bin', mimeType: 'application/octet-stream', buffer: content },
        { name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) },
    ], true);
    for (const expected of [content, Buffer.alloc(0)]) {
        await receiver.getByRole('button', { name: 'Receive into memory.', exact: true }).click();
        const link = receiver.getByRole('link', { name: 'Download file.', exact: true });
        await link.waitFor();
        const [download] = await Promise.all([receiver.waitForEvent('download'), link.click()]);
        assert.deepEqual(await readFile(await download.path()), expected);
        await receiver.getByRole('button', { name: 'Release downloaded file.', exact: true }).click();
    }
    await sender.getByText('Transfer finished. Start a new session to send more files.', { exact: true }).waitFor();
    assert.ok((await sender.evaluate(() => window.transferStats)).maxOutstanding <= 1024 * 1024);
    await receiver.setViewportSize({ width: 390, height: 844 });
    await receiver.reload();
    await receiver.getByRole('heading', { name: 'File Transfer', exact: true }).waitFor();
    assert.equal(await receiver.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
    console.log('Passed: real QR image pairing, WebRTC, exact multiple/empty downloads, bounded queue, camera cleanup, and mobile width.');

    const webcamContext = await makeContext(false);
    // A QR can fit entirely in the preview while extending beyond the old invisible
    // central two-thirds crop. Keep it paused to isolate framing from animation.
    await installWebcamFeed(webcamContext, { x: 60, y: 60, size: 600, width: 720, height: 720 });
    const webcam = await pair(webcamContext, [
        { name: 'webcam-proof.bin', mimeType: 'application/octet-stream', buffer: content },
        { name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) },
    ], 'webcam');
    for (const page of [webcam.sender, webcam.receiver]) {
        await page.waitForFunction(() => window.webcamTracks.length > 0 && window.webcamTracks.every(track => track.readyState === 'ended'));
    }
    for (const expected of [content, Buffer.alloc(0)]) {
        await webcam.receiver.getByRole('button', { name: 'Receive into memory.', exact: true }).click();
        const link = webcam.receiver.getByRole('link', { name: 'Download file.', exact: true });
        await link.waitFor();
        const [download] = await Promise.all([webcam.receiver.waitForEvent('download'), link.click()]);
        const actual = await readFile(await download.path());
        assert.deepEqual(actual, expected);
        console.log(`Webcam transfer: ${actual.length} bytes, SHA-256 ${createHash('sha256').update(actual).digest('hex')}.`);
        await webcam.receiver.getByRole('button', { name: 'Release downloaded file.', exact: true }).click();
    }
    await webcam.sender.getByText('Transfer finished. Start a new session to send more files.', { exact: true }).waitFor();
    if (artifacts) {
        await webcam.sender.screenshot({ path: join(artifacts, 'webcam-sender-complete.png'), fullPage: true });
        await webcam.receiver.screenshot({ path: join(artifacts, 'webcam-receiver-complete.png'), fullPage: true });
    }
    assert.ok((await webcam.sender.evaluate(() => window.transferStats)).maxOutstanding <= 1024 * 1024);
    await webcamContext.close();
    console.log('Passed: offer AND answer decoded through live simulated webcam video; exact multi-file transfer and automatic camera shutdown.');

    const autoContext = await makeContext(false);
    // Also cover an off-center code in a portrait preview, as on a phone.
    await installWebcamFeed(autoContext, { x: 20, y: 280, size: 400, width: 720, height: 960 });
    const autoContent = Buffer.from('Live automatic QR cycling and webcam transfer.\n');
    const automatic = await pair(autoContext, [{ name: 'automatic-webcam.txt', mimeType: 'text/plain', buffer: autoContent }], 'webcam-auto');
    await automatic.receiver.getByRole('button', { name: 'Receive into memory.', exact: true }).click();
    const autoLink = automatic.receiver.getByRole('link', { name: 'Download file.', exact: true });
    await autoLink.waitFor();
    const [autoDownload] = await Promise.all([automatic.receiver.waitForEvent('download'), autoLink.click()]);
    assert.deepEqual(await readFile(await autoDownload.path()), autoContent);
    await automatic.sender.getByText('Transfer finished. Start a new session to send more files.', { exact: true }).waitFor();
    for (const page of [automatic.sender, automatic.receiver]) {
        await page.waitForFunction(() => window.webcamTracks.length > 0 && window.webcamTracks.every(track => track.readyState === 'ended'));
    }
    if (artifacts) await automatic.receiver.screenshot({ path: join(artifacts, 'webcam-auto-complete.png'), fullPage: true });
    await autoContext.close();
    console.log('Passed: automatic QR cycling scanned through live webcams in both directions, followed by an exact file download.');

    if (process.env.FILE_TRANSFER_LARGE === '1') {
        const path = join(directory, 'source-2g.bin');
        const source = await open(path, 'w');
        await source.truncate(2 * 1024 ** 3);
        await source.close();
        diskContext = await makeContext(true);
        const { sender, receiver } = await pair(diskContext, path, false);
        await receiver.getByRole('button', { name: 'Choose destination and receive.', exact: true }).click();
        const ticker = setInterval(async () => {
            try { console.log('Large transfer:', await sender.evaluate(() => window.transferStats)); } catch { /* Context may have closed. */ }
        }, 15000);
        try {
            await Promise.race([
                sender.getByText('Transfer finished. Start a new session to send more files.', { exact: true }).waitFor({ timeout: 600000 }),
                ...[sender, receiver].map(async page => {
                    await page.getByRole('alert').waitFor({ timeout: 600000 });
                    throw new Error(`Large transfer failed: ${await page.getByRole('alert').innerText()}`);
                }),
            ]);
        } finally { clearInterval(ticker); }
        const stats = await sender.evaluate(() => window.transferStats);
        assert.ok(stats.maxOutstanding <= 1024 * 1024);
        assert.equal(stats.acked, 2 * 1024 ** 3);
        await receiver.evaluate(async () => {
            const handle = await (await navigator.storage.getDirectory()).getFileHandle('received.bin');
            const link = document.createElement('a');
            link.href = URL.createObjectURL(await handle.getFile());
            link.download = 'received.bin';
            link.textContent = 'Export verification output';
            document.body.append(link);
        });
        const [download] = await Promise.all([
            receiver.waitForEvent('download', { timeout: 120000 }),
            receiver.getByText('Export verification output', { exact: true }).click(),
        ]);
        assert.equal(await hash(await download.path()), await hash(path));
        await diskContext.close();
        console.log('Passed: 2 GiB streamed to native browser storage with independent SHA-256 verification.');
    }
    assert.deepEqual(errors, []);
} finally {
    await diskContext?.close();
    await browser.close();
    await rm(directory, { recursive: true, force: true });
}
