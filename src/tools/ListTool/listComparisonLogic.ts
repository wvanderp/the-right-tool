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
export function compareLists(listA: string[], listB: string[]): ListComparisonResult {
    // Count occurrences of each item in both lists
    const countA = new Map<string, number>();
    const countB = new Map<string, number>();

    for (const item of listA) {
        countA.set(item, (countA.get(item) || 0) + 1);
    }

    for (const item of listB) {
        countB.set(item, (countB.get(item) || 0) + 1);
    }

    // Get all unique items from both lists
    const allItems = new Set([...listA, ...listB]);

    const intersection: string[] = [];
    const leftDifference: string[] = [];
    const rightDifference: string[] = [];
    const symmetricDifference: string[] = [];

    for (const item of allItems) {
        const countInA = countA.get(item) || 0;
        const countInB = countB.get(item) || 0;
        const minCount = Math.min(countInA, countInB);

        // Add items that exist in both lists to intersection (up to minimum count)
        for (let i = 0; i < minCount; i++) {
            intersection.push(item);
        }

        // Add extra items from A to leftDifference
        const extraInA = countInA - minCount;
        for (let i = 0; i < extraInA; i++) {
            leftDifference.push(item);
        }

        // Add extra items from B to rightDifference
        const extraInB = countInB - minCount;
        for (let i = 0; i < extraInB; i++) {
            rightDifference.push(item);
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
