import React from 'react';
import { useState } from 'react';
import JSONToGEOJSONConverter, { queryIdentifier } from './JSONToGEOJSONConverter';

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
        <div className="flex flex-col items-center w-full">
            <h1 className="text-2xl font-bold">JSON to GEOJSON</h1>
            <div className="flex">
                <label className="flex flex-col">
                    Latitude Key:
                    <input className="border-2 border-gray-200 rounded p-2" value={latitudeKey} onChange={(e) => setLatitudeKey(e.target.value)} />
                    <p className="text-sm text-gray-500">{queryIdentifier(latitudeKey)}</p>
                </label>
                <label className="flex flex-col">
                    Longitude Key:
                    <input className="border-2 border-gray-200 rounded p-2" value={longitudeKey} onChange={(e) => setLongitudeKey(e.target.value)} />
                    <p className="text-sm text-gray-500">{queryIdentifier(longitudeKey)}</p>
                </label>
            </div>
            
            
            <label className="flex flex-col">
                JSON Data:
                <textarea className="border-2 border-gray-200 rounded p-2" value={json} onChange={(e) => setJson(e.target.value)} />
            </label>
            {parseError && <div className="text-red-500">{parseError}</div>}

            <button className="bg-blue-500 text-white p-2 rounded m-4" onClick={convert}>Convert</button>

            {geojson && <pre className="border-2 border-gray-200 rounded p-2">{geojson}</pre>}
            
      </div>
    );
}
