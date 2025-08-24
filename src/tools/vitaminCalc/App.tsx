import React from 'react';
import SupplementList from './components/Supplement/SupplementList';
import ConstraintList from './components/Constraint/ConstraintList';
import CalculationColumn from './components/CalculationColumn';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';

export default function App(): React.ReactElement {
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  };

  return (
    <ToolPage title="Vitamin Calculator">
      <ToolDescription>
        Calculate combinations of supplements to reach nutrient requirements. Add supplements, set requirements and
        see suggested combinations and calculated totals.
      </ToolDescription>

      <div className="space-y-6 w-full max-w-4xl">
        <div className="flex items-center justify-end">
          <button
            onClick={handleExport}
            className="btn-secondary"
            title="Export current data"
          >
            Export Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Supplements</h2>
            <SupplementList />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Requirements & Constraints</h2>
            <ConstraintList />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Calculations</h2>
            <CalculationColumn />
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
