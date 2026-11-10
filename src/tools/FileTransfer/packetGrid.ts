export function packetGridLayout(total: number, availableWidth: number) {
    const width = Math.max(1, Math.floor(availableWidth));
    const maxHeight = 160;
    let scale = Math.min(6, Math.max(1, Math.floor(Math.sqrt(width * maxHeight / Math.max(1, total)))));
    while (scale > 1 && Math.ceil(total / Math.max(1, Math.floor(width / scale))) * scale > maxHeight) scale--;
    const packetsPerPixel = Math.max(1, Math.ceil(total / (width * maxHeight)));
    const cells = Math.ceil(total / packetsPerPixel);
    const columns = Math.min(cells, Math.max(1, Math.floor(width / scale)));
    const rows = columns ? Math.ceil(cells / columns) : 0;
    return { columns, rows, scale, packetsPerPixel, cells };
}

export function packetGrid(total: number, file: number, parts: ReadonlyMap<string, string>, availableWidth: number) {
    const layout = packetGridLayout(total, availableWidth);
    const { columns, rows, packetsPerPixel, cells } = layout;
    // 0 = unused padding, 1 = missing, 2 = received. Aggregated cells turn
    // green only when every represented packet has arrived.
    const pixels = new Uint8Array(columns * rows);
    pixels.fill(1, 0, cells);
    const received = new Uint32Array(cells);
    const prefix = `${file}:`;
    for (const id of parts.keys()) {
        if (!id.startsWith(prefix)) continue;
        const part = Number(id.slice(prefix.length));
        if (Number.isInteger(part) && part >= 0 && part < total) received[Math.floor(part / packetsPerPixel)]++;
    }
    for (let cell = 0; cell < cells; cell++) {
        if (received[cell] === Math.min(packetsPerPixel, total - cell * packetsPerPixel)) pixels[cell] = 2;
    }
    return { ...layout, pixels };
}
