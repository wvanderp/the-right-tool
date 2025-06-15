import { describe, it, expect } from 'vitest';
import { parseList, compareLists, formatList } from '../listComparisonLogic';

describe('parseList', () => {
    it('should parse a simple list', () => {
        const input = 'apple\nbanana\ncherry';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should handle empty lines', () => {
        const input = 'apple\n\nbanana\n\ncherry\n';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should trim whitespace', () => {
        const input = '  apple  \n  banana  \n  cherry  ';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should handle empty input', () => {
        const result = parseList('');
        expect(result).toEqual([]);
    });

    it('should handle whitespace-only input', () => {
        const result = parseList('   \n  \n   ');
        expect(result).toEqual([]);
    });

    it('should handle Windows line endings (\\r\\n)', () => {
        const input = 'apple\r\nbanana\r\ncherry';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should handle classic Mac line endings (\\r)', () => {
        const input = 'apple\rbanana\rcherry';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should handle reverse line endings (\\n\\r)', () => {
        const input = 'apple\n\rbanana\n\rcherry';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should handle mixed line endings', () => {
        const input = 'apple\nbanana\r\ncherry\rdate\n\relm';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry', 'date', 'elm']);
    });

    it('should handle line endings with empty lines and whitespace', () => {
        const input = 'apple\r\n\r\n  \r\nbanana\r\n  \r\ncherry\r\n';
        const result = parseList(input);
        expect(result).toEqual(['apple', 'banana', 'cherry']);
    });
});

describe('compareLists', () => {
    it('should find intersection', () => {
        const listA = ['apple', 'banana', 'cherry'];
        const listB = ['banana', 'cherry', 'date'];
        const result = compareLists(listA, listB);

        expect(result.intersection).toEqual(['banana', 'cherry']);
    });

    it('should find left difference', () => {
        const listA = ['apple', 'banana', 'cherry'];
        const listB = ['banana', 'cherry', 'date'];
        const result = compareLists(listA, listB);

        expect(result.leftDifference).toEqual(['apple']);
    });

    it('should find right difference', () => {
        const listA = ['apple', 'banana', 'cherry'];
        const listB = ['banana', 'cherry', 'date'];
        const result = compareLists(listA, listB);

        expect(result.rightDifference).toEqual(['date']);
    });

    it('should find symmetric difference', () => {
        const listA = ['apple', 'banana', 'cherry'];
        const listB = ['banana', 'cherry', 'date'];
        const result = compareLists(listA, listB);

        expect(result.symmetricDifference).toEqual(['apple', 'date']);
    });

    it('should handle empty lists', () => {
        const result = compareLists([], []);

        expect(result.intersection).toEqual([]);
        expect(result.leftDifference).toEqual([]);
        expect(result.rightDifference).toEqual([]);
        expect(result.symmetricDifference).toEqual([]);
    });

    it('should handle one empty list', () => {
        const listA = ['apple', 'banana'];
        const listB: string[] = [];
        const result = compareLists(listA, listB);

        expect(result.intersection).toEqual([]);
        expect(result.leftDifference).toEqual(['apple', 'banana']);
        expect(result.rightDifference).toEqual([]);
        expect(result.symmetricDifference).toEqual(['apple', 'banana']);
    });

    it('should preserve duplicates in intersection', () => {
        const listA = ['apple', 'apple', 'banana', 'banana'];
        const listB = ['apple', 'banana', 'cherry'];
        const result = compareLists(listA, listB);

        expect(result.intersection).toEqual(['apple', 'banana']);
        expect(result.leftDifference).toEqual(['apple', 'banana']);
        expect(result.rightDifference).toEqual(['cherry']);
        expect(result.symmetricDifference).toEqual(['apple', 'banana', 'cherry']);
    }); it('should be case sensitive', () => {
        const listA = ['Apple', 'banana'];
        const listB = ['apple', 'banana'];
        const result = compareLists(listA, listB, true);

        expect(result.intersection).toEqual(['banana']);
        expect(result.leftDifference).toEqual(['Apple']);
        expect(result.rightDifference).toEqual(['apple']);
    });

    it('should handle different duplicate entries correctly', () => {
        // Bug case: listA has [1,2], listB has [1,2,2]
        // The extra '2' in listB should appear in rightDifference and symmetricDifference
        const listA = ['1', '2'];
        const listB = ['1', '2', '2'];
        const result = compareLists(listA, listB);

        expect(result.intersection).toEqual(['1', '2']);
        expect(result.leftDifference).toEqual([]);
        expect(result.rightDifference).toEqual(['2']); // Should contain the extra '2'
        expect(result.symmetricDifference).toEqual(['2']); // Should contain the extra '2'
    });

    it('should handle different duplicate entries in reverse', () => {
        // Reverse case: listA has [1,2,2], listB has [1,2]
        const listA = ['1', '2', '2'];
        const listB = ['1', '2'];
        const result = compareLists(listA, listB);

        expect(result.intersection).toEqual(['1', '2']);
        expect(result.leftDifference).toEqual(['2']); // Should contain the extra '2'
        expect(result.rightDifference).toEqual([]);
        expect(result.symmetricDifference).toEqual(['2']); // Should contain the extra '2'
    });
});

describe('compareLists - case sensitivity', () => {
    it('should be case insensitive by default', () => {
        const listA = ['Apple', 'BANANA', 'cherry'];
        const listB = ['apple', 'banana', 'CHERRY'];
        const result = compareLists(listA, listB);

        expect(result.intersection).toEqual(['Apple', 'BANANA', 'cherry']);
        expect(result.leftDifference).toEqual([]);
        expect(result.rightDifference).toEqual([]);
        expect(result.symmetricDifference).toEqual([]);
    });

    it('should be case insensitive when explicitly set to false', () => {
        const listA = ['Apple', 'BANANA'];
        const listB = ['apple', 'banana'];
        const result = compareLists(listA, listB, false);

        expect(result.intersection).toEqual(['Apple', 'BANANA']);
        expect(result.leftDifference).toEqual([]);
        expect(result.rightDifference).toEqual([]);
        expect(result.symmetricDifference).toEqual([]);
    });

    it('should be case sensitive when explicitly set to true', () => {
        const listA = ['Apple', 'BANANA', 'cherry'];
        const listB = ['apple', 'banana', 'CHERRY'];
        const result = compareLists(listA, listB, true);

        expect(result.intersection).toEqual([]);
        expect(result.leftDifference).toEqual(['Apple', 'BANANA', 'cherry']);
        expect(result.rightDifference).toEqual(['apple', 'banana', 'CHERRY']);
        expect(result.symmetricDifference).toEqual(['Apple', 'BANANA', 'cherry', 'apple', 'banana', 'CHERRY']);
    });

    it('should preserve original case from list A in intersection when case insensitive', () => {
        const listA = ['Apple', 'BANANA'];
        const listB = ['apple', 'banana'];
        const result = compareLists(listA, listB, false);

        expect(result.intersection).toEqual(['Apple', 'BANANA']); // Should preserve A's case
    });

    it('should preserve original case in differences when case insensitive', () => {
        const listA = ['Apple', 'UNIQUE_A'];
        const listB = ['apple', 'unique_b'];
        const result = compareLists(listA, listB, false);

        expect(result.intersection).toEqual(['Apple']);
        expect(result.leftDifference).toEqual(['UNIQUE_A']);
        expect(result.rightDifference).toEqual(['unique_b']);
        expect(result.symmetricDifference).toEqual(['UNIQUE_A', 'unique_b']);
    });

    it('should handle duplicates with different cases when case insensitive', () => {
        const listA = ['Apple', 'apple', 'APPLE'];
        const listB = ['apple', 'APPLE'];
        const result = compareLists(listA, listB, false);

        expect(result.intersection).toEqual(['Apple', 'Apple']); // Two matches, preserving A's first case
        expect(result.leftDifference).toEqual(['Apple']); // One extra from A
        expect(result.rightDifference).toEqual([]);
        expect(result.symmetricDifference).toEqual(['Apple']);
    });
});

describe('formatList', () => {
    it('should format a list with newlines', () => {
        const items = ['apple', 'banana', 'cherry'];
        const result = formatList(items);
        expect(result).toBe('apple\nbanana\ncherry');
    });

    it('should handle empty list', () => {
        const result = formatList([]);
        expect(result).toBe('');
    });

    it('should handle single item', () => {
        const result = formatList(['apple']);
        expect(result).toBe('apple');
    });
});
