import React, { useState, useEffect } from 'react';
import { DistributionCalculator } from './distributionLogic';
import { EditableField } from './components/EditableField';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import { StateManagementPopup } from './components/StateManagementPopup';

const DEFAULT_STATE = {
    totalAmount: 1000,
    items: [
        { name: 'Item 1', weight: 50, locked: false },
        { name: 'Item 2', weight: 50, locked: false }
    ]
};

function loadInitialState() {
    const savedState = localStorage.getItem('weightedDistributionState');
    if (savedState) {
        try {
            return JSON.parse(savedState);
        } catch (e) {
            console.error('Failed to load saved state:', e);
        }
    }
    return DEFAULT_STATE;
}

export default function WeightedDistribution(): React.ReactElement {
    const [totalAmount, setTotalAmount] = useState(() => loadInitialState().totalAmount);
    const [items, setItems] = useState(() => loadInitialState().items);
    const [isStatePopupOpen, setIsStatePopupOpen] = useState(false);
    
    useEffect(() => {
        localStorage.setItem('weightedDistributionState', JSON.stringify({
            totalAmount,
            items
        }));
    }, [totalAmount, items]);

    const handleLoadState = (stateJson: string) => {
        try {
            const { totalAmount: newAmount, items: newItems } = JSON.parse(stateJson);
            setTotalAmount(newAmount);
            setItems(newItems);
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    };

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
            <div className="absolute top-4 right-4">
                <button
                    onClick={() => setIsStatePopupOpen(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    title="Import/Export State"
                >
                    ☁
                </button>
            </div>

            <ToolDescription>
                This tool helps you distribute a total amount across multiple items using percentage-based weights. 
                Each item can be assigned a percentage of the total, and you can lock specific items to preserve 
                their allocation while automatically redistributing the remaining percentage among unlocked items. 
                Simply enter a total amount, add items, and adjust their weights using sliders or direct input. 
                The tool ensures the total always equals 100% and provides real-time validation feedback.
            </ToolDescription>
            
            {!isValid && (
                <div className="w-full mb-6 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    Total percentage must equal 100% (currently: {totalPercentage.toFixed(1)}%)
                </div>
            )}
            
            <div className="w-full mb-8">
                <label className="block mb-2 text-gray-700 font-medium">Total Amount</label>
                <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                    focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-all duration-200"
                />
            </div>

            <div className="w-full space-y-4">
                {distributedItems.map((item, index) => (
                    <div key={index} className="flex flex-col p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between mb-3">
                            <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateName(index, e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg focus:ring-2 
                                focus:ring-yellow-600/20 focus:border-yellow-600 outline-none 
                                transition-all duration-200"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleLock(index)}
                                    className={`px-3 py-2 rounded-lg transition-all duration-200
                                        ${item.locked 
                                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                >
                                    {item.locked ? '🔒' : '🔓'}
                                </button>
                                <button
                                    onClick={() => removeItem(index)}
                                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-red-100 
                                    text-gray-700 hover:text-red-600 transition-all duration-200"
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
                                className={`flex-grow accent-yellow-600 ${item.locked ? 'opacity-50' : ''}`}
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
                className="mt-6 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 
                transition-all duration-200 font-medium"
            >
                Add Item
            </button>

            <StateManagementPopup
                isOpen={isStatePopupOpen}
                onClose={() => setIsStatePopupOpen(false)}
                onLoadState={handleLoadState}
                currentState={JSON.stringify({ totalAmount, items }, null, 2)}
            />
        </ToolPage>
    );
}
