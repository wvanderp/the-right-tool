import { describe, expect, it } from 'vitest';
import { packetGrid, packetGridLayout } from '../packetGrid';

describe('Compact packet progress', () => {
    it('fits 28,000 individually represented packets in a short desktop or mobile panel', () => {
        for (const width of [240, 320, 480, 800]) {
            const grid = packetGridLayout(28000, width);
            expect(grid.packetsPerPixel).toBe(1);
            expect(grid.cells).toBe(28000);
            expect(grid.columns * grid.scale).toBeLessThanOrEqual(width);
            expect(grid.rows * grid.scale).toBeLessThanOrEqual(160);
        }
    });

    it('marks every individual packet correctly, including the final row and different files', () => {
        const parts = new Map([['0:0', 'a'], ['0:27999', 'b'], ['1:1', 'c']]);
        const grid = packetGrid(28000, 0, parts, 320);
        expect(grid.pixels[0]).toBe(2);
        expect(grid.pixels[1]).toBe(1);
        expect(grid.pixels[27999]).toBe(2);
        expect([...grid.pixels.slice(28000)].every(pixel => pixel === 0)).toBe(true);
        expect(grid.pixels.filter(pixel => pixel === 2).length).toBe(2);
    });

    it('bounds very large grids, keeping a grouped pixel red until all its packets arrive', () => {
        const parts = new Map([['0:0', 'a']]);
        const grid = packetGrid(1000001, 0, parts, 240);
        expect(grid.packetsPerPixel).toBeGreaterThan(1);
        expect(grid.columns * grid.scale).toBeLessThanOrEqual(240);
        expect(grid.rows * grid.scale).toBeLessThanOrEqual(160);
        expect(grid.pixels[0]).toBe(1);
        for (let i = 1; i < grid.packetsPerPixel; i++) parts.set(`0:${i}`, 'a');
        expect(packetGrid(1000001, 0, parts, 240).pixels[0]).toBe(2);
        for (let i = (grid.cells - 1) * grid.packetsPerPixel; i < 1000001; i++) parts.set(`0:${i}`, 'a');
        expect(packetGrid(1000001, 0, parts, 240).pixels[grid.cells - 1]).toBe(2);
    });

    it('handles empty files and tiny containers without invalid dimensions', () => {
        expect(packetGrid(0, 0, new Map(), 0).pixels).toHaveLength(0);
        const tiny = packetGrid(28000, 0, new Map(), 1);
        expect(tiny.columns).toBe(1);
        expect(tiny.rows).toBeLessThanOrEqual(160);
        expect(tiny.pixels.every(pixel => pixel === 1)).toBe(true);
    });
});
