import React from 'react';
import { SolverResult } from '../solver/solver';

interface CombinationComponentProps {
    combination: SolverResult;
}

function CombinationComponent({ combination }: CombinationComponentProps) {
    // Calculate summed components
    const summedComponents = combination.supplements.reduce((acc, [count, supplement]) => {
        supplement.ingredients.forEach((ingredient) => {
            acc[ingredient.name] = (acc[ingredient.name] || 0) + ingredient.amount * count;
        });
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Distance</p>
                    <p className="text-lg font-semibold text-gray-900">{combination.distance.toFixed(2)} (lower is better)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Supplements</p>
                    <p className="text-lg font-semibold text-gray-900">{combination.numberOfSupplements}</p>
                </div>
            </div>

            <div className="space-y-2">
                {combination.supplements.map(([count, supplement], idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                        <span className="font-bold text-blue-500">{count}×</span>
                        <span className="text-gray-900">{supplement.name}</span>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Summed</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Object.keys(summedComponents).map((key) => (
                            <tr key={key} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{summedComponents[key]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{combination.constraints[key]?.target === -1 ? '-' : combination.constraints[key]?.target ?? '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{combination.constraints[key]?.max ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CombinationComponent;
