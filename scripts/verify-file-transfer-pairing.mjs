// Start pnpm run dev first. Exercises real ICE with a slow manual reply exchange.
import assert from 'node:assert/strict';
import { chromium, firefox } from 'playwright';

const url = process.env.FILE_TRANSFER_URL || 'http://127.0.0.1:5173';
const chrome = await chromium.launch({ ...(process.env.FILE_TRANSFER_BROWSER ? { executablePath: process.env.FILE_TRANSFER_BROWSER } : { channel: 'chrome' }) });
let fox;
try {
    fox = await firefox.launch({ ...(process.env.FILE_TRANSFER_FIREFOX ? { executablePath: process.env.FILE_TRANSFER_FIREFOX } : {}) });
    for (const [sending, receiving] of [[chrome, fox], [fox, chrome]]) {
        const sender = await sending.newPage(), receiver = await receiving.newPage();
        console.log(`Checking ${sending.browserType().name()} → ${receiving.browserType().name()}.`);
        for (const page of [sender, receiver]) {
            await page.goto(`${url}/file-transfer`);
            await page.evaluate(async () => {
                const { TransferConnection } = await import('/src/tools/FileTransfer/connection.ts');
                window.TransferConnection = TransferConnection;
                window.result = { errors: [], connected: false, received: null, ready: null };
                window.events = {
                    status() {}, files() {}, ready: file => { window.result.ready = file; },
                    error: text => window.result.errors.push(text),
                    connected: () => { window.result.connected = true; },
                    download: async (_file, blob) => { window.result.received = await blob.text(); },
                };
            });
        }
        const offer = await sender.evaluate(async () => {
            window.peer = new window.TransferConnection('slow-pairing', [new File(['Delayed QR reply.'], 'proof.txt')], window.events);
            return window.peer.offer();
        });
        const answer = await receiver.evaluate(async offer => {
            window.peer = new window.TransferConnection('slow-pairing', null, window.events);
            return window.peer.answer(offer);
        }, offer);
        console.log('Reply gathered; waiting before exchange.');
        // Real browser time: allow the normal early ICE failure to occur before scanning the reply.
        await new Promise(resolve => setTimeout(resolve, Number(process.env.FILE_TRANSFER_REPLY_DELAY ?? 25000)));
        assert.deepEqual(await receiver.evaluate(() => window.result.errors), [], 'Receiver must remain available while its reply is being scanned.');
        await sender.evaluate(answer => window.peer.applyAnswer(answer), answer);
        console.log('Reply applied.');
        await receiver.waitForFunction(() => window.result.connected, null, { timeout: 35000 });
        await receiver.waitForFunction(() => window.peer.pc.connectionState === 'connected');
        await receiver.waitForFunction(() => window.result.ready !== null);
        await receiver.evaluate(async () => {
            const { createSink } = await import('/src/tools/FileTransfer/storage.ts');
            await window.peer.accept(await createSink(window.result.ready, false));
        });
        await receiver.waitForFunction(() => window.result.received !== null);
        assert.equal(await receiver.evaluate(() => window.result.received), 'Delayed QR reply.');
        for (const page of [sender, receiver]) assert.deepEqual(await page.evaluate(() => window.result.errors), []);
        console.log(`Passed delayed reply: ${sending.browserType().name()} → ${receiving.browserType().name()}.`);
        await sender.close(); await receiver.close();
    }
} finally {
    await chrome.close(); await fox?.close();
}
