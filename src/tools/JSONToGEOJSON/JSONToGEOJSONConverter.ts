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

    // convert the json
    const features = data.map((item: any) => {
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
                coordinates: [parseFloat(item[longitudeJsonPath]), parseFloat(item[latitudeJsonPath])]
            },
            properties
        };
    });
    return JSON.stringify({
        type: 'FeatureCollection',
        features
    }, null, 2);
}
