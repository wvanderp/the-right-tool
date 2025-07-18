import React, { useState } from 'react';
import JSONToGEOJSONConverter, { queryIdentifier } from './JSONToGEOJSONConverter';
import ToolDescription from '../../components/ToolDescription';
import ToolPage from '../../components/ToolPage';
import { FiCopy, FiCheck } from 'react-icons/fi';

/**
 * This tool converts JSON data to GEOJSON format.
 * It takes JSON data and the keys of the latitude and longitude fields,
 * then moves all the keys to the properties field and creates a GEOJSON object.
 * @returns GEOJSON data based on the JSON data.
 */
export default function JSONToGEOJSON(): React.ReactElement {
    // Input state
    const [json, setJson] = useState('');
    const [latitudeKey, setLatitudeKey] = useState('');
    const [longitudeKey, setLongitudeKey] = useState('');

    // Output state
    const [geojson, setGeojson] = useState('');
    const [parseError, setParseError] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    const convert = () => {
        try {
            JSON.parse(json);
            setParseError('');
        } catch (e) {
            // @ts-expect-error -- We don't know the type of e but if it string like then we can put on the screen
            setParseError(e.message);
            return;
        }

        if (!latitudeKey || !longitudeKey) {
            setParseError('Latitude and Longitude keys are required');
            return;
        }

        if (queryIdentifier(latitudeKey) === 'invalid' || queryIdentifier(longitudeKey) === 'invalid') {
            setParseError('Invalid Latitude or Longitude key');
            return;
        }

        const data = JSONToGEOJSONConverter(JSON.parse(json), latitudeKey, longitudeKey);

        if (data) {
            setGeojson(data);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(geojson)
            .then(() => {
                setCopySuccess(true);
                // Reset the success message after 2 seconds
                setTimeout(() => {
                    setCopySuccess(false);
                }, 2000);
            })
            .catch(() => {
                setCopySuccess(false);
            });
    };

    return (
        <ToolPage title="JSON to GeoJSON Converter">
            <ToolDescription>
                Transform your JSON data containing coordinates into GeoJSON format — perfect for mapping applications.
                Simply specify which fields contain your latitude and longitude data, and we'll handle the conversion.
                You can use simple field names (like "lat") or JSONPath expressions (like "$.coordinates.lat") to access nested data.
            </ToolDescription>

            <div className="space-y-8 max-w-4xl w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Latitude Field:</span>
                        <input
                            type="text"
                            className="w-full"
                            value={latitudeKey}
                            onChange={(e) => setLatitudeKey(e.target.value)}
                            placeholder="e.g. lat or $.coordinates.latitude"
                        />
                        <p className="mt-2 text-sm text-gray-500">Field type: {queryIdentifier(latitudeKey)}</p>
                    </label>
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Longitude Field:</span>
                        <input
                            type="text"
                            className="w-full"
                            value={longitudeKey}
                            onChange={(e) => setLongitudeKey(e.target.value)}
                            placeholder="e.g. lng or $.coordinates.longitude"
                        />
                        <p className="mt-2 text-sm text-gray-500">Field type: {queryIdentifier(longitudeKey)}</p>
                    </label>
                </div>

                <div>
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Your JSON Data:</span>
                        <textarea
                            className="w-full h-48 font-mono text-sm"
                            value={json}
                            onChange={(e) => setJson(e.target.value)}
                            spellCheck="false"
                            placeholder="Paste your JSON data here..."
                        />
                    </label>
                </div>

                {parseError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 font-mono text-sm">{parseError}</p>
                    </div>
                )}

                <button
                    className="btn-primary"
                    onClick={convert}
                >
                    Convert to GeoJSON
                </button>

                {geojson && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-700">GeoJSON Result:</h3>
                            <button
                                className="btn-secondary flex items-center space-x-2"
                                onClick={copyToClipboard}
                                title="Copy to clipboard"
                            >
                                {copySuccess ? (
                                    <>
                                        <span>Copied!</span>
                                        <FiCheck className="h-4 w-4" />
                                    </>
                                ) : (
                                    <>
                                        <span>Copy</span>
                                        <FiCopy className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 
                        overflow-auto font-mono text-sm">
                            {geojson}
                        </pre>
                    </div>
                )}
            </div>
        </ToolPage>
    );
}
