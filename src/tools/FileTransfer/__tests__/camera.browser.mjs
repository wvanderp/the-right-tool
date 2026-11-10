import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { CHUNK, encode, prepare } from '../protocol.ts';

// Run against `pnpm run dev`. This uses the real QR decoder and a canvas-backed
// camera stream; only the physical camera device is substituted.
const browser = await chromium.launch({
    headless: true,
    channel: process.platform === 'win32' ? 'msedge' : undefined,
});
try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
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
    const packets = await prepare([new File(['a'.repeat(CHUNK) + 'b'], 'example.txt', { type: 'text/plain' })]);
    const show = async (packet, position) => {
        const image = await QRCode.toDataURL(encode(packet), { width: 1200, margin: 4, errorCorrectionLevel: 'L' });
        await page.evaluate(({ image, position }) => window.setCameraFrame(image, position), { image, position });
    };
    // A large centered code extends beyond the library's default hidden crop.
    await show(packets[0], { x: 340, y: 60, size: 600 });
    await page.getByRole('heading', { name: 'example.txt', exact: true }).waitFor({ timeout: 5000 });
    // A smaller off-center code is fully visible in the camera preview too.
    await show(packets[1], { x: 32, y: 160, size: 360 });
    await page.getByText('1 of 2 parts received.', { exact: true }).waitFor({ timeout: 5000 });
    await show(packets[2], { x: 340, y: 60, size: 600 });
    await page.getByText('Transfer complete. All files are ready to download.', { exact: true }).waitFor({ timeout: 5000 });
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download file', exact: true }).click();
    const download = await downloading;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), 'a'.repeat(CHUNK) + 'b');
    assert.deepEqual(errors, []);
    console.log('Passed real QR camera decoding: large centered metadata, off-center data, complete file download.');
}
finally {
    await browser.close();
}
