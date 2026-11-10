# File Transfer

Transfer small files directly through animated QR codes without network services. Choose files on the sending device, then start the receiving camera and point it at the sender. Metadata repeats so the receiver can discover file names, sizes, and progress. Download each completed file individually.

Optionally start the sender camera and point it at the receiving screen. The receiver cycles acknowledgements for received parts, which the sender removes from rotation. Without acknowledgements all parts repeat indefinitely. Reset both devices to start another transfer.

The version 1 JSON protocol uses a random transfer identifier, repeated manifests, 384-byte base64 data parts, and batches of up to 40 acknowledged part identifiers. Duplicate and out-of-order parts are supported. Parts scanned before metadata are recovered on subsequent rotations. Empty files need only metadata.

Files stay in browser memory. Limits are 100 files and 100 MiB total; QR transfer is slow and best suited to much smaller payloads. HTTPS or localhost and camera permission are required. Keep the page open; refreshing loses progress. QR contents are not encrypted: anyone who can scan the screen can receive the files. No server storage, WebRTC, signaling, STUN, or TURN is used.
