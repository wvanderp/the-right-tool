export interface ListComparisonResult {
    intersection: string[];
    leftDifference: string[];
    rightDifference: string[];
    symmetricDifference: string[];
}

/**
 * Parses a string input into an array of non-empty strings
 * Handles various line ending formats: \n, \r\n, \r, \n\r
 */
export function parseList(input: string): string[] {
    return input
        .split(/\r\n|\n\r|\r|\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Performs set operations on two lists of strings while preserving duplicates
 */
export function compareLists(listA: string[], listB: string[], caseSensitive: boolean = false): ListComparisonResult {
    // Normalize items for comparison if case-insensitive
    const normalizeItem = (item: string) => caseSensitive ? item : item.toLowerCase();

    // Count occurrences of each item in both lists
    const countA = new Map<string, number>();
    const countB = new Map<string, number>();

    // Keep track of original case for display purposes
    const originalCaseA = new Map<string, string>();
    const originalCaseB = new Map<string, string>();

    for (const item of listA) {
        const normalizedItem = normalizeItem(item);
        countA.set(normalizedItem, (countA.get(normalizedItem) || 0) + 1);
        if (!originalCaseA.has(normalizedItem)) {
            originalCaseA.set(normalizedItem, item);
        }
    }

    for (const item of listB) {
        const normalizedItem = normalizeItem(item);
        countB.set(normalizedItem, (countB.get(normalizedItem) || 0) + 1);
        if (!originalCaseB.has(normalizedItem)) {
            originalCaseB.set(normalizedItem, item);
        }
    }    // Get all unique normalized items from both lists
    const allNormalizedItems = new Set([...countA.keys(), ...countB.keys()]);

    const intersection: string[] = [];
    const leftDifference: string[] = [];
    const rightDifference: string[] = [];
    const symmetricDifference: string[] = [];

    for (const normalizedItem of allNormalizedItems) {
        const countInA = countA.get(normalizedItem) || 0;
        const countInB = countB.get(normalizedItem) || 0;
        const minCount = Math.min(countInA, countInB);

        // Use original case from A for intersection and left difference, B for right difference
        const originalFromA = originalCaseA.get(normalizedItem) || normalizedItem;
        const originalFromB = originalCaseB.get(normalizedItem) || normalizedItem;

        // Add items that exist in both lists to intersection (up to minimum count)
        for (let i = 0; i < minCount; i++) {
            intersection.push(originalFromA);
        }

        // Add extra items from A to leftDifference
        const extraInA = countInA - minCount;
        for (let i = 0; i < extraInA; i++) {
            leftDifference.push(originalFromA);
        }

        // Add extra items from B to rightDifference
        const extraInB = countInB - minCount;
        for (let i = 0; i < extraInB; i++) {
            rightDifference.push(originalFromB);
        }
    }

    // Symmetric difference is all items that are only in one list or have different counts
    symmetricDifference.push(...leftDifference, ...rightDifference);

    return {
        intersection,
        leftDifference,
        rightDifference,
        symmetricDifference
    };
}

/**
 * Formats a list of strings for display or export
 */
export function formatList(items: string[]): string {
    return items.join('\n');
}
