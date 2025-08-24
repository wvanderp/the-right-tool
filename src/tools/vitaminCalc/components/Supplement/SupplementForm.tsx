import React, { useState } from 'react';
import { Supplement } from '../../repository/SupplementRepository';
import { FaTrash, FaPlus } from 'react-icons/fa';
import names from '../../repository/NamesRepository';
import { NumberField } from '../fields/NumberField';

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

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: 0 }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: string | number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleSubmit = () => {
    if (!name) {
      setError('Name is required');
      return;
    }
    if (ingredients.some(ingredient => !ingredient.name || !ingredient.amount)) {
      setError('All ingredients must be filled');
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

  const isFormValid = name && ingredients.every(ingredient => ingredient.name && ingredient.amount);


  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{supplement ? 'Edit' : 'Add'} Supplement</h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
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
                value={ingredient.amount}
                onChange={(value) => handleIngredientChange(index, 'amount', value ?? 0)}
                className="w-full p-2 border border-gray-300 rounded" />
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
          onClick={handleAddIngredient}
          className="flex items-center gap-2 w-full justify-center p-2 mb-4 text-gray-600 hover:text-green-600 border border-dashed border-gray-300 rounded hover:border-green-500"
        >
          <FaPlus /> Add Ingredient
        </button>
        
        <div className="border-t border-gray-200 my-4"></div>
        
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
      </div>
    </div>
  );
}

export default SupplementForm;
