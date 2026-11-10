# File Transfer

Transfer small files directly through animated QR codes without network services. First choose **Send files** or **Receive files** on each device.

The sending flow asks you to choose files, then opens a large animated QR display with a compact feedback-camera and progress panel. The receiver shows its camera, live statistics, and file list beside a large feedback QR code. Cameras appear above statistics so measurements do not push their previews below the viewport. These panels stack on smaller screens.

Start the receiving camera and point it at the sender. Initially the file list and total packet count are unknown. Packets scanned before the metadata is complete are retained and validated when the file list arrives. Each file shows green squares for received packets and red squares for missing packets, numeric counts, and a download button enabled when complete. Packet maps use a responsive canvas with no gaps or pagination. A 28,000-packet file fits in a grid at most 160 pixels tall on normal desktop and mobile widths, with one pixel per packet. Smaller maps use larger squares for readability. If a file exceeds the available pixel capacity, each pixel represents a group of packets and stays red until every packet in the group has arrived; the caption shows the grouping. Numeric counts remain exact. Empty files are ready once their metadata arrives.

For two-way transfers, start the sender camera and point it at the receiver’s feedback QR. Feedback starts after the first valid sender frame, even before the complete file list is known. Validated packets are acknowledged and removed from rotation. Use **Start over** on both devices to clear the transfer from memory and return to role selection.

The sending QR screen and receiving screen automatically request a screen wake lock to prevent idle dimming or locking while the page is visible. **Keep screen awake** is enabled by default and can be turned off. The lock is released when you start over, leave the tool, or hide the tab; it is requested again when you return to the visible transfer screen. The status explains whether the lock is active or unavailable. Browser support, permissions, and device power-saving settings may prevent a lock. This does not change display brightness or override manual screen locking.

Both transfer screens show a 30-second speed sparkline and an estimated time remaining. Speed is measured in file bytes per second and smoothed over the last 10 seconds. Metadata, base64 overhead, and repeated packets do not count as transferred file data. Short final packets count their actual byte size. On the sender, progress counts only newly acknowledged bytes, so receiver feedback is required for a measured speed and ETA. On the receiver, collected bytes can be measured before metadata arrives, but the ETA waits for the file total. Provisional byte counts are corrected when metadata validates buffered packets.

The ETA appears after at least three seconds of data observations and adjusts as throughput changes. After 10 seconds without new progress, the speed falls to zero and the ETA shows that it is waiting for new data. Completed transfers show **Complete**. Starting over clears the history. The estimate covers remaining file data; file metadata and delayed confirmations can add time.

## Packets and QR frames

File packets always contain up to 96 raw bytes, with only the last packet of each file potentially shorter. Packet identity is the file index and packet index. QR frames can contain multiple packets, including packets from different files. Changing QR capacity or display timing never renumbers packets or discards received progress.

File metadata is encoded as UTF-8 JSON and split into the same 96-byte packet size. It is reassembled independently, so long file lists and Unicode names do not need to fit in a single QR. Metadata is limited to 128 KiB. The sender sends the complete metadata once at the start, then revisits it every sixteenth frame until acknowledged. Metadata frames carry only metadata, so a short file list stays readable independently of the dense data profile. In one-way mode metadata continues to repeat. Metadata packets are acknowledged only after the entire file list has been validated.

The version 4 compact JSON wire format has two frame types:

- Transfer: `[4, transferId, 't', sequence, epoch, packetsPerFrame, intervalMs, packets]`.
- Feedback: `[4, transferId, 'f', sequence, acknowledgedKeys, maxPackets, minIntervalMs, report]`.

Transfer packets are `['d', fileIndex, packetIndex, base64]` for file data or `['m', packetIndex, packetCount, base64]` for metadata. Acknowledgements use `fileIndex:packetIndex` and `m:packetIndex` identifiers. Feedback cycles through batches of up to 32 acknowledgements. Frames are bounded to 1800 encoded UTF-8 bytes and up to ten packets. Invalid frames, incompatible versions, and other transfer identifiers are ignored. Duplicate and out-of-order frames are supported. Refresh both devices after updating; version 4 sessions do not accept older transfer QR formats.

Each frame is independently compressed with raw DEFLATE, base64-encoded, and prefixed with `TRT4:` when that saves more than 32 bytes compared with plain JSON. Otherwise plain JSON is used. Both wire and decompressed frames are limited to 1800 bytes; decoding uses a fixed-size output buffer. Independent compression preserves recovery from missed QR codes without requiring a compression dictionary or changing file packet identities, byte accounting, or downloads. It reduces QR density especially for repetitive text and metadata. Already compressed or random file data usually benefits much less. Compression does not pack additional source packets into a profile; throughput measurements always count original file bytes.

## Adaptive two-way communication

Transfers start at eight packets per QR and a 500 ms display interval, including one-way transfers. With feedback, the sender can move through these profiles:

| Packets per QR | Display interval |
| --- | --- |
| 1 | 800 ms |
| 2 | 1000 ms |
| 2 | 750 ms |
| 4 | 750 ms |
| 4 | 500 ms |
| 8 | 500 ms |
| 8 | 350 ms |
| 10 | 350 ms |
| 10 | 250 ms |

Use **Use smaller, slower QR codes** on the sender if one-way scanning is unreliable. This pins the profile to one packet every 800 ms and preserves received progress. Turning it off restores the faster starting profile and automatic tuning. The conservative profile exceeds 100 B/s in loss-free protocol tests, including repeated metadata.

The receiver measures distinct decoded frame sequences rather than counting repeated camera reads as new frames. Each report carries the current profile and epoch, last sequence, decoded frame count, sequence span, elapsed time, report age, encoded frame bytes, QR modules per side, apparent code width in camera pixels, and frame kind (metadata, data, or mixed). Module count is inferred from the decoded payload using the same QR encoder settings as the display. Camera width is estimated from the decoded corner points. These measurements describe payload density and observed decoding cadence; they do not measure the decoder’s CPU execution time. The physical QR display continues to fill the available panel.

Reports contain up to 32 distinct observations for a configuration epoch. At least four observed frames, two seconds of measurements, 85% sequence reception, and 80% of the expected frame rate are required for an upward step. A new epoch is started for every setting change, so old reports cannot approve another increase. Capacity increases also require at least three camera pixels per QR module when geometry is available. Receiver capacity and interval limits are respected.

Reception below 65% or a frame rate below 60% of the expected rate causes a downward step once enough sequence history exists. Reports older than three seconds are not used for tuning. If six seconds pass without fresh evidence for the current profile after feedback starts, or while the sender's feedback camera is enabled, the sender returns to one packet every 800 ms. This includes an initial profile that cannot be decoded at all. Replayed feedback and repeated reads do not keep an unsuccessful profile alive. One-way transfers without a feedback camera retain their selected profile because no reception measurements are available.

## Throughput investigation and benchmark

The previous one-way default carried one 96-byte file packet per second, with every fourth frame occupied by metadata: 72 file bytes per second for a typical single-file transfer. The file list was already separate from data packets and stopped repeating after acknowledgement. Data frames repeat a small session, sequence, and profile header plus file/packet identifiers; this lets any frame be read independently after loss or joining late. Base64 adds roughly one third to raw packet bytes before JSON overhead. Retaining independent packet identifiers avoids a new dependency on periodically received headers.

The faster default provides 1536 raw file bytes per second before metadata. A dedicated metadata frame every sixteen frames reserves 6.25% of the one-way schedule, instead of the quarter reserved by the original protocol. With feedback, metadata stops repeating once acknowledged. Feedback acknowledgements were doubled to keep confirmations from falling behind the higher packet rate.

Unit tests and the benchmark now transfer complete deterministic binary files, reconstruct every byte, and enforce these minimums:

| Scenario | File size | Minimum file throughput |
| --- | --- | --- |
| Small QR, no feedback. | 8 KiB. | 100 B/s. |
| Default QR, no feedback. | 24 KiB. | 300 B/s. |
| Adaptive QR, feedback every second. | 64 KiB. | 1024 B/s (1 KiB/s). |

Run `pnpm exec node src/tools/FileTransfer/__tests__/throughput.benchmark.mjs` for the same virtual-time scenarios used by the unit tests. Timing includes metadata and the final QR hold; the feedback scenario waits until every file byte is acknowledged. Protocol results are 1365.3 B/s for the small-file scenario, 1404.3 B/s for the larger one-way scenario, and 2184.5 B/s for the two-way scenario. A separate conservative-profile unit test transfers and verifies 8 KiB above 100 B/s. A lost-frame regression drops a late data QR and still requires a complete 24 KiB transfer above 300 B/s without feedback. The eight-packet, 500 ms default leaves headroom for repeat cycles after missed frames. Another regression ensures that the metadata preamble stays separate from dense data frames. Compression does not improve the byte accounting or substitute repetitive text for binary input.

The real QR decoder regression uses the same three file sizes and throughput thresholds with random binary files and exact downloaded-byte verification. The small QR is 320 × 320 pixels in a 1280 × 720 camera frame, including its white border: 11.1% of the visible frame area, below the 25% requirement. The other scenarios use 600 × 600 pixels. This interprets screen percentage as area in the receiver's view, rather than percentage of screen width. All scenarios use the normal starting profile; the small-code scenario reduces the physical image size, not the packet count.

A complete local Microsoft Edge run verified 8 KiB at 1431.9 B/s with the small QR, 24 KiB at 1405.8 B/s without feedback, and 64 KiB at 1408.1 B/s with feedback. The feedback rate includes every final sender acknowledgement. These measured results use simulated camera streams and are separate from the faster virtual-time protocol benchmark above.

The test feeds live QR canvases directly between two same-origin UI pages through canvas-backed camera streams, without replacing the QR decoder, protocol handlers, or application timers. It explicitly requests a camera frame every 33 ms, disables background-tab timer throttling, and marks both pages as active so two test pages represent two devices. The receiving video must stay in the viewport after measurements appear. Protocol tests supply QR geometry to negotiation but do not simulate optical decoding. Physical-device throughput still depends on optics, lighting, display size, focus, and decoder performance. An area threshold alone cannot guarantee readability at arbitrarily small QR sizes.

## Architecture and tests

Communication state and decisions live outside React:

- `protocol.ts` handles file preparation, fixed-size data packets, packet validation, and file assembly.
- `framing.ts` handles bounded version 4 wire encoding, per-frame compression, validation, and metadata fragmentation.
- `reception.ts` stores and validates received file packets, including packets arriving before metadata.
- `negotiation.ts` measures received frames and selects the next capacity/timing profile.
- `transferSpeed.ts` tracks unique file-byte throughput, bounded speed history, and time estimates independently of React. `TransferSpeedPanel.tsx` renders the compact sparkline and current estimate.
- `packetGrid.ts` calculates compact packet layouts and pixel states. `PacketProgress.tsx` draws the responsive canvas using the same semantic colors as the packet legend, updating when packets arrive or the panel resizes.
- `session.ts` provides `SenderSession` and `ReceiverSession`, including packet scheduling, acknowledgements, feedback, negotiation, and reconstruction. Call `nextFrame(now)` and `read(raw, now)` with explicit timestamps; no React, camera, or timer is needed for session tests. Optional camera observations can be passed to the receiver.
- `scanner.ts` adapts camera scanning and QR geometry to the sessions. It starts with the full frame, tracks decoded QR corners with a quiet-zone margin, and reacquires the full frame after three failed scans to support movement.
- `camera.ts` owns camera streams and a bounded, sequential decode loop using the same QR decoder. Data scanning is limited to 12 attempts per second and feedback scanning to three attempts per second. Scanning uses timers independently of video presentation callbacks, which browsers can throttle even when fresh camera frames are available. It releases tracks and the decoder when stopped or hidden, resumes when visible, and discards camera or decoder startup results arriving after cancellation. Camera lifecycle tests cover cadence, cancellation, non-overlapping decodes, and hide/show cleanup.
- `FileTransfer.tsx` renders the UI, draws QR codes, and connects camera and timer events to session methods.

Run `pnpm test` for logic tests. Session tests simulate one-way and two-way delivery, growth and backoff, receiver limits, missing feedback, packet loss, duplicates, reordering, Unicode metadata, invalid wire input, and exact reconstructed bytes.

For the real QR decoder regression test, start `pnpm run dev`, then run `pnpm exec node src/tools/FileTransfer/__tests__/camera.browser.mjs`. It verifies metadata, off-center codes, ten-packet binary frames, and all three timed throughput scenarios between real UI sessions. Downloaded bytes are checked exactly. It uses Microsoft Edge on Windows and Playwright Chromium elsewhere. Set `FILE_TRANSFER_URL` if the development server uses a different URL than `http://localhost:5173/file-transfer`. Webcam optics, screen glare, and focus still require real-device testing.

Set `FILE_TRANSFER_SCENARIO` to part of a scenario name, such as `Adaptive`, to focus an optical throughput run while keeping the decoder and layout regression checks. Leave it unset for all three minimums.

## Privacy and camera use

Files stay in browser memory. Limits are 100 files and 100 MiB total; QR transfer is slow and best suited to much smaller payloads. HTTPS or localhost and camera permission are required. Keep the page open; refreshing loses progress. QR contents are not encrypted: anyone who can scan the screen can receive the files. No server storage, WebRTC, signaling, STUN, or TURN is used.

Both cameras initially scan the entire visible frame. After a successful read, decoding focuses on the QR bounds with a 20% margin while the preview continues to show the full frame. Three failed reads restore full-frame acquisition so moved or off-center codes can be found again. This reduces decoding work when both cameras are active. Camera frames retain their resolution up to a 1920-pixel longest edge; larger frames are scaled proportionally. Keep the complete QR code and its white border visible. The scanner shows startup status, decoded QR reads, repeated and ignored reads, last read time, and warnings for unreadable or stalled codes. The receiver also shows QR size, payload, and observed frame rate.
