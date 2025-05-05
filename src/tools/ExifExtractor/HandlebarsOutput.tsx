import React, { useState } from "react";
import Handlebars from "handlebars";
import ToolDescription from "../../components/ToolDescription";

interface HandlebarsOutputProps {
  exif: Record<string, unknown>[];
}

/**
 * Allows the user to generate custom output from EXIF data using a Handlebars template.
 */
export default function HandlebarsOutput({ exif }: HandlebarsOutputProps) {
  const [template, setTemplate] = useState(
    "Camera: {{Make}} {{Model}}\nExposure: {{ExposureTime}} sec @ f/{{FNumber}} ISO {{ISO}}\nDate: {{DateTimeOriginal}}\nLocation: {{GPSLatitude}}, {{GPSLongitude}}\n"
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  const data = exif && exif.length > 0 ? exif[0] : {};

  // Update output automatically when exif or template changes
  React.useEffect(() => {
    setError(null);
    try {
      const compiled = Handlebars.compile(template);
      setOutput(compiled(data));
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message || "Failed to render template.");
      } else {
        setError("Failed to render template.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, exif]);

  return (
    <div className="mt-4">
      <button
        className="text-sm text-yellow-700 underline hover:text-yellow-800 w-fit mb-2"
        type="button"
        onClick={() => setShowCard((v) => !v)}
      >
        {showCard ? "Hide Custom Output" : "Show Custom Output"}
      </button>
      {showCard && (
        <div className="bg-white border border-gray-200 rounded p-4 mt-2">
          <ToolDescription>
            Create a custom output using a Handlebars template. Use{" "}
            <code>{"{{key}}"}</code> to reference EXIF fields.
            <br />
            Example: <code>{"{{Make}} {{Model}}"}</code>
          </ToolDescription>
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm focus:ring-yellow-500 focus:border-yellow-500 mb-2"
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Enter Handlebars template..."
            />
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            {output && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded bg-gray-50 font-mono text-sm"
                  rows={4}
                  value={output}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
