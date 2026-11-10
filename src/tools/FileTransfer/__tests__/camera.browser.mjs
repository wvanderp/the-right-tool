import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { CHUNK, prepare } from '../protocol.ts';
import { encodeFrame, metadataPackets } from '../framing.ts';
import { THROUGHPUT_SCENARIOS } from './throughputHarness.ts';

// Run against `pnpm run dev`. This uses the real QR decoder and a canvas-backed
// camera stream; only the physical camera device is substituted.
const browser = await chromium.launch({
    headless: true,
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    // Two pages represent two foreground devices, not an idle background tab.
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await context.addInitScript(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const context = canvas.getContext('2d');
        let image = null;
        let peer = null;
        const tracks = new Set();
        let placement = { x: 340, y: 60, size: 600 };
        const draw = () => {
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            const source = peer ? peer.window.document.querySelector(`canvas[aria-label="${peer.label}"]`) : image;
            if (source) context.drawImage(source, placement.x, placement.y, placement.size, placement.size);
        };
        window.setCameraFrame = async (url, position) => {
            peer = null;
            if (!url) {
                image = null;
                draw();
                return;
            }
            const next = new Image();
            next.src = url;
            await next.decode();
            image = next;
            placement = position;
            draw();
        };
        window.setCameraPeer = (otherWindow, label, position) => {
            peer = { window: otherWindow, label };
            image = null;
            placement = position;
            draw();
        };
        // One draw loop per page also supports restarting the camera without
        // accumulating a new interval for every getUserMedia call.
        setInterval(() => {
            draw();
            for (const track of tracks) {
                if (track.readyState === 'ended') tracks.delete(track);
                else track.requestFrame();
            }
        }, 33);
        navigator.mediaDevices.getUserMedia = async () => {
            draw();
            // A real camera delivers frames even when the image is unchanged.
            // Automatic canvas capture can coalesce unchanged QR images.
            const stream = canvas.captureStream(0);
            const track = stream.getVideoTracks()[0];
            tracks.add(track);
            track.requestFrame();
            return stream;
        };
    });
    await page.goto(process.env.FILE_TRANSFER_URL || 'http://localhost:5173/file-transfer');
    await page.getByRole('button', { name: 'Receive files', exact: false }).click();
    const speedPanel = page.getByRole('region', { name: 'Transfer speed and time remaining' });
    await speedPanel.getByText('Waiting for file metadata.', { exact: true }).waitFor();
    await speedPanel.getByRole('img', { name: /Transfer speed over the last 30 seconds/ }).waitFor();
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await page.getByText('Camera is scanning for QR codes.', { exact: true }).waitFor();
    const contents = randomBytes(CHUNK * 11 - 1);
    const packets = await prepare([new File([contents], 'example.txt', { type: 'application/octet-stream' })]);
    const metadata = metadataPackets(packets[0]);
    const data = packets.filter(p => p.kind === 'data');
    let sequence = 0;
    const show = async (packets, position, capacity = 1) => {
        const frame = { kind: 'transfer', id: data[0].id, sequence: sequence++, epoch: capacity === 1 ? 0 : 1,
            profile: { packetsPerFrame: capacity, intervalMs: capacity === 1 ? 1000 : 350 }, packets };
        const image = await QRCode.toDataURL(encodeFrame(frame), { width: 1200, margin: 4, errorCorrectionLevel: 'L' });
        await page.evaluate(({ image, position }) => window.setCameraFrame(image, position), { image, position });
    };
    // A large centered code extends beyond the library's default hidden crop.
    for (const packet of metadata) {
        await show([packet], { x: 340, y: 60, size: 600 });
        await page.waitForTimeout(300);
    }
    await page.getByRole('heading', { name: 'example.txt', exact: true }).waitFor({ timeout: 5000 });
    // A smaller off-center code is fully visible in the camera preview too.
    await show([data[0]], { x: 32, y: 160, size: 360 });
    await page.getByText('1 of 11 parts received.', { exact: true }).waitFor({ timeout: 5000 });
    // Incompressible data exercises the maximum density, not just repetitive text.
    await show(data.slice(1), { x: 340, y: 60, size: 600 }, 10);
    await page.getByText('Transfer complete. All files are ready to download.', { exact: true }).waitFor({ timeout: 5000 });
    await speedPanel.getByText('Complete.', { exact: true }).waitFor();
    const sparkline = await speedPanel.locator('polyline').getAttribute('points');
    assert.equal(/NaN|Infinity/.test(sparkline), false);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download file', exact: true }).click();
    const download = await downloading;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), contents);
    assert.deepEqual(errors, []);
    console.log('Passed real QR camera decoding: fragmented metadata, off-center data, ten-packet binary frames, exact download.');

    // Large files render every packet in a single compact canvas.
    await page.evaluate(() => window.setCameraFrame(null));
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
    await page.getByRole('button', { name: 'Receive files', exact: false }).click();
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    const largeManifest = { id: 'large-grid', files: [{ name: 'large.bin', size: 28000 * CHUNK, type: '' }] };
    const largeFrame = (sequence, packets) => ({ kind: 'transfer', id: largeManifest.id, sequence, epoch: 0,
        profile: { packetsPerFrame: 8, intervalMs: 1000 }, packets });
    const showLarge = async (frame) => {
        const image = await QRCode.toDataURL(encodeFrame(frame), { width: 1200, margin: 4, errorCorrectionLevel: 'L' });
        await page.evaluate(image => window.setCameraFrame(image, { x: 340, y: 60, size: 600 }), image);
    };
    await showLarge(largeFrame(0, metadataPackets(largeManifest)));
    const grid = page.getByRole('img', { name: /large.bin: 0 of/ });
    await grid.waitFor();
    const dimensions = await grid.evaluate(canvas => ({ width: canvas.width, height: canvas.height, displayHeight: canvas.getBoundingClientRect().height }));
    assert.ok(dimensions.width * dimensions.height >= 28000);
    assert.ok(dimensions.displayHeight <= 160);
    assert.equal(await page.getByRole('button', { name: 'Next parts', exact: true }).count(), 0);
    await showLarge(largeFrame(1, [0, 27999].map(part => ({ kind: 'data', file: 0, part, data: btoa('x'.repeat(CHUNK)) }))));
    const updatedGrid = page.getByRole('img', { name: /large.bin: 2 of/ });
    await updatedGrid.waitFor();
    const colors = await updatedGrid.evaluate((canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        return [0, 1, 27999].map(index => Array.from(data.slice(index * 4, index * 4 + 4)));
    });
    assert.ok(colors[0][1] > colors[0][0], 'First received pixel is green.');
    assert.ok(colors[1][0] > colors[1][1], 'Missing pixel is red.');
    assert.ok(colors[2][1] > colors[2][0], 'Final received pixel is green.');
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.waitForFunction(() => {
        const canvas = document.querySelector('canvas[aria-label^="large.bin:"]');
        return canvas && canvas.getBoundingClientRect().width <= canvas.parentElement.clientWidth
            && canvas.getBoundingClientRect().width >= canvas.width && canvas.getBoundingClientRect().height <= 160;
    });
    const mobileGrid = await updatedGrid.evaluate(canvas => ({ cells: canvas.width * canvas.height, pixels: canvas.getBoundingClientRect().width / canvas.width }));
    assert.ok(mobileGrid.cells >= 28000, 'Every packet remains individually represented on mobile.');
    assert.ok(mobileGrid.pixels >= 1);
    await page.setViewportSize({ width: 1600, height: 1000 });
    console.log('Passed compact 28,000-packet canvas: desktop/mobile fit, individual first/last pixels, live red/green updates, no pagination.');
    await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
    await page.evaluate(() => window.setCameraFrame(null));

    // Feed live canvases directly between same-origin pages. Both cameras and
    // QR decoders run normally; no PNG transport or protocol mocks are involved.
    const scenarios = THROUGHPUT_SCENARIOS.filter(scenario => !process.env.FILE_TRANSFER_SCENARIO || scenario.name.includes(process.env.FILE_TRANSFER_SCENARIO));
    assert.ok(scenarios.length, 'The requested throughput scenario exists.');
    for (const scenario of scenarios) {
        const receivingPage = await context.newPage();
        const receivingFocus = await context.newCDPSession(receivingPage);
        await receivingFocus.send('Emulation.setFocusEmulationEnabled', { enabled: true });
        receivingPage.on('pageerror', error => errors.push(String(error)));
        await receivingPage.goto(process.env.FILE_TRANSFER_URL || 'http://localhost:5173/file-transfer');
        await receivingPage.getByRole('button', { name: 'Receive files', exact: false }).click();
        await receivingPage.getByRole('button', { name: 'Start camera', exact: true }).click();
        const popup = receivingPage.waitForEvent('popup');
        await receivingPage.evaluate(() => window.open(location.href));
        const sender = await popup;
        const sendingFocus = await context.newCDPSession(sender);
        await sendingFocus.send('Emulation.setFocusEmulationEnabled', { enabled: true });
        sender.on('pageerror', error => errors.push(String(error)));
        await sender.getByRole('button', { name: 'Send files', exact: false }).click();
        const contents = randomBytes(scenario.size);
        const started = Date.now();
        await sender.locator('input[type=file]').setInputFiles({ name: 'live.bin', mimeType: 'application/octet-stream', buffer: contents });
        await sender.getByRole('img', { name: 'Sending file QR code', exact: true }).waitFor();
        if (scenario.feedback) await sender.getByRole('button', { name: 'Start camera', exact: true }).click();
        const position = { x: 32, y: 60, size: scenario.codeSize };
        assert.equal(await receivingPage.evaluate(() => document.visibilityState), 'visible');
        assert.equal(await sender.evaluate(() => document.visibilityState), 'visible');
        if (scenario.small) assert.ok(position.size ** 2 / (1280 * 720) < 0.25, 'QR covers less than 25% of the camera frame area.');
        await sender.evaluate(({ position, feedback }) => {
            window.opener.setCameraPeer(window, 'Sending file QR code', position);
            if (feedback) window.setCameraPeer(window.opener, 'Received file parts feedback QR code', { x: 340, y: 60, size: 600 });
        }, { position, feedback: scenario.feedback });
        await receivingPage.getByText(/Size: \d+ modules per side/).waitFor({ timeout: 5000 });
        const cameraBounds = await receivingPage.locator('video').evaluate(video => ({
            top: video.getBoundingClientRect().top, bottom: video.getBoundingClientRect().bottom, height: innerHeight,
        }));
        assert.ok(cameraBounds.top >= 0 && cameraBounds.bottom <= cameraBounds.height,
            `The receiving video stays in the viewport after measurements appear: ${JSON.stringify(cameraBounds)}.`);
        const deadline = started + contents.length / scenario.minimum * 1000;
        const remaining = () => Math.max(1, deadline - Date.now());
        try {
            await receivingPage.getByText('Transfer complete. All files are ready to download.', { exact: true }).waitFor({ timeout: remaining() });
            if (scenario.feedback) await sender.getByText('All file parts are confirmed.', { exact: false }).waitFor({ timeout: remaining() });
        }
        catch (error) {
            console.log('Browser errors:', errors);
            console.log(scenario.name, 'Sender:', await sender.locator('body').innerText());
            console.log(scenario.name, 'Receiver:', await receivingPage.locator('body').innerText());
            throw error;
        }
        const elapsedSeconds = (Date.now() - started) / 1000;
        const bytesPerSecond = contents.length / elapsedSeconds;
        const downloading = receivingPage.waitForEvent('download');
        await receivingPage.getByRole('button', { name: 'Download file', exact: true }).click();
        const download = await downloading;
        const chunks = [];
        for await (const chunk of await download.createReadStream()) chunks.push(chunk);
        assert.deepEqual(Buffer.concat(chunks), contents);
        assert.ok(bytesPerSecond >= scenario.minimum, `${scenario.name} meets ${scenario.minimum} B/s (observed ${bytesPerSecond.toFixed(1)} B/s).`);
        if (!scenario.feedback) await sender.getByText('Waiting for receiver feedback.', { exact: true }).waitFor();
        console.log(`Passed ${scenario.name}: ${contents.length} binary bytes in ${elapsedSeconds.toFixed(1)}s (${bytesPerSecond.toFixed(1)} B/s), exact download verified.`);
        await receivingPage.evaluate(() => window.setCameraFrame(null));
        await sender.close();
        await receivingPage.close();
    }
    for (const width of [1600, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []);
}
finally {
    await browser.close();
}
