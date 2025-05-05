import React, { useState } from "react";
import ToolPage from "../../components/ToolPage";
import ToolDescription from "../../components/ToolDescription";
import { extractExifDataFromFile, ExifData } from "./exifExtractorLogic";
import ExifSummary from "./ExifSummary";

export default function ExifExtractor() {
  const [result, setResult] = useState<ExifData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Handle file input change and trigger extraction automatically
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResult(null);
      setError(null);
      const file = e.target.files[0];
      setSelectedFile(file);
      const { data, error } = await extractExifDataFromFile(file);
      if (error) {
        setError(error);
      } else {
        setResult(data);
      }
    }
  };
  const handleCopyJson = () => {
    if (result) {
      navigator.clipboard
        .writeText(JSON.stringify(result, null, 2))
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
    }
  };

  return (
    <ToolPage title="EXIF Extractor">
      <ToolDescription>
        Select an image file to instantly extract and view its embedded EXIF
        metadata directly in your browser. This tool works entirely locally and
        does not upload your files. Supported formats include JPEG, TIFF, and
        some RAW images. Use this to inspect camera settings, capture dates, GPS
        coordinates, and more.
      </ToolDescription>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Upload and Summary Section */}
        <div className="lg:col-span-1">
          <div className="mb-4">
            <label
              htmlFor="exif-file"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Image File
            </label>
            <input
              id="exif-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full mb-4 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-white hover:file:bg-yellow-700 focus:outline-none cursor-pointer transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your image is never uploaded. Extraction happens instantly in your
              browser.
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {/* Summary appears right under file input on the same column */}
          {result && (
            <ExifSummary exif={result} imageFile={selectedFile ?? undefined} />
          )}
        </div>

        {/* JSON Data Section - Takes 2/3 of the grid on large screens */}
        {result && (
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="exif-output"
                  className="block text-sm font-medium text-gray-700"
                >
                  Raw EXIF Data
                </label>
                <button
                  onClick={handleCopyJson}
                  className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                >
                  {isCopied ? "Copied!" : "Copy JSON"}
                </button>
              </div>{" "}
              <textarea
                id="exif-output"
                value={JSON.stringify(result, null, 2)}
                readOnly
                className="w-full p-3 border border-gray-300 rounded bg-gray-50 font-mono text-sm"
                rows={20}
              />
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
