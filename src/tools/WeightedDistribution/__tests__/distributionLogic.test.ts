import { describe, it, expect } from 'vitest';
import { DistributionCalculator } from '../distributionLogic';
import { DistributionItem } from '../types';

describe('DistributionCalculator', () => {
    describe('calculate', () => {
        it('should correctly distribute amounts based on weights', () => {
            const config = {
                totalAmount: 1000,
                items: [
                    { name: 'A', weight: 50 },
                    { name: 'B', weight: 30 },
                    { name: 'C', weight: 20 }
                ]
            };

            const result = DistributionCalculator.calculate(config);

            expect(result[0].value).toBe(500);
            expect(result[1].value).toBe(300);
            expect(result[2].value).toBe(200);
        });

        it('should mark distribution as valid when total is 100%', () => {
            const config = {
                totalAmount: 1000,
                items: [
                    { name: 'A', weight: 50 },
                    { name: 'B', weight: 50 }
                ]
            };

            const result = DistributionCalculator.calculate(config);
            expect(result.every(item => item.isValid)).toBe(true);
        });

        it('should mark distribution as invalid when total is not 100%', () => {
            const config = {
                totalAmount: 1000,
                items: [
                    { name: 'A', weight: 50 },
                    { name: 'B', weight: 40 }
                ]
            };

            const result = DistributionCalculator.calculate(config);
            expect(result.every(item => item.isValid)).toBe(false);
        });

        it('should mark distribution as invalid when locked items exceed 100%', () => {
            const config = {
                totalAmount: 1000,
                items: [
                    { name: 'A', weight: 60, locked: true },
                    { name: 'B', weight: 50, locked: true },
                    { name: 'C', weight: 0 }
                ]
            };

            const result = DistributionCalculator.calculate(config);
            expect(result.every(item => !item.isValid)).toBe(true);
        });
    });

    describe('normalizeWeights', () => {
        it('should normalize weights to 100%', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 5 },
                { name: 'B', weight: 5 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(50);
            expect(result[1].weight).toBe(50);
        });

        it('should distribute evenly when all weights are zero', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 0 },
                { name: 'B', weight: 0 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(50);
            expect(result[1].weight).toBe(50);
        });

        it('should respect locked items during normalization', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 60, locked: true },
                { name: 'B', weight: 20 },
                { name: 'C', weight: 20 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(60); // Locked item should not change
            expect(result[1].weight + result[2].weight).toBe(40); // Rest should split remaining percentage
        });

        it('should preserve exact locked values', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 40, locked: true },
                { name: 'B', weight: 30 },
                { name: 'C', weight: 30 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(40); // Locked value should be exactly preserved
            expect(result[1].weight + result[2].weight).toBe(60); // Rest should total remaining percentage
        });

        it('should handle multiple locked items', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 30, locked: true },
                { name: 'B', weight: 20, locked: true },
                { name: 'C', weight: 100 } // Will be normalized to remaining 50%
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(30);
            expect(result[1].weight).toBe(20);
            expect(result[2].weight).toBe(50);
        });

        it('should set unlocked items to 0 when locked items exceed 100%', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 60, locked: true },
                { name: 'B', weight: 50, locked: true },
                { name: 'C', weight: 30 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(60);
            expect(result[1].weight).toBe(50);
            expect(result[2].weight).toBe(0);
        });

        it('should distribute remaining percentage evenly among unlocked items including zero weights', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 40, locked: true },
                { name: 'B', weight: 0 },
                { name: 'C', weight: 0 },
                { name: 'D', weight: 0 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(40); // Locked
            expect(result[1].weight).toBe(20); // Equal share of remaining 60%
            expect(result[2].weight).toBe(20); // Equal share of remaining 60%
            expect(result[3].weight).toBe(20); // Equal share of remaining 60%
        });

        it('should scale weights proportionally', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 90 },
                { name: 'B', weight: 5 },
                { name: 'C', weight: 5 }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            expect(result[0].weight).toBe(90);
            expect(result[1].weight).toBe(5);
            expect(result[2].weight).toBe(5);
        });

        it('should scale weights proportionally with locked items', () => {
            const items: DistributionItem[] = [
                { name: 'A', weight: 90 },
                { name: 'B', weight: 5 },
                { name: 'C', weight: 5 },
                { name: 'D', weight: 40, locked: true }
            ];

            const result = DistributionCalculator.normalizeWeights(items);
            // Remaining 60% should be distributed proportionally
            expect(result[0].weight).toBe(54); // 90% of 60
            expect(result[1].weight).toBe(3);  // 5% of 60
            expect(result[2].weight).toBe(3);  // 5% of 60
            expect(result[3].weight).toBe(40); // locked value unchanged
        });
    });
});
