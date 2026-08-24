import React, { useState } from 'react';
import SupplementList from './components/Supplement/SupplementList';
import ConstraintList from './components/Constraint/ConstraintList';
import CalculationColumn from './components/CalculationColumn';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import SupplementRepository from './repository/SupplementRepository';
import ConstraintRepository, { RequirementRepository } from './repository/ConstraintRepository';
import { FaDatabase } from 'react-icons/fa';
import VitaminDataDialog from './components/VitaminDataDialog';
import { createVitaminDataFile, parseVitaminDataFile, storeVitaminData } from './vitaminData';

type TabId = 'supplements' | 'requirements' | 'calculations';

export default function App(): React.ReactElement {
  const [selectedTab, setSelectedTab] = useState<TabId>('calculations');
  const [isDataDialogOpen, setIsDataDialogOpen] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleExport = () => {
    try {
      const supplementRepo = new SupplementRepository();
      const constraintRepo = new ConstraintRepository();
      const requirementRepo = new RequirementRepository();

      const data = createVitaminDataFile(
        supplementRepo.getAllSupplements(),
        constraintRepo.getAllConstraints(),
        requirementRepo.getAllRequirements(),
      );

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
      alert('Export failed. See the console for details.');
    }
  };

  const handleImport = async (file: File) => {
    const importedData = parseVitaminDataFile(await file.text());
    storeVitaminData(importedData);
    setDataRevision((revision) => revision + 1);
    setStatusMessage('Vitamin data imported successfully.');
  };

  return (
    <ToolPage title="Vitamin Calculator">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setIsDataDialogOpen(true)}
          className="rounded-lg p-2 text-gray-500 transition-custom hover:bg-gray-100 hover:text-gray-900"
          title="Import or export Vitamin data."
          aria-label="Import or export Vitamin data."
        >
          <FaDatabase className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <ToolDescription>
        Calculate combinations of supplements to reach nutrient requirements. Add supplements, set requirements and
        see suggested combinations and calculated totals.
      </ToolDescription>

      {statusMessage && (
        <div role="status" className="mb-6 w-full max-w-10xl rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
          {statusMessage}
        </div>
      )}

      <div className="space-y-6 w-full max-w-10xl">
        <div className="flex items-center">
          <div role="tablist" aria-label="Vitamin calculator steps" className="flex space-x-2">
            {/* Simple tab buttons for each step */}
            <TabButton label="Supplements" id="supplements" />
            <TabButton label="Requirements" id="requirements" />
            <TabButton label="Calculations" id="calculations" />
          </div>

        </div>

        <div>
          {/* Panels: only the active panel is rendered for a cleaner single-screen flow */}
          <div key={dataRevision} className="mt-4">
            {renderActivePanel()}
          </div>
        </div>
      </div>

      {isDataDialogOpen && (
        <VitaminDataDialog
          onClose={() => setIsDataDialogOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
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
