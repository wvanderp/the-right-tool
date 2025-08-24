import React, { useState } from 'react';
import SupplementRepository, { Supplement } from '../repository/SupplementRepository';
import ConstraintRepository, { RequirementRepository } from '../repository/ConstraintRepository';
import { solve, SolverResult } from '../solver/solver';
import CombinationComponent from './CombinationComponent';

function CalculationColumn() {
  const [results, setResults] = useState<SolverResult[]>([]);

  const handleCalculate = () => {
    const supplementRepo = new SupplementRepository();
    const constraintRepo = new ConstraintRepository();
    const requiredSupplements = new RequirementRepository();
    // only include enabled supplements in calculations
    const supplements = supplementRepo.getAllSupplements().filter(s => !s.disabled);
    const constraints = constraintRepo.getAllConstraints().reduce((acc, constraint) => {
      acc[constraint.name] = { target: constraint.target, max: constraint.max };
      return acc;
    }, {} as Record<string, { target: number; max: number }>);
    const required = requiredSupplements.getAllRequirements().map((requirement) => ({
      supplement: supplements.find((s) => s.id === requirement.supplementId),
      amount: requirement.amount,
    }))
      .filter((requirement) => requirement.supplement !== undefined) as { supplement: Supplement; amount: number }[];

    const result = solve(constraints, supplements, required);
    setResults(result);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <button
        onClick={handleCalculate}
        className="btn-primary"
      >
        Calculate Combinations
      </button>
      <div className="flex-1 overflow-auto mt-6">
        {results.length > 0 && (
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Found {results.length} result{results.length !== 1 ? 's' : ''}{results.length > 10 ? ' — showing top 10' : ''}:
          </h2>
        )}
        <div className="space-y-6">
          {results
            // sort by lowest distance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10).map((result, index) => (
              <CombinationComponent key={index} combination={result} />
            ))}
        </div>
      </div>
    </div>
  );
}

export default CalculationColumn;
