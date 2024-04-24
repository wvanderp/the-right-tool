import React from 'react';
import { useState } from 'react';
import JSONToGEOJSONConverter from './JSONToGEOJSONConverter';

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
        } catch (e) {
            setParseError(e.message);
            return;
        }

        const data = JSONToGEOJSONConverter(JSON.parse(json), latitudeKey, longitudeKey);

        if (data) {
            setGeojson(data);
        }
    };
    
    return (
        <div className="flex flex-col items-center space-y-4">
            <h1 className="text-2xl font-bold">JSON to GEOJSON</h1>
            <label className="flex flex-col">
                JSON Data:
                <textarea className="border-2 border-gray-200 rounded p-2" value={json} onChange={(e) => setJson(e.target.value)} />
            </label>
            <label className="flex flex-col">
                Latitude Key:
                <input className="border-2 border-gray-200 rounded p-2" value={latitudeKey} onChange={(e) => setLatitudeKey(e.target.value)} />
            </label>
            <label className="flex flex-col">
                Longitude Key:
                <input className="border-2 border-gray-200 rounded p-2" value={longitudeKey} onChange={(e) => setLongitudeKey(e.target.value)} />
            </label>
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={convert}>Convert</button>
            {parseError && <div className="text-red-500">{parseError}</div>}
            {geojson && <pre className="border-2 border-gray-200 rounded p-2">{geojson}</pre>}
      </div>
    );
}
