# File Transfer

Transfer small files directly through animated QR codes without network services. First choose **Send files** or **Receive files** on each device.

The sending flow first asks you to choose files, then automatically opens a large animated QR display with a compact progress and feedback-camera panel alongside it. Start the receiving camera and point it at the sender.

The receiving screen has two columns on wide screens: statistics, camera preview, and the file list on the left; a large feedback QR code on the right. These panels stack on smaller screens. Initially the file list and total part count are unknown. Unique parts scanned before metadata are retained, then validated against the file list when metadata arrives. Each file shows green squares for received parts and red squares for missing parts, plus numeric counts and a download button enabled when complete. Large grids are paged in groups of 512 parts to keep the screen responsive. Empty files are ready as soon as metadata arrives.

Optionally start the sender camera and point it at the receiver’s feedback QR code. After metadata arrives, the receiver cycles acknowledgements for validated received parts, which the sender removes from rotation. Without acknowledgements all parts repeat indefinitely. Use **Start over** on both devices to return to the role selection screen and clear the transfer from memory.

The version 2 compact JSON protocol uses a random transfer identifier, repeated manifests, 96-byte base64 data parts, and batches of up to 8 acknowledged part identifiers. Duplicate and out-of-order parts are supported, including parts scanned before metadata. The receiver locks onto the first file-data or metadata transfer identifier until you start over; other transfers and confirmation codes do not enter its received parts. Empty files need only metadata.

Files stay in browser memory. Limits are 100 files and 100 MiB total; QR transfer is slow and best suited to much smaller payloads. HTTPS or localhost and camera permission are required. Keep the page open; refreshing loses progress. QR contents are not encrypted: anyone who can scan the screen can receive the files. No server storage, WebRTC, signaling, STUN, or TURN is used.

QR codes initially stay on screen for one second. The sender speeds up after 4, 12, and 28 distinct confirmed parts, to 750, 500, and 350 milliseconds respectively. Without confirmations the sender stays at one second. Receiver confirmations rotate once per second.

Data QR codes carry one quarter of the previous file payload. Confirmations use smaller batches. Refresh both devices after updating because the wire format changed.


The scanner shows camera startup and scanning status, total decoded QR reads, repeated and ignored reads, the last read time, and the latest scan result. Repeated codes confirm that the camera is reading even when no new parts arrive. Warnings explain unreadable codes and stalled progress. Overall reception reports collected parts and announces when all files are ready to download.

Both cameras scan the entire visible frame rather than a hidden center crop. Camera frames retain their resolution up to a 1920-pixel longest edge, with larger frames scaled proportionally to bound decoding work. Keep the entire QR code, including its white border, visible in the preview.

Run `pnpm test` for logic tests. For the real QR decoder regression test, start `pnpm run dev`, then run `pnpm exec node src/tools/FileTransfer/__tests__/camera.browser.mjs`. The test uses a canvas-backed camera stream containing generated QR images, verifies large centered and off-center codes, and downloads and checks the reconstructed file. It uses Microsoft Edge on Windows and Playwright Chromium elsewhere. Set `FILE_TRANSFER_URL` if the development server uses a different URL than `http://localhost:5173/file-transfer`. This checks the decoder and video path but does not simulate webcam optics, screen glare, or focus.
