import { useState } from 'react';
import { FaDownload, FaTimes, FaUpload } from 'react-icons/fa';

interface VitaminDataDialogProps {
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}

export default function VitaminDataDialog({
  onClose,
  onExport,
  onImport,
}: VitaminDataDialogProps): React.ReactElement {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!selectedFile) return;

    setError('');
    setIsImporting(true);

    try {
      await onImport(selectedFile);
      onClose();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'The data could not be imported.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vitamin-data-dialog-title"
        className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="vitamin-data-dialog-title" className="text-xl font-bold text-gray-900">
              Manage Vitamin Data
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Keep a local backup or restore a previously exported file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 transition-custom hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close the data dialog."
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">Export Data</h3>
            <p className="mb-4 mt-1 text-sm text-gray-600">
              Download all supplements, constraints, and required supplements as one JSON file.
            </p>
            <button type="button" onClick={onExport} className="btn-secondary inline-flex items-center gap-2">
              <FaDownload aria-hidden="true" />
              Export Data
            </button>
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">Import Data</h3>
            <p className="mb-4 mt-1 text-sm text-gray-600">
              Select a Vitamin Calculator JSON backup. Importing it replaces the currently saved data.
            </p>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-gray-600 transition-custom hover:border-yellow-500 hover:bg-yellow-50">
              <FaUpload className="text-xl" aria-hidden="true" />
              <span className="text-sm font-medium">
                {selectedFile ? selectedFile.name : 'Choose a JSON backup.'}
              </span>
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setError('');
                }}
              />
            </label>

            {error && (
              <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="btn-primary mt-4 inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaUpload aria-hidden="true" />
              {isImporting ? 'Importing…' : 'Import Data'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
