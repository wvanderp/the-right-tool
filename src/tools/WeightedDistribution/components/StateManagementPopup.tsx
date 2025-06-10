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
            <div className="bg-white p-8 rounded-lg w-96 border border-gray-200">
                <h2 className="text-xl font-medium text-gray-900 mb-6">Save or Load Configuration</h2>

                <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-2">Your Current Configuration:</h3>
                    <p className="text-sm text-gray-600 mb-2">Copy this to save your current setup:</p>
                    <textarea
                        readOnly
                        value={currentState}
                        className="w-full h-32 p-3 border border-gray-200 rounded-lg font-mono text-sm bg-gray-50"
                    />
                </div>

                <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-2">Load Saved Configuration:</h3>
                    <p className="text-sm text-gray-600 mb-2">Paste a previously saved configuration here:</p>
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm
                        focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                        outline-none transition-custom"
                        placeholder="Paste your saved configuration here..."
                    />
                    {error && (
                        <p className="text-red-600 text-sm mt-2 bg-red-50 p-2 rounded-md border border-red-100">
                            Invalid configuration format. Please check that you've copied the entire configuration correctly.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleLoadState}
                        className="btn-primary"
                        title="Load the pasted configuration"
                    >
                        Load Configuration →
                    </button>
                </div>
            </div>
        </div>
    );
}
