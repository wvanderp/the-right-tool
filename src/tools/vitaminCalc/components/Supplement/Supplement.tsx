import React from 'react';
import { Supplement } from '../../repository/SupplementRepository';

interface SupplementProps {
  supplement: Supplement;
}

function SupplementComponent({ supplement }: SupplementProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{supplement.name}</h3>
                <span className="text-sm text-gray-500">{supplement.maker}</span>
            </div>
            {supplement.image && (
                <img 
                    src={supplement.image} 
                    alt={supplement.name} 
                    style={{ width: '150px', height: '150px' }}
                    className="w-full h-40 rounded-md"
                />
            )}
            <ul className="divide-y divide-gray-100">
                {supplement.ingredients.map((ingredient, index) => (
                    <li key={index} className="py-2 flex justify-between">
                        <span className="text-gray-900">{ingredient.name}</span>
                        <span className="text-gray-500">{ingredient.amount} mg</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default SupplementComponent;
