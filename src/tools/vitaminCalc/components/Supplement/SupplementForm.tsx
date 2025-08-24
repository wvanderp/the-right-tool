import { useState, useRef, useEffect } from 'react';
import { Supplement } from '../../repository/SupplementRepository';
import { FaTrash, FaPlus } from 'react-icons/fa';
import names from '../../repository/NamesRepository';
import { NumberField } from '../fields/NumberField';
import ModalForm from '../Common/ModalForm';

interface SupplementFormProps {
  onAddSupplement: (supplement: Supplement) => void;
  onClose: () => void;
  supplement?: Supplement;  // Add this line
}

function SupplementForm({ onAddSupplement, onClose, supplement }: SupplementFormProps) {
  const [name, setName] = useState(supplement?.name || '');
  const [maker, setMaker] = useState(supplement?.maker || '');
  const [image, setImage] = useState(supplement?.image || '');
  const [ingredients, setIngredients] = useState(supplement?.ingredients || [{ name: '', amount: 0 }]);
  const [error, setError] = useState('');
  const amountRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0 }]);
    // focus will be applied by effect after ingredients update
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  useEffect(() => {
    // ensure amountRefs length matches ingredients
    amountRefs.current = amountRefs.current.slice(0, ingredients.length);
  }, [ingredients.length]);

  const handleSubmit = () => {
    if (!name) {
      setError('Name is required');
      return;
    }
    if (ingredients.length === 0) {
      setError('Add at least one ingredient with a non-zero amount');
      return;
    }
    if (ingredients.some(ingredient => !ingredient.name || !ingredient.amount || ingredient.amount <= 0)) {
      setError('All ingredients must have a name and an amount greater than zero');
      return;
    }
    setError('');
    const newSupplement: Supplement = {
      id: supplement?.id || Date.now(),
      name,
      maker,
      image,
      ingredients,
    };
    onAddSupplement(newSupplement);
    onClose();
  };

  const isFormValid = Boolean(name) && ingredients.length > 0 && ingredients.every(ingredient => ingredient.name && ingredient.amount && ingredient.amount > 0);

  return (
    <ModalForm title={`${supplement ? 'Edit' : 'Add'} Supplement`} onClose={onClose} error={error}>
      <div className="mb-4">
        <label className="text-sm text-gray-500">Name</label>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded" />
      </div>
      <div className="mb-4">
        <label className="text-sm text-gray-500">Maker</label>
        <input
          type="text"
          placeholder="Maker"
          value={maker}
          onChange={(e) => setMaker(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded" />
      </div>
      <div className="mb-4">
        <label className="text-sm text-gray-500">Image URL</label>
        <input
          type="text"
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded" />
      </div>
      <h3 className="text-xl font-semibold mb-2 flex items-center">
        Ingredients
      </h3>
      {ingredients.map((ingredient, index) => (
        <div key={index} className="mb-8">
          <label className="text-sm text-gray-500">Ingredient</label>
          <select
            value={ingredient.name}
            onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
            className="w-full p-2 mb-2 border border-gray-300 rounded"
          >
            <option value="">Select Ingredient</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="text-sm text-gray-500">Amount</label>
          <div className="flex items-center gap-2">
            <NumberField
              ref={(el) => { amountRefs.current[index] = el; }}
              autoFocus={ingredient.name !== '' && ingredient.amount === 0}
              value={ingredient.amount}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // try to add a new ingredient when pressing Enter on amount
                  handleAddIngredient();
                  // small timeout to focus next amount input
                  setTimeout(() => amountRefs.current[amountRefs.current.length - 1]?.focus(), 50);
                }
              }}
              onChange={(value) => handleIngredientChange(index, 'amount', value ?? 0)}
              className="w-full p-2 border border-gray-300 rounded" />
            <span className="text-sm text-gray-600" aria-hidden="true">mg</span>
            <button
              className="text-gray-500 hover:text-red-500"
              onClick={() => handleRemoveIngredient(index)}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => {
          handleAddIngredient();
          // focus next amount input after render
          setTimeout(() => amountRefs.current[amountRefs.current.length - 1]?.focus(), 50);
        }}
        aria-describedby={!isFormValid ? 'supplement-form-help' : undefined}
        title={!isFormValid ? 'Complete required fields to enable adding/updating' : 'Add ingredient'}
        className="flex items-center gap-2 w-full justify-center p-2 mb-4 text-gray-600 hover:text-green-600 border border-dashed border-gray-300 rounded hover:border-green-500"
      >
        <FaPlus /> Add Ingredient
      </button>

      <div className="border-t border-gray-200 my-4"></div>

      <div id="supplement-form-help" className="text-sm text-gray-500 mb-2">
        {isFormValid ? 'Ready to add' : 'Fill name and at least one ingredient with amount > 0'}
      </div>
      <button
        onClick={handleSubmit}
        className={`w-full p-2 mb-4 text-white rounded ${isFormValid ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
        disabled={!isFormValid}
      >
        {supplement ? 'Update' : 'Add'} Supplement
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

export default SupplementForm;
