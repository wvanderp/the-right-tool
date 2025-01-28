import React, { useState } from 'react';
import { DistributionItem } from './types';
import { DistributionCalculator } from './distributionLogic';

export default function WeightedDistribution(): React.ReactElement {
    const [totalAmount, setTotalAmount] = useState<number>(1000);
    const [items, setItems] = useState<DistributionItem[]>([
        { name: 'Item 1', weight: 50, locked: false },
        { name: 'Item 2', weight: 50, locked: false }
    ]);

    const distributedItems = DistributionCalculator.calculate({
        totalAmount,
        items
    });

    const addItem = () => {
        const newItems = [...items, { name: `Item ${items.length + 1}`, weight: 0, locked: false }];
        const normalizedItems = DistributionCalculator.normalizeWeights(newItems);
        setItems(normalizedItems);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        const normalizedItems = DistributionCalculator.normalizeWeights(newItems);
        setItems(normalizedItems);
    };

    const toggleLock = (index: number) => {
        const newItems = [...items];
        newItems[index].locked = !newItems[index].locked;
        setItems(newItems);
    };

    const calculateAvailablePercentage = (currentIndex: number) => {
        const lockedTotal = items.reduce((sum, item, idx) => 
            idx !== currentIndex && item.locked ? sum + item.weight : sum, 0);
        return Math.max(0, 100 - lockedTotal);
    };

    const updateWeight = (index: number, newWeight: number) => {
        const newItems = [...items];
        const item = newItems[index];
        
        if (item.locked) return;

        // Ensure weight doesn't exceed available percentage
        const availablePercentage = calculateAvailablePercentage(index);
        const clampedWeight = Math.min(Math.max(0, newWeight), availablePercentage);
        
        item.weight = Number(clampedWeight.toFixed(1));
        // Normalize other items while preserving this item's weight
        const normalizedItems = DistributionCalculator.normalizeWeights(newItems, index);
        setItems(normalizedItems);
    };

    const updateName = (index: number, name: string) => {
        const newItems = [...items];
        newItems[index].name = name;
        setItems(newItems);
    };

    const totalPercentage = items.reduce((sum, item) => sum + item.weight, 0);
    const isValid = Math.round(totalPercentage) === 100;

    return (
        <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Weighted Distribution</h1>
            
            {!isValid && (
                <div className="w-full mb-4 p-2 bg-red-100 text-red-700 rounded">
                    Total percentage must equal 100% (currently: {totalPercentage.toFixed(1)}%)
                </div>
            )}
            
            <div className="w-full mb-6">
                <label className="block mb-2">Total Amount</label>
                <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full p-2 border rounded"
                />
            </div>

            <div className="w-full space-y-4">
                {distributedItems.map((item, index) => (
                    <div key={index} className="flex flex-col p-4 border rounded">
                        <div className="flex justify-between mb-2">
                            <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateName(index, e.target.value)}
                                className="p-1 border rounded"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleLock(index)}
                                    className={`px-2 py-1 rounded ${
                                        item.locked 
                                            ? 'bg-yellow-500 text-white' 
                                            : 'bg-gray-200'
                                    }`}
                                >
                                    {item.locked ? '🔒' : '🔓'}
                                </button>
                                <button
                                    onClick={() => removeItem(index)}
                                    className="px-2 py-1 bg-red-500 text-white rounded"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max={item.locked ? item.weight : calculateAvailablePercentage(index)}
                                step="0.1"
                                value={item.weight}
                                onChange={(e) => updateWeight(index, Number(e.target.value))}
                                disabled={item.locked}
                                className={`flex-grow ${item.locked ? 'opacity-50' : ''}`}
                            />
                            <span className="w-24">
                                {item.weight.toFixed(1)}%
                            </span>
                            <span className="w-32 text-right">
                                {item.value?.toFixed(2)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addItem}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            >
                Add Item
            </button>
        </div>
    );
}
