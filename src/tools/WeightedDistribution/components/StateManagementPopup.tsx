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
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg w-96 shadow-lg border border-gray-200">
                <h2 className="text-xl font-medium text-gray-900 mb-6">State Management</h2>
                
                <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-2">Current State:</h3>
                    <textarea
                        readOnly
                        value={currentState}
                        className="w-full h-32 p-3 border border-gray-200 rounded-lg font-mono text-sm bg-gray-50"
                    />
                </div>

                <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-2">Load State:</h3>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm
                        focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                        outline-none transition-all duration-200"
                        placeholder="Paste JSON here..."
                    />
                    {error && (
                        <p className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-md">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                        transition-all duration-200 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleLoadState}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 
                        transition-all duration-200 font-medium"
                    >
                        Load
                    </button>
                </div>
            </div>
        </div>
    );
}
