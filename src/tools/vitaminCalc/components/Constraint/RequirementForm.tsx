import React, { useState, useEffect } from 'react';
import { RequirementConstraint } from '../../repository/ConstraintRepository';
import SupplementRepository, { Supplement } from '../../repository/SupplementRepository';

interface RequirementFormProps {
    onAddRequirement: (requirement: RequirementConstraint) => void;
    onClose: () => void;
    requirement?: RequirementConstraint;
}

function RequirementForm({ onAddRequirement, onClose, requirement }: RequirementFormProps) {
    const [amount, setAmount] = useState(requirement?.amount || 0);
    const [supplementId, setSupplementId] = useState<number | undefined>(requirement?.supplementId);
    const [supplements, setSupplements] = useState<Supplement[]>([]);

    useEffect(() => {
        const repository = new SupplementRepository();
        setSupplements(repository.getAllSupplements());
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (supplementId !== undefined) {
            const newRequirement: RequirementConstraint = {
                id: requirement?.id || Date.now(),
                amount,
                supplementId,
            };
            onAddRequirement(newRequirement);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md max-h-full overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">{requirement ? 'Edit' : 'Add'} Requirement</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700">Supplement</label>
                        <select
                            value={supplementId}
                            onChange={(e) => setSupplementId(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded"
                        >
                            <option value={undefined}>Select Supplement</option>
                            {supplements.map((supplement) => (
                                <option key={supplement.id} value={supplement.id}>
                                    {supplement.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700">Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded" />
                    </div>
                    <button
                        type="submit"
                        className="w-full p-2 mb-4 text-white bg-green-500 rounded hover:bg-green-600"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}

export default RequirementForm;
