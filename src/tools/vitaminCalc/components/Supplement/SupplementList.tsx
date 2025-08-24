import { useEffect, useMemo, useState } from 'react';
import SupplementRepository, { Supplement } from '../../repository/SupplementRepository';
import SupplementComponent from './Supplement';
import SupplementForm from './SupplementForm';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { FaBan } from 'react-icons/fa';

function SupplementList() {
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplement, setEditingSupplement] = useState<Supplement | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const repository = new SupplementRepository();
        setSupplements(repository.getAllSupplements());
    }, []);

    const handleAddSupplement = (supplement: Supplement) => {
        const repository = new SupplementRepository();
        if (editingSupplement) {
            repository.updateSupplement(supplement);
        } else {
            repository.addSupplement(supplement);
        }
        setSupplements(repository.getAllSupplements());
        setEditingSupplement(undefined);
    };

    const handleEditSupplement = (supplement: Supplement) => {
        setEditingSupplement(supplement);
        setShowForm(true);
    };

    const handleDeleteSupplement = (id: number) => {
        const repository = new SupplementRepository();
        repository.removeSupplement(id);
        setSupplements(repository.getAllSupplements());
    };

    const handleToggleDisabled = (id: number, disabled: boolean) => {
        const repository = new SupplementRepository();
        repository.setSupplementDisabled(id, disabled);
        setSupplements(repository.getAllSupplements());
    };

    const filteredSupplements = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return supplements;

        return supplements.filter((s) => {
            if (s.name && s.name.toLowerCase().includes(q)) return true;
            if (s.ingredients && s.ingredients.some((ing) => ing.name.toLowerCase().includes(q))) return true;
            return false;
        });
    }, [supplements, searchQuery]);

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex items-center space-x-3 mb-4">
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                    Add Supplement
                </button>
                <input
                    aria-label="Filter supplements"
                    className="input input-bordered w-full max-w-xs"
                    placeholder="Filter by name or ingredient"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button
                        className="btn-ghost text-sm"
                        onClick={() => setSearchQuery('')}
                        title="Clear filter"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-auto mt-2">
                <div className="grid grid-cols-1 gap-6">
                    {filteredSupplements.map((supplement) => (
                        <div key={supplement.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl p-6 border border-gray-200 transition-shadow duration-300">
                            <SupplementComponent supplement={supplement} />
                            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 space-x-2">
                                <button
                                    className="text-gray-400 hover:text-blue-500 transition-colors duration-200"
                                    onClick={() => handleEditSupplement(supplement)}
                                    title="Edit supplement"
                                >
                                    <span className="sr-only">Edit</span>
                                    <FaEdit className="h-4 w-4" />
                                </button>

                                <button
                                    className={`transition-colors duration-200 ${supplement.disabled ? '' : 'text-gray-400 hover:text-yellow-600'}`}
                                    onClick={() => handleToggleDisabled(supplement.id, !supplement.disabled)}
                                    title={supplement.disabled ? 'Enable supplement' : 'Disable supplement'}
                                >
                                    <span className="sr-only">{supplement.disabled ? 'Enable' : 'Disable'}</span>
                                    <FaBan className={`h-4 w-4 ${supplement.disabled ? 'text-red-600' : ''}`} />
                                </button>

                                <button
                                    className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                                    onClick={() => handleDeleteSupplement(supplement.id)}
                                    title="Delete supplement"
                                >
                                    <span className="sr-only">Delete</span>
                                    <FaTrash className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {showForm && (
                <SupplementForm
                    onAddSupplement={handleAddSupplement}
                    onClose={() => {
                        setShowForm(false);
                        setEditingSupplement(undefined);
                    }}
                    supplement={editingSupplement}
                />
            )}
        </div>
    );
}

export default SupplementList;
