# File Transfer

Transfer small files directly through animated QR codes without network services. First choose **Send files** or **Receive files** on each device.

The sending flow asks you to choose files, then opens a large animated QR display with a compact progress and feedback-camera panel. The receiver shows its camera, live statistics, and file list beside a large feedback QR code. These panels stack on smaller screens.

Start the receiving camera and point it at the sender. Initially the file list and total packet count are unknown. Packets scanned before the metadata is complete are retained and validated when the file list arrives. Each file shows green squares for received packets and red squares for missing packets, numeric counts, and a download button enabled when complete. Large grids are paged in groups of 512 packets. Empty files are ready once their metadata arrives.

For two-way transfers, start the sender camera and point it at the receiver’s feedback QR. Feedback starts after the first valid sender frame, even before the complete file list is known. Validated packets are acknowledged and removed from rotation. Use **Start over** on both devices to clear the transfer from memory and return to role selection.

## Packets and QR frames

File packets always contain up to 96 raw bytes, with only the last packet of each file potentially shorter. Packet identity is the file index and packet index. QR frames can contain multiple packets, including packets from different files. Changing QR capacity or display timing never renumbers packets or discards received progress.

File metadata is encoded as UTF-8 JSON and split into the same 96-byte packet size. It is reassembled independently, so long file lists and Unicode names do not need to fit in a single QR. Metadata is limited to 128 KiB and is revisited every fourth frame until acknowledged. In one-way mode it continues to repeat. Metadata packets are acknowledged only after the entire file list has been validated.

The version 3 compact JSON wire format has two frame types:

- Transfer: `[3, transferId, 't', sequence, epoch, packetsPerFrame, intervalMs, packets]`.
- Feedback: `[3, transferId, 'f', sequence, acknowledgedKeys, maxPackets, minIntervalMs, report]`.

Transfer packets are `['d', fileIndex, packetIndex, base64]` for file data or `['m', packetIndex, packetCount, base64]` for metadata. Acknowledgements use `fileIndex:packetIndex` and `m:packetIndex` identifiers. Feedback cycles through batches of up to 16 acknowledgements. Frames are bounded to 1800 encoded UTF-8 bytes and up to eight packets. Invalid frames, incompatible versions, and other transfer identifiers are ignored. Duplicate and out-of-order frames are supported. Refresh both devices after updating; version 3 sessions do not accept older transfer QR formats.

## Adaptive two-way communication

One-way transfers remain at one packet per QR and a one-second display interval. With feedback, the sender can progress through these profiles:

| Packets per QR | Display interval |
| --- | --- |
| 1 | 1000 ms |
| 2 | 1000 ms |
| 2 | 750 ms |
| 4 | 750 ms |
| 4 | 500 ms |
| 8 | 500 ms |
| 8 | 350 ms |

The receiver measures distinct decoded frame sequences rather than counting repeated camera reads as new frames. Each report carries the current profile and epoch, last sequence, decoded frame count, sequence span, elapsed time, report age, encoded frame bytes, QR modules per side, apparent code width in camera pixels, and frame kind (metadata, data, or mixed). Module count is inferred from the decoded payload using the same QR encoder settings as the display. Camera width is estimated from the decoded corner points. These measurements describe payload density and observed decoding cadence; they do not measure the decoder’s CPU execution time. The physical QR display continues to fill the available panel.

Reports contain up to 32 distinct observations for a configuration epoch. At least four observed frames, two seconds of measurements, 85% sequence reception, and 80% of the expected frame rate are required for an upward step. A new epoch is started for every setting change, so old reports cannot approve another increase. Capacity increases also require at least three camera pixels per QR module when geometry is available. Receiver capacity and interval limits are respected.

Reception below 65% or a frame rate below 60% of the expected rate causes a downward step once enough sequence history exists. Reports older than three seconds are not used for tuning. If six seconds pass without fresh evidence for the current profile, the sender returns to one packet per second. Replayed feedback and repeated reads do not keep an unsuccessful profile alive. This lets a receiver recover if a denser or faster QR becomes unreadable.

## Architecture and tests

Communication state and decisions live outside React:

- `protocol.ts` handles file preparation, fixed-size data packets, packet validation, and file assembly.
- `framing.ts` handles bounded version 3 wire encoding, validation, and metadata fragmentation.
- `reception.ts` stores and validates received file packets, including packets arriving before metadata.
- `negotiation.ts` measures received frames and selects the next capacity/timing profile.
- `session.ts` provides `SenderSession` and `ReceiverSession`, including packet scheduling, acknowledgements, feedback, negotiation, and reconstruction. Call `nextFrame(now)` and `read(raw, now)` with explicit timestamps; no React, camera, or timer is needed for session tests. Optional camera observations can be passed to the receiver.
- `scanner.ts` adapts full-frame camera scanning and QR geometry to the sessions. `FileTransfer.tsx` renders the UI, draws QR codes, and connects camera and timer events to session methods.

Run `pnpm test` for logic tests. Session tests simulate one-way and two-way delivery, growth and backoff, receiver limits, missing feedback, packet loss, duplicates, reordering, Unicode metadata, invalid wire input, and exact reconstructed bytes.

For the real QR decoder regression test, start `pnpm run dev`, then run `pnpm exec node src/tools/FileTransfer/__tests__/camera.browser.mjs`. It uses canvas-backed camera streams and the real QR decoder to verify metadata, off-center codes, eight-packet frames, and a live two-way exchange between two UI sessions. Downloaded bytes are checked exactly. It uses Microsoft Edge on Windows and Playwright Chromium elsewhere. Set `FILE_TRANSFER_URL` if the development server uses a different URL than `http://localhost:5173/file-transfer`. Webcam optics, screen glare, and focus still require real-device testing.

## Privacy and camera use

Files stay in browser memory. Limits are 100 files and 100 MiB total; QR transfer is slow and best suited to much smaller payloads. HTTPS or localhost and camera permission are required. Keep the page open; refreshing loses progress. QR contents are not encrypted: anyone who can scan the screen can receive the files. No server storage, WebRTC, signaling, STUN, or TURN is used.

Both cameras scan the entire visible frame. Camera frames retain their resolution up to a 1920-pixel longest edge; larger frames are scaled proportionally. Keep the complete QR code and its white border visible. The scanner shows startup status, decoded QR reads, repeated and ignored reads, last read time, and warnings for unreadable or stalled codes. The receiver also shows QR size, payload, and observed frame rate.
