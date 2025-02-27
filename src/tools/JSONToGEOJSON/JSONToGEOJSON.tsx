import React from 'react';
import { useState } from 'react';
import JSONToGEOJSONConverter, { queryIdentifier } from './JSONToGEOJSONConverter';
import ToolDescription from '../../components/ToolDescription';
import ToolPage from '../../components/ToolPage';

/**
 * This tool converts JSON data to GEOJSON format.
 * it takes JSON data and the keys of the latitude and longitude fields.
 * and then moves all the keys to the properties field and creates a GEOJSON object.
 * @returns GEOJSON data based on the JSON data.
 */
export default function JSONToGEOJSON() : React.ReactElement {
    // inputs
    const [json, setJson] = useState('');
    const [latitudeKey, setLatitudeKey] = useState('');
    const [longitudeKey, setLongitudeKey] = useState('');

    // output
    const [geojson, setGeojson] = useState('');
    const [parseError, setParseError] = useState('');

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


        if(queryIdentifier(latitudeKey) === 'invalid' || queryIdentifier(longitudeKey) === 'invalid') {
            setParseError('Invalid Latitude or Longitude key');
            return;
        }

        const data = JSONToGEOJSONConverter(JSON.parse(json), latitudeKey, longitudeKey);

        if (data) {
            setGeojson(data);
        }
    };
    
    return (
        <ToolPage title="JSON to GEOJSON">
            <ToolDescription>
                This tool converts JSON data to GEOJSON format.
                It takes JSON data and the keys of the latitude and longitude fields.
                And then moves all the keys to the properties field and creates a GEOJSON object.
                The tool returns GEOJSON data based on the JSON data.

                The latitude and longitude keys can be either a string or a <a href="https://en.wikipedia.org/wiki/JSONPath" 
                className="text-yellow-600 hover:text-yellow-700 hover:underline transition-colors duration-200">JSONPath</a>
            </ToolDescription>

            <div className="space-y-8 max-w-4xl w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Latitude Key:</span>
                        <input 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                            focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                            outline-none transition-all duration-200" 
                            value={latitudeKey} 
                            onChange={(e) => setLatitudeKey(e.target.value)} 
                        />
                        <p className="mt-2 text-sm text-gray-500">{queryIdentifier(latitudeKey)}</p>
                    </label>
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-2">Longitude Key:</span>
                        <input 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5
                            focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                            outline-none transition-all duration-200" 
                            value={longitudeKey} 
                            onChange={(e) => setLongitudeKey(e.target.value)} 
                        />
                        <p className="mt-2 text-sm text-gray-500">{queryIdentifier(longitudeKey)}</p>
                    </label>
                </div>

                <div>
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-2">JSON Data:</span>
                        <textarea 
                            className="w-full h-48 border border-gray-300 rounded-lg px-4 py-3 
                            font-mono text-sm focus:ring-2 focus:ring-yellow-600/20 
                            focus:border-yellow-600 outline-none transition-all duration-200" 
                            value={json} 
                            onChange={(e) => setJson(e.target.value)}
                            spellCheck="false"
                        />
                    </label>
                </div>

                {parseError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600 font-mono text-sm">{parseError}</p>
                    </div>
                )}

                <button 
                    className="w-full md:w-auto px-6 py-2.5 bg-yellow-600 text-white rounded-lg 
                    hover:bg-yellow-700 transition-all duration-200 font-medium
                    hover:shadow-sm active:scale-[0.98]" 
                    onClick={convert}
                >
                    Convert
                </button>

                {geojson && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Result:</h3>
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
