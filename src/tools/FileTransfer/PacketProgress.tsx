import { useEffect, useRef, useState } from 'react';
import { packetGrid, packetGridLayout } from './packetGrid';

export default function PacketProgress({ total, file, parts, received, name }: {
    total: number; file: number; parts: ReadonlyMap<string, string>; received: number; name: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const green = useRef<HTMLSpanElement>(null);
    const red = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        if (!container.current) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);
    const layout = packetGridLayout(total, width || 320);
    useEffect(() => {
        if (!canvas.current || !green.current || !red.current || !width) return;
        const grid = packetGrid(total, file, parts, width);
        const target = canvas.current;
        target.width = grid.columns;
        target.height = grid.rows;
        const context = target.getContext('2d');
        if (!context || !grid.columns || !grid.rows) return;
        const color = (element: HTMLElement) => {
            context.fillStyle = getComputedStyle(element).backgroundColor;
            context.fillRect(0, 0, 1, 1);
            return context.getImageData(0, 0, 1, 1).data;
        };
        const receivedColor = color(green.current);
        const missingColor = color(red.current);
        const image = context.createImageData(grid.columns, grid.rows);
        grid.pixels.forEach((state, pixel) => {
            if (state) image.data.set(state === 2 ? receivedColor : missingColor, pixel * 4);
        });
        context.putImageData(image, 0, 0);
    }, [total, file, parts, received, width]);
    return (
        <div ref={container} className="min-w-0 w-full space-y-2">
            <span ref={green} className="hidden bg-green-600" />
            <span ref={red} className="hidden bg-red-500" />
            <canvas
                ref={canvas}
                role="img"
                aria-label={`${name}: ${received.toLocaleString()} of ${total.toLocaleString()} packets received. Green means received; red means missing.`}
                className="block max-w-full"
                style={{ width: layout.columns * layout.scale, height: layout.rows * layout.scale, imageRendering: 'pixelated' }}
            />
            <p className="text-xs text-gray-600">
                {layout.packetsPerPixel === 1
                    ? `All ${total.toLocaleString()} packets shown. One square per packet.`
                    : `All ${total.toLocaleString()} packets shown. Up to ${layout.packetsPerPixel} packets per pixel; green means all have arrived.`}
            </p>
        </div>
    );
}
