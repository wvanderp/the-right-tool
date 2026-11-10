# File Transfer

File Transfer sends files directly between two browsers on the same local network using a reliable, ordered, DTLS-encrypted WebRTC DataChannel. The static site delivers the application. There are no application backends, accounts, signaling services, STUN servers, or TURN relays. The peer connection always uses `iceServers: []`.

## Usage

1. Open `/file-transfer` on the sending device over HTTPS. Localhost is supported for development; an HTTP LAN address does not provide a secure camera context.
2. Choose **Send files** (selected by default), then select or drop files. The **Create transfer** button appears after files are selected; choose it to begin pairing. Only the selected direction's controls are shown.
3. Scan the first QR with the other device’s normal camera to open the receive page. Start **Scan with camera** on both devices. The front camera / webcam is selected by default; select the rear camera if your setup needs it.
4. Position both devices so each camera can see the other screen’s full QR code and white border. Keep both scanners running. The receiver automatically displays its reply while retaining the same camera stream, and the sender scans it without a manual handoff. Both QR displays and scanners remain available until the data connection opens, then cameras stop automatically.
5. After connection, review each incoming filename and size. Choose a save destination or skip the file.
6. Keep both tabs foregrounded and devices awake until completion.

To receive without opening the sender's link, choose **Receive files**, then **Start receiving**. Receive links open the receiver's scanner screen directly. Canceling or starting a new session returns to the same direction, where you can switch between sending and receiving.

Camera scanning is optional: import QR images locally or copy all lines of connection text between devices. Camera access continues after a complete scan and stops when connected, canceled, or pairing fails, or when leaving the tool. You can also stop it manually. No microphone access is requested. Only scan the intended device's codes; there is no account identity verification.

Use your phone's normal camera to open the receive-page link, then use **Scan with camera** inside File Transfer to capture connection frames. Keep the whole code and its white border visible in the preview. If a code does not scan, pause it on the other device and avoid screen glare. The scanner reads the full preview, including codes near its edges. With front cameras, face the devices toward each other so their screens and cameras have mutual visibility. Camera images are decoded locally and are never sent to the other device. Only QR connection information is exchanged during pairing. This is a continuous optical offer/reply exchange; QR cycling and decoding still take time, and no network signaling service is used.

## Browser and network limits

Desktop Chrome and Edge can stream large files to a user-selected destination with File System Access. The save dialog is opened directly by a user action for each file. Capability detection determines availability; browser permissions may still prevent saving.

Other browsers use an in-memory Blob download capped at 100 MiB per file and one retained result at a time. Download and release that result before receiving the next file. The cap bounds application storage and does not guarantee that a memory-constrained mobile browser will remain open.

Local network connectivity is the supported target. Guest Wi-Fi client isolation, blocked mDNS, browser IP privacy settings, local network permissions, firewalls, and VPNs can prevent pairing. Internet connections between NAT-separated devices are not promised. No server fallback is attempted. Changing networks, refreshing, or interrupting the connection requires a new session. Cancellation aborts the active writable stream; completed downloads remain available until explicitly released or the page closes.

The receiver keeps its reply QR and peer connection available if the browser's initial ICE checks fail before the sender scans the reply. Incoming checks from the sender can recover the same session. A failure after the data channel has opened still ends the session. The sender reports connection failures and enforces a 30-second connection deadline after receiving the reply.

## Implementation

- `signaling.ts`: Complete SDP gathered before exchange, versioned JSON envelope, DEFLATE and base64url encoding, SHA-256 assembly checksum, and bounded QR reassembly. Completed signals are delivered once per scanner assembly so repeated camera scans cannot restart negotiation. Each frame is at most 800 characters, using 180-character payload parts to keep displayed codes less dense. At most 144 frames and 128 KiB decompressed signaling are accepted. The checksum detects assembly errors and is not identity authentication.
- `connection.ts`: Native peer lifecycle, empty ICE server list, 20-second gathering deadline and 30-second sender connection deadline after answer exchange, typed file state, bounded manifests (1,000 files), sequential consent, binary framing, ordered batched writes, write acknowledgments, and cancellation.
- `storage.ts`: Disk and memory sinks sharing `write`, `close`, and `abort`. Filenames are sanitized for local saving and incoming metadata is rendered as text.
- `QrPairing.tsx`: Lazy QR encoding and scanner imports; locally bundled scanner worker fallback; 750 ms automatic cycling with pause and manual controls. Both scanners remain mounted while connection information is prepared and displayed. Front/webcam and rear-camera selection support mutual screen visibility; previews are height-bounded to leave room for the QR display. The sender’s sequence starts with a link to `/file-transfer?mode=receive`, which opens the receive screen directly and is ignored by the in-page scanner. Smaller payload parts keep the connection codes less dense. QR modules use whole pixels in both the canvas and its responsive CSS size to prevent resampling artifacts. The camera scans the full preview with its aspect ratio preserved and its longest side capped at 1280 pixels. No signaling is put in URLs, browser storage, or logs.
- `FileTransfer.tsx`: File-first sender flow, receiver review/save actions, progress, average throughput, approximate remaining time, memory release, and session reset.

File messages are at most 16 KiB including their 12-byte file ID/offset header, subject to the negotiated SCTP maximum. Offsets use exact safe integers represented as float64, avoiding a 4 GiB offset ceiling. Files are read incrementally with `File.slice()`. Sender buffering stops near 1 MiB, while a separate 1 MiB limit on unacknowledged file bytes prevents slow receiver writes from accumulating an unbounded application queue. Small messages are coalesced into storage writes of at most 256 KiB; a final partial batch is flushed on the ordered end message. Progress uses acknowledged writes. Completion requires exact byte counts and successful sink closure. DTLS/SCTP provides transport integrity; there is no whole-file hash or reconnect/resume protocol in v1.

## Verification

Automated tests cover QR round trips and framing, corruption and decompression bounds, protocol validation, exact multi-file and empty-file transfer, Unicode and duplicate names, receiver backpressure, skip/cancel, disk-write failure, and memory caps. Tests use paired fake transports to exercise both protocol endpoints independently of network conditions.

Before broad release, manually check real screen/camera scanning on desktop and mobile, permissions, cross-browser LAN connectivity, a 2 GiB disk-streamed file with independent hash comparison, guest-network failure, and cancellation during a save dialog. Monitor application queue bounds rather than expecting constant total browser-process memory. Inspect networking to confirm that file bytes never use HTTP uploads and no STUN/TURN or signaling service is contacted.

### Reproducible browser checks

Run `pnpm run dev`, install Chromium with `pnpm exec playwright install chromium`, then run `node scripts/verify-file-transfer.mjs`. This checks actual QR image generation/decoding, real WebRTC pairing, exact multiple/empty downloads, queue bounds, camera cleanup using a fake camera, and mobile width. It also feeds real video MediaStreams with QR images from the opposite browser page, exercises both manual cycling and simultaneous automatic two-way scanning through the normal camera scanner, verifies that each original camera stream stays live when the reply appears, and checks that the opening receive link is ignored, verifies exact multi-file downloads, and checks automatic camera shutdown. Only camera hardware is substituted; QR decoding, signaling handling, ICE, DTLS, and DataChannels use the actual application and browser implementations. Set `FILE_TRANSFER_ARTIFACTS` to a directory to retain screenshots of live scanning and completed transfers. Set `FILE_TRANSFER_BROWSER` to an installed Chromium/Chrome executable if needed. `FILE_TRANSFER_URL` overrides the default localhost URL.

To check slow manual pairing across browsers, install Chrome and run `pnpm exec playwright install firefox`, start `pnpm run dev`, then run `node scripts/verify-file-transfer-pairing.mjs`. This uses the actual connection module with real ICE and DataChannels in Chrome and Firefox, waits 25 seconds before delivering the reply, and verifies exact file contents in both directions. It reproduces premature receiver closure without requiring a physical camera. `FILE_TRANSFER_BROWSER` and `FILE_TRANSFER_FIREFOX` can select compatible browser executables; `FILE_TRANSFER_REPLY_DELAY` overrides the wait in milliseconds. This check requires the development server because it imports the TypeScript modules directly.

Set `FILE_TRANSFER_LARGE=1` to also transfer a sparse 2 GiB source file and independently compare SHA-256 hashes. Allow several minutes and at least 5 GiB of free temporary disk space. This test substitutes a real origin-private file handle in a normal temporary browser profile for the OS save picker so it can verify native disk streaming headlessly; manually verify the OS picker separately.

Webcam checks force the bundled software decoder to cover browsers without native `BarcodeDetector` support. Paused codes fill most of the preview, and automatically cycling codes sit off-center in a portrait preview. These cases catch invisible scan crops that make a fully visible QR unreadable.

For the long stress test, use the production preview to avoid development hot reloads interrupting the session: run `pnpm run build`, start `pnpm run preview`, then run `FILE_TRANSFER_URL=http://127.0.0.1:4173 FILE_TRANSFER_LARGE=1 node scripts/verify-file-transfer.mjs` in another terminal. Add `FILE_TRANSFER_BROWSER` if using an installed Chrome executable.
