import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { CHUNK, prepare } from '../protocol.ts';
import { encodeFrame, metadataPackets } from '../framing.ts';

// Run against `pnpm run dev`. This uses the real QR decoder and a canvas-backed
// camera stream; only the physical camera device is substituted.
const browser = await chromium.launch({
    headless: true,
    channel: process.platform === 'win32' ? 'msedge' : undefined,
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
        let placement = { x: 340, y: 60, size: 600 };
        const draw = () => {
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
            if (image) context.drawImage(image, placement.x, placement.y, placement.size, placement.size);
        };
        window.setCameraFrame = async (url, position) => {
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
        navigator.mediaDevices.getUserMedia = async () => {
            draw();
            setInterval(draw, 33);
            return canvas.captureStream(30);
        };
    });
    await page.goto(process.env.FILE_TRANSFER_URL || 'http://localhost:5173/file-transfer');
    await page.getByRole('button', { name: 'Receive files', exact: false }).click();
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await page.getByText('Camera is scanning for QR codes.', { exact: true }).waitFor();
    const contents = 'a'.repeat(CHUNK * 9 - 1);
    const packets = await prepare([new File([contents], 'example.txt', { type: 'text/plain' })]);
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
    await page.getByText('1 of 9 parts received.', { exact: true }).waitFor({ timeout: 5000 });
    // A genuinely dense QR contains eight independently identified file packets.
    await show(data.slice(1), { x: 340, y: 60, size: 600 }, 8);
    await page.getByText('Transfer complete. All files are ready to download.', { exact: true }).waitFor({ timeout: 5000 });
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download file', exact: true }).click();
    const download = await downloading;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), contents);
    assert.deepEqual(errors, []);
    console.log('Passed real QR camera decoding: fragmented metadata, off-center data, eight-packet frames, exact download.');

    // Connect two real UI sessions by feeding each rendered canvas into the
    // other page's camera. Neither QR decoding nor protocol handlers are mocked.
    await page.evaluate(() => window.setCameraFrame(null));
    await page.getByRole('button', { name: 'Start over', exact: true }).click();
    await page.getByRole('button', { name: 'Receive files', exact: false }).click();
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    const sender = await context.newPage();
    sender.on('pageerror', error => errors.push(String(error)));
    await sender.goto(process.env.FILE_TRANSFER_URL || 'http://localhost:5173/file-transfer');
    await sender.getByRole('button', { name: 'Send files', exact: false }).click();
    const liveContents = 'Live two-way transfer. '.repeat(160);
    await sender.locator('input[type=file]').setInputFiles({ name: 'live.txt', mimeType: 'text/plain', buffer: Buffer.from(liveContents) });
    await sender.getByRole('img', { name: 'Sending file QR code', exact: true }).waitFor();
    await sender.getByRole('button', { name: 'Start camera', exact: true }).click();
    let largestCapacity = 1;
    let fastestInterval = 1000;
    const deadline = Date.now() + 45000;
    let completed = false;
    while (Date.now() < deadline) {
        const sendingImage = await sender.locator('canvas').evaluate(canvas => canvas.toDataURL());
        await page.evaluate(image => window.setCameraFrame(image, { x: 340, y: 60, size: 600 }), sendingImage);
        if (await page.locator('canvas').count()) {
            const feedbackImage = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
            await sender.evaluate(image => window.setCameraFrame(image, { x: 340, y: 60, size: 600 }), feedbackImage);
        }
        const text = await sender.locator('body').innerText();
        largestCapacity = Math.max(largestCapacity, Number(text.match(/(\d+)\s+packets per QR/)?.[1] || 1));
        fastestInterval = Math.min(fastestInterval, Number(text.match(/QR display time:\s*(\d+)/)?.[1] || 1000));
        if (await page.getByText('Transfer complete. All files are ready to download.', { exact: true }).isVisible()
            && text.includes('All file parts are confirmed.')) {
            completed = true;
            break;
        }
        await page.waitForTimeout(100);
    }
    if (!completed) {
        console.log('Sender:', await sender.locator('body').innerText());
        console.log('Receiver:', await page.locator('body').innerText());
    }
    assert.equal(completed, true, 'Live two-way transfer completes and all data is acknowledged.');
    assert.ok(largestCapacity >= 2, 'Receiver measurements increase QR capacity.');
    assert.ok(fastestInterval < 1000, 'Receiver measurements increase QR speed.');
    const liveDownloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download file', exact: true }).click();
    const liveDownload = await liveDownloading;
    const liveChunks = [];
    for await (const chunk of await liveDownload.createReadStream()) liveChunks.push(chunk);
    assert.equal(Buffer.concat(liveChunks).toString(), liveContents);
    for (const width of [1600, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []);
    console.log(`Passed live two-way QR exchange: capacity reached ${largestCapacity} packets, interval reached ${fastestInterval}ms, all bytes verified.`);
}
finally {
    await browser.close();
}
