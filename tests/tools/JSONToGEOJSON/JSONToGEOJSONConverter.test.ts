import JSONToGEOJSONConverter, { queryIdentifier } from '../../../src/tools/JSONToGEOJSON/JSONToGEOJSONConverter';
import toPrettyJSON from '../../../src/utils/toPrettyJSON';


describe('queryIdentifier', () => {
    test('Should identify the query as a string', () => {
        expect(queryIdentifier('test')).toBe('string');
    });

    test('Should identify the query as a JSONPath', () => {
        expect(queryIdentifier('$.test')).toBe('JSONPath');
    });

    test('Should identify the query as invalid', () => {
        expect(queryIdentifier('')).toBe('invalid');
    });
});


describe('JSONToGEOJSONConverter', () => {
    test('Should support the most basic case', () => {
        const data = [
            {
                latitude: 10,
                longitude: 20,
                name: 'test'
            }
        ];
        const result = JSONToGEOJSONConverter(data, 'latitude', 'longitude');
        expect(result).toBe(toPrettyJSON({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [20, 10]
                    },
                    properties: {
                        name: 'test'
                    }
                }
            ]
        }));
    });

    test('Should support the most basic case with no name', () => {
        const data = [
            {
                latitude: 10,
                longitude: 20
            }
        ];
        const result = JSONToGEOJSONConverter(data, 'latitude', 'longitude');
        expect(result).toBe(toPrettyJSON({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [20, 10]
                    },
                    properties: {}
                }
            ]
        }));
    });

    test('Should support multiple items', () => {
        const data = [
            {
                latitude: 10,
                longitude: 20,
                name: 'test'
            },
            {
                latitude: 30,
                longitude: 40,
                name: 'test2'
            }
        ];
        const result = JSONToGEOJSONConverter(data, 'latitude', 'longitude');
        expect(result).toBe(toPrettyJSON({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [20, 10]
                    },
                    properties: {
                        name: 'test'
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [40, 30]
                    },
                    properties: {
                        name: 'test2'
                    }
                }
            ]
        }));
    });

    test('Should throw an error if the data is not an array', () => {
        expect(() => JSONToGEOJSONConverter({}, 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter('test', 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter(1, 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter(null, 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter(undefined, 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter(true, 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter(false, 'latitude', 'longitude')).toThrow('Data should be an array');
        expect(() => JSONToGEOJSONConverter(() => {}, 'latitude', 'longitude')).toThrow('Data should be an array');
    });

    test('Should support json path as the key', () => {
        const data = [
            {
                location: {
                    latitude: 10,
                    longitude: 20
                },
                name: 'test'
            }
        ];

        const result = JSONToGEOJSONConverter(data, '$.location.latitude', '$.location.longitude');
        
        expect(result).toBe(toPrettyJSON({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [20, 10]
                    },
                    properties: {
                        location: {
                            latitude: 10,
                            longitude: 20
                        },
                        name: 'test',   
                    }
                }
            ]
        }));
    });
});
