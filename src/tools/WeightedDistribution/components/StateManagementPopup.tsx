import React, { useState } from 'react';

interface StateManagementPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadState: (state: string) => void;
    currentState: string;
}

export function StateManagementPopup({ isOpen, onClose, onLoadState, currentState }: StateManagementPopupProps) {
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleLoadState = () => {
        try {
            JSON.parse(jsonInput); // Validate JSON
            onLoadState(jsonInput);
            setError('');
            onClose();
        } catch (e) {
            setError('Invalid JSON format');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded w-96">
                <h2 className="text-lg font-bold mb-4">State Management</h2>
                
                <div className="mb-4">
                    <h3 className="font-bold mb-2">Current State:</h3>
                    <textarea
                        readOnly
                        value={currentState}
                        className="w-full h-32 p-2 border rounded font-mono text-sm"
                    />
                </div>

                <div className="mb-4">
                    <h3 className="font-bold mb-2">Load State:</h3>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="w-full h-32 p-2 border rounded font-mono text-sm"
                        placeholder="Paste JSON here..."
                    />
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={handleLoadState}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
                    >
                        Load
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
