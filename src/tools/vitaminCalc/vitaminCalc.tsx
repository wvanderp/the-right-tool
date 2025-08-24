import React, { useState } from 'react';
import SupplementList from './components/Supplement/SupplementList';
import ConstraintList from './components/Constraint/ConstraintList';
import CalculationColumn from './components/CalculationColumn';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import SupplementRepository from './repository/SupplementRepository';
import ConstraintRepository, { RequirementRepository } from './repository/ConstraintRepository';

type TabId = 'supplements' | 'requirements' | 'calculations';

export default function App(): React.ReactElement {
  const handleExport = () => {
    try {
      const supplementRepo = new SupplementRepository();
      const constraintRepo = new ConstraintRepository();
      const requirementRepo = new RequirementRepository();

      const data = {
        timestamp: new Date().toISOString(),
        supplements: supplementRepo.getAllSupplements(),
        constraints: constraintRepo.getAllConstraints(),
        requirements: requirementRepo.getAllRequirements(),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vitamin-data-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Best-effort feedback
      console.error('Export failed', err);
      alert('Export failed. See console for details.');
    }
  };

  const [selectedTab, setSelectedTab] = useState<TabId>('calculations');

  return (
    <ToolPage title="Vitamin Calculator">
      <ToolDescription>
        Calculate combinations of supplements to reach nutrient requirements. Add supplements, set requirements and
        see suggested combinations and calculated totals.
      </ToolDescription>

      <div className="space-y-6 w-full max-w-10xl">
        <div className="flex items-center justify-between">
          <div role="tablist" aria-label="Vitamin calculator steps" className="flex space-x-2">
            {/* Simple tab buttons for each step */}
            <TabButton label="Supplements" id="supplements" />
            <TabButton label="Requirements" id="requirements" />
            <TabButton label="Calculations" id="calculations" />
          </div>

          <div>
            <button
              onClick={handleExport}
              className="btn-secondary"
              title="Export current data"
            >
              Export Data
            </button>
          </div>
        </div>

        <div>
          {/* Panels: only the active panel is rendered for a cleaner single-screen flow */}
          <div className="mt-4">
            {renderActivePanel()}
          </div>
        </div>
      </div>
    </ToolPage>
  );

  function TabButton({ label, id }: { label: string; id: TabId }) {
    const selected = selectedTab === id;
    return (
      <button
        role="tab"
        aria-selected={selected}
        aria-controls={`${id}-panel`}
        id={`${id}-tab`}
        onClick={() => setSelectedTab(id)}
        className={selected ? 'btn btn-primary' : 'btn btn-secondary'}
      >
        {label}
      </button>
    );
  }

  function renderActivePanel(): React.ReactElement {
    switch (selectedTab) {
      case 'supplements':
        return (
          <div id="supplements-panel" role="tabpanel" aria-labelledby="supplements-tab" className="card">
            <h2 className="text-lg font-semibold mb-4">Supplements</h2>
            <SupplementList />
          </div>
        );
      case 'requirements':
        return (
          <div id="requirements-panel" role="tabpanel" aria-labelledby="requirements-tab" className="card">
            <h2 className="text-lg font-semibold mb-4">Requirements & Constraints</h2>
            <ConstraintList />
          </div>
        );
      case 'calculations':
      default:
        return (
          <div id="calculations-panel" role="tabpanel" aria-labelledby="calculations-tab" className="card">
            <h2 className="text-lg font-semibold mb-4">Calculations</h2>
            <CalculationColumn />
          </div>
        );
    }
  }
}
