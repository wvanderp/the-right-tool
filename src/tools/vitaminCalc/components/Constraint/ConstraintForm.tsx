import { useState } from 'react';
import { Constraint } from '../../repository/ConstraintRepository';
import names from '../../repository/NamesRepository';
import { NumberField } from '../fields/NumberField';
import ModalForm from '../Common/ModalForm';

interface ConstraintFormProps {
  onAddConstraint: (constraint: Constraint) => void;
  onClose: () => void;
  constraint?: Constraint;
}

function ConstraintForm({ onAddConstraint, onClose, constraint }: ConstraintFormProps) {
  const [name, setName] = useState(constraint?.name || '');
  // preserve explicit -1 target (means "no target, use as max-only")
  const [target, setTarget] = useState<number>(constraint?.target ?? 0);
  const [max, setMax] = useState<number>(constraint?.max ?? 0);
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
    <ModalForm title={`${constraint ? 'Edit' : 'Add'} Constraint`} onClose={onClose} error={error}>
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
      <label className="flex items-center mb-2">
        <input
          type="checkbox"
          checked={target === -1}
          onChange={(e) => {
            if (e.target.checked) setTarget(-1);
            else setTarget(0);
          }}
          className="mr-2"
        />
        No target (use as max-only)
      </label>
      <NumberField
        // when target === -1 show empty (null) and disable the input
        value={target === -1 ? null : target}
        onChange={(value) => setTarget(value ?? 0)}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
        placeholder="Target"
        disabled={target === -1}
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
    </ModalForm>
  );
}

export default ConstraintForm;
