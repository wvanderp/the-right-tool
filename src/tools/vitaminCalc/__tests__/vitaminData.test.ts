import { describe, expect, it } from 'vitest';
import { parseVitaminDataFile, storeVitaminData } from '../vitaminData';

describe('parseVitaminDataFile', () => {
  it('accepts a Vitamin Calculator export containing supplements, constraints, and requirements', () => {
    const exportedData = {
      timestamp: '2026-08-24T12:00:00.000Z',
      supplements: [
        {
          id: 1,
          name: 'Daily supplement',
          maker: 'Example maker',
          ingredients: [{ name: 'Vitamin C', amount: 100 }],
          disabled: false,
        },
      ],
      constraints: [{ id: 2, name: 'Vitamin C', target: 75, max: 200 }],
      requirements: [{ id: 3, supplementId: 1, amount: 1 }],
    };

    expect(parseVitaminDataFile(JSON.stringify(exportedData))).toEqual(exportedData);
  });

  it('accepts exports created before a timestamp was included', () => {
    const exportedData = {
      supplements: [],
      constraints: [],
      requirements: [],
    };

    expect(parseVitaminDataFile(JSON.stringify(exportedData))).toEqual(exportedData);
  });

  it('rejects files that do not contain every Vitamin Calculator data collection', () => {
    expect(() => parseVitaminDataFile(JSON.stringify({ supplements: [], constraints: [] })))
      .toThrow('requirements');
  });

  it('rejects invalid records instead of importing partial data', () => {
    const exportedData = {
      supplements: [{ id: 1, name: 'Invalid', maker: 'Example', ingredients: 'Vitamin C' }],
      constraints: [],
      requirements: [],
    };

    expect(() => parseVitaminDataFile(JSON.stringify(exportedData))).toThrow('supplements');
  });

  it('reports malformed JSON clearly', () => {
    expect(() => parseVitaminDataFile('{not-json')).toThrow('valid JSON');
  });
});

describe('storeVitaminData', () => {
  it('restores all three collections from the same backup', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const data = {
      supplements: [{
        id: 1,
        name: 'Daily supplement',
        maker: 'Example maker',
        ingredients: [{ name: 'Vitamin C', amount: 100 }],
      }],
      constraints: [{ id: 2, name: 'Vitamin C', target: 75, max: 200 }],
      requirements: [{ id: 3, supplementId: 1, amount: 1 }],
    };

    storeVitaminData(data, storage);

    expect(JSON.parse(values.get('supplements') ?? '')).toEqual(data.supplements);
    expect(JSON.parse(values.get('constraints') ?? '')).toEqual(data.constraints);
    expect(JSON.parse(values.get('requirements') ?? '')).toEqual(data.requirements);
  });
});
