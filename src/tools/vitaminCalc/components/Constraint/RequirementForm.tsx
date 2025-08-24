import React, { useState, useEffect } from 'react';
import { RequirementConstraint } from '../../repository/ConstraintRepository';
import SupplementRepository, { Supplement } from '../../repository/SupplementRepository';
import ModalForm from '../Common/ModalForm';

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
        <ModalForm title={`${requirement ? 'Edit' : 'Add'} Requirement`} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700">Supplement</label>
                    <select
                        value={supplementId ?? ''}
                        onChange={(e) => setSupplementId(e.target.value === '' ? undefined : Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded"
                    >
                        <option value="">Select Supplement</option>
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
        </ModalForm>
    );
}

export default RequirementForm;
