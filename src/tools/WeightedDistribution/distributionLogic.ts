import { DistributionItem, DistributionConfig } from './types';

export class DistributionCalculator {
    static calculate(config: DistributionConfig): DistributionItem[] {
        const { totalAmount, items } = config;

        const lockedTotal = items.reduce((sum, item) =>
            item.locked ? sum + item.weight : sum, 0);

        // Distribution is invalid if locked items exceed 100%
        if (lockedTotal > 100) {
            return items.map(item => ({
                ...item,
                value: (item.weight / 100) * totalAmount,
                isValid: false
            }));
        }

        // Calculate total percentage (should be 100)
        const totalPercentage = items.reduce((sum, item) => sum + item.weight, 0);

        // Calculate values based on percentage weights
        return items.map(item => ({
            ...item,
            value: Math.round((item.weight / 100) * totalAmount * 100) / 100,
            isValid: totalPercentage === 100
        }));
    }

    static normalizeWeights(items: DistributionItem[], skipIndex?: number): DistributionItem[] {
        const lockedItems = items.filter(item => item.locked);
        const unlockedItems = items.filter((item, index) => !item.locked && index !== skipIndex);

        const lockedTotal = lockedItems.reduce((sum, item) => sum + item.weight, 0);
        const skipItemWeight = skipIndex !== undefined ? items[skipIndex]?.weight || 0 : 0;
        const remainingPercentage = 100 - lockedTotal - skipItemWeight;

        if (remainingPercentage <= 0) {
            return items.map((item, index) => ({
                ...item,
                weight: item.locked ? item.weight : index === skipIndex ? item.weight : 0
            }));
        }

        // Calculate total weight of unlocked items
        const unlockedTotal = unlockedItems.reduce((sum, item) => sum + item.weight, 0);

        // If all unlocked items have 0 weight, distribute evenly
        if (unlockedTotal === 0) {
            const equalShare = remainingPercentage / unlockedItems.length;
            return items.map((item, index) => {
                if (item.locked || index === skipIndex) return item;
                return {
                    ...item,
                    weight: Math.round(equalShare * 10) / 10
                };
            });
        }

        // Scale weights proportionally
        return items.map((item, index) => {
            if (item.locked || index === skipIndex) return item;
            const scaledWeight = (item.weight / unlockedTotal) * remainingPercentage;
            return {
                ...item,
                weight: Math.round(scaledWeight * 10) / 10
            };
        });
    }
}
