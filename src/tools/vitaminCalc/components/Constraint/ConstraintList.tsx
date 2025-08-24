import React, { useEffect, useState } from 'react';
import ConstraintRepository, { Constraint, RequirementConstraint, RequirementRepository } from '../../repository/ConstraintRepository';
import SupplementRepository, { Supplement } from '../../repository/SupplementRepository';
import ConstraintComponent from './Constraint';
import ConstraintForm from './ConstraintForm';
import { FaTrash, FaEdit } from 'react-icons/fa';
import RequirementForm from './RequirementForm';

function ConstraintList() {
    const [constraints, setConstraints] = useState<Constraint[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingConstraint, setEditingConstraint] = useState<Constraint | undefined>(undefined);
    const [showRequirementForm, setShowRequirementForm] = useState(false);
    const [editingRequirement, setEditingRequirement] = useState<RequirementConstraint | undefined>(undefined);
    const [requirements, setRequirements] = useState<RequirementConstraint[]>([]);
    const [supplements, setSupplements] = useState<Supplement[]>([]);

    useEffect(() => {
        const repository = new ConstraintRepository();
        setConstraints(repository.getAllConstraints());

        const requirementRepository = new RequirementRepository();
        setRequirements(requirementRepository.getAllRequirements());

        const supplementRepository = new SupplementRepository();
        setSupplements(supplementRepository.getAllSupplements());
    }, []);

    const handleAddConstraint = (constraint: Constraint) => {
        const repository = new ConstraintRepository();
        if (editingConstraint) {
            repository.updateConstraint(constraint);
        } else {
            repository.addConstraint(constraint);
        }
        setConstraints(repository.getAllConstraints());
        setEditingConstraint(undefined);
    };

    const handleEditConstraint = (constraint: Constraint) => {
        setEditingConstraint(constraint);
        setShowForm(true);
    };

    const handleDeleteConstraint = (id: number) => {
        const repository = new ConstraintRepository();
        repository.removeConstraint(id);
        setConstraints(repository.getAllConstraints());
    };

    const handleAddRequirement = (requirement: RequirementConstraint) => {
        const requirementRepository = new RequirementRepository();
        if (editingRequirement) {
            requirementRepository.updateRequirement(requirement);
        } else {
            requirementRepository.addRequirement(requirement);
        }
        setRequirements(requirementRepository.getAllRequirements());
        setShowRequirementForm(false);
        setEditingRequirement(undefined);
    };

    const handleEditRequirement = (requirement: RequirementConstraint) => {
        setEditingRequirement(requirement);
        setShowRequirementForm(true);
    };

    const handleDeleteRequirement = (id: number) => {
        const requirementRepository = new RequirementRepository();
        requirementRepository.removeRequirement(id);
        setRequirements(requirementRepository.getAllRequirements());
    };

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex gap-4">
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                    Add Constraint
                </button>
                <button className="btn-secondary" onClick={() => setShowRequirementForm(true)}>
                    Add Required Supplement
                </button>
            </div>
            <div className="flex-1 overflow-auto mt-6">
                <div className="grid grid-cols-1 gap-6">
                    {constraints.map((constraint) => (
                        <div key={constraint.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl p-6 border border-gray-200 transition-shadow duration-300">
                            <ConstraintComponent constraint={constraint} />
                            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 gap-2">
                                <button
                                    className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-2 rounded-md hover:bg-gray-50"
                                    onClick={() => handleEditConstraint(constraint)}
                                    title="Edit constraint"
                                >
                                    <FaEdit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </button>
                                <button
                                    className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 rounded-md hover:bg-gray-50"
                                    onClick={() => handleDeleteConstraint(constraint.id)}
                                    title="Delete constraint"
                                >
                                    <FaTrash className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {requirements.map((requirement) => (
                        <div key={requirement.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl p-6 border border-gray-200 transition-shadow duration-300">
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {supplements.find(s => s.id === requirement.supplementId)?.name || 'Unknown Supplement'}
                                </h3>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Required Amount:</span>
                                        <span className="font-medium text-gray-900">{requirement.amount}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 gap-2">
                                <button
                                    className="text-gray-400 hover:text-blue-500 transition-colors duration-200 p-2 rounded-md hover:bg-gray-50"
                                    onClick={() => handleEditRequirement(requirement)}
                                    title="Edit requirement"
                                >
                                    <FaEdit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                </button>
                                <button
                                    className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 rounded-md hover:bg-gray-50"
                                    onClick={() => handleDeleteRequirement(requirement.id)}
                                    title="Delete requirement"
                                >
                                    <FaTrash className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {showForm && (
                <ConstraintForm
                    onAddConstraint={handleAddConstraint}
                    onClose={() => {
                        setShowForm(false);
                        setEditingConstraint(undefined);
                    }}
                    constraint={editingConstraint}
                />
            )}
            {showRequirementForm && (
                <RequirementForm
                    onAddRequirement={handleAddRequirement}
                    onClose={() => {
                        setShowRequirementForm(false);
                        setEditingRequirement(undefined);
                    }}
                    requirement={editingRequirement}
                />
            )}
        </div>
    );
}

export default ConstraintList;
