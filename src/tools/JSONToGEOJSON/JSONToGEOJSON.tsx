import React from 'react';
import { useState } from 'react';

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

    const data = JSON.parse(json);
        const features = data.map((item: any) => {
        const properties = Object.keys(item).reduce((acc, key) => {
            if (key !== latitudeKey && key !== longitudeKey) {
            acc[key] = item[key];
            }
            return acc;
        }, {});
        return {
            type: 'Feature',
            geometry: {
            type: 'Point',
            coordinates: [parseFloat(item[longitudeKey]), parseFloat(item[latitudeKey])]
            },
            properties
        };
        });
        setGeojson(JSON.stringify({
        type: 'FeatureCollection',
        features
        }, null, 2));
    };   
    
    return (
        <div>
        <h1>JSON to GEOJSON</h1>
        <label>
            JSON Data:
            <textarea value={json} onChange={(e) => setJson(e.target.value)} />
        </label>
        <label>
            Latitude Key:
            <input value={latitudeKey} onChange={(e) => setLatitudeKey(e.target.value)} />
        </label>
        <label>
            Longitude Key:
            <input value={longitudeKey} onChange={(e) => setLongitudeKey(e.target.value)} />
        </label>
        <button onClick={convert}>Convert</button>
        {parseError && <div style={{color: "red"}}>{parseError}</div>}
        <pre>{geojson}</pre>
        </div>
    );
    }
