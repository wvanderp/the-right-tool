import React, { useState } from 'react';
import { Constraint } from '../../repository/ConstraintRepository';
import names from '../../repository/NamesRepository';
import { NumberField } from '../fields/numberField';

interface ConstraintFormProps {
  onAddConstraint: (constraint: Constraint) => void;
  onClose: () => void;
  constraint?: Constraint;
}

function ConstraintForm({ onAddConstraint, onClose, constraint }: ConstraintFormProps) {
  const [name, setName] = useState(constraint?.name || '');
  const [target, setTarget] = useState(constraint?.target || 0);
  const [max, setMax] = useState(constraint?.max || 0);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name) {
      setError('Name is required');
      return;
    }
    setError('');
    const newConstraint: Constraint = {
      id: constraint?.id || Date.now(),
      name,
      target,
      max,
    };
    onAddConstraint(newConstraint);
    onClose();
  };

  const isFormValid = name;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{constraint ? 'Edit' : 'Add'} Constraint</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 mb-2 border border-gray-300 rounded"
        >
          <option value="">Select Ingredient</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <h2>Target</h2>
        <NumberField
          value={target}
          onChange={(value) => setTarget(value ?? 0)}
          className="w-full p-2 mb-4 border border-gray-300 rounded"
          placeholder="Target"
        />
        <h2>Max</h2>
        <NumberField
          value={max}
          onChange={(value) => setMax(value ?? 0)}
          className="w-full p-2 mb-4 border border-gray-300 rounded"
          placeholder="Max"
        />
        <button
          onClick={handleSubmit}
          className={`w-full p-2 mb-4 text-white rounded ${isFormValid ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!isFormValid}
        >
          {constraint ? 'Update' : 'Add'} Constraint
        </button>
        <button
          onClick={onClose}
          className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default ConstraintForm;
