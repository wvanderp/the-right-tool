import React, { useState } from 'react';
import { DistributionItem } from './types';
import { DistributionCalculator } from './distributionLogic';
import { EditableField } from './components/EditableField';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';

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

    const handleWeightEdit = (index: number, value: string) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            updateWeight(index, numValue);
        }
    };

    const handleValueEdit = (index: number, value: string) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            const percentage = (numValue / totalAmount) * 100;
            updateWeight(index, percentage);
        }
    };

    const totalPercentage = items.reduce((sum, item) => sum + item.weight, 0);
    const isValid = Math.round(totalPercentage) === 100;

    return (
        <ToolPage title="Weighted Distribution">
            <ToolDescription>
                This tool helps you distribute a total amount across multiple items using percentage-based weights. 
                Each item can be assigned a percentage of the total, and you can lock specific items to preserve 
                their allocation while automatically redistributing the remaining percentage among unlocked items. 
                Simply enter a total amount, add items, and adjust their weights using sliders or direct input. 
                The tool ensures the total always equals 100% and provides real-time validation feedback.
            </ToolDescription>
            
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
                                    className={`px-2 py-1 rounded hover:bg-gray-300
                                        ${
                                        item.locked 
                                            ? 'bg-yellow-500 text-white' 
                                            : 'bg-gray-200'
                                    }`}
                                >
                                    {item.locked ? '🔒' : '🔓'}
                                </button>
                                <button
                                    onClick={() => removeItem(index)}
                                    className="px-2 py-1 rounded bg-gray-200 hover:bg-red-500 text-red-700"
                                >
                                    🗑️
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
                            <div className="w-24">
                                <EditableField
                                    value={item.weight}
                                    onChange={(value) => handleWeightEdit(index, value)}
                                    suffix="%"
                                    step="0.1"
                                    max={calculateAvailablePercentage(index)}
                                />
                            </div>
                            <div className="w-32">
                                <EditableField
                                    value={item.value || 0}
                                    onChange={(value) => handleValueEdit(index, value)}
                                    step="0.01"
                                    align="right"
                                    max={totalAmount}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addItem}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
            >
                Add Item
            </button>
        </ToolPage>
    );
}
