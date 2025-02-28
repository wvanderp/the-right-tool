import toPrettyJSON from '../../utils/toPrettyJSON';

import jp from 'jsonpath';

/***
 * JSONToGEOJSONConverter
 * convert JSON data to GEOJSON format
 * it uses JSONPath to get the latitude and longitude fields
 * and then moves all the keys to the properties field and creates a GEOJSON object.
 * @param data JSON data
 * @param latitudeJsonPath JSONPath to the latitude field
 * @param longitudeJsonPath JSONPath to the longitude field
 * @returns GEOJSON data based on the JSON data.
 */
export default function JSONToGEOJSONConverter(data: unknown, latitudeJsonPath: string, longitudeJsonPath: string) : string {
    // check if the data is an array
    if (!Array.isArray(data)) {
        throw new Error('Data should be an array');
    }

    const QueryType = queryIdentifier(latitudeJsonPath);

    if (QueryType === 'invalid') {
        throw new Error('Invalid query');
    }

    // convert the json
    const features = data.map((item: unknown) => {
        const latitude = parseFloat(QueryType === 'string' ? item[latitudeJsonPath] : jp.query(item, latitudeJsonPath)[0]);
        const longitude = parseFloat(QueryType === 'string' ? item[longitudeJsonPath] : jp.query(item, longitudeJsonPath)[0]);

        const properties = Object.keys(item).reduce((acc, key) => {
            if (key !== latitudeJsonPath && key !== longitudeJsonPath) {
                acc[key] = item[key];
            }
            return acc;
        }, {});

        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            properties
        };
    });
    
    return toPrettyJSON({
        type: 'FeatureCollection',
        features
    });
}

export type QueryType = 'string' | 'JSONPath' | 'invalid';

/***
 * identify the type of the query
 *
 * @param query query to identify
 * @returns the type of the query
 */
export function queryIdentifier(query: string): QueryType {
    // check if the query is a JSONPath
    if (query.startsWith('$')) {
        return 'JSONPath';
    }

    // check if the query is a string
    if (query.length === 0) {
        return 'invalid';
    }

    return 'string';
}
