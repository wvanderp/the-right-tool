import { Supplement } from '../repository/SupplementRepository';

export type Constraints = {
    [key: string]: {
        target: number;
        max: number;
    }
}

export type Option = Supplement;

export type Options = Option[]

export type SolverResult = {
    supplements: [number, Option][];
    distance: number;
    numberOfSupplements: number;
    constraints: Constraints; // Add this line
}

export type RequiredSupplement = {
    supplement: Option;
    amount: number;
}

export function solve(constraints: Constraints, options: Options, requiredSupplements: RequiredSupplement[] = []): SolverResult[] {
    const enabledOptions = getEnabledOptions(options);
    const maxCounts = enabledOptions.map(option => maximumNumberOfSupplement(option, constraints));

    const validCombinations = generateValidCombinations(
        enabledOptions,
        maxCounts,
        constraints,
        requiredSupplements,
        options
    );

    const results = validCombinations.map(combination =>
        createSolverResult(combination, enabledOptions, constraints)
    );

    return sortResults(results);
}

/**
 * Filters out disabled supplement options
 */
function getEnabledOptions(options: Options): Options {
    return options.filter(opt => !opt.disabled);
}

/**
 * Generates all valid supplement combinations that meet requirements
 */
function generateValidCombinations(
    enabledOptions: Options,
    maxCounts: number[],
    constraints: Constraints,
    requiredSupplements: RequiredSupplement[],
    allOptions: Options
): number[][] {
    const validCombinations: number[][] = [];
    const totalSupplements = enabledOptions.length;
    const currentCombination = new Array(totalSupplements).fill(0);

    function generateCombinations(index: number): void {
        if (index === totalSupplements) {
            if (isValidCombination(currentCombination, enabledOptions, constraints, requiredSupplements, allOptions)) {
                validCombinations.push([...currentCombination]);
            }
            return;
        }

        for (let count = 0; count <= maxCounts[index]; count++) {
            currentCombination[index] = count;
            generateCombinations(index + 1);
        }
    }

    generateCombinations(0);
    return validCombinations;
}

/**
 * Validates if a combination meets all requirements and constraints
 */
function isValidCombination(
    combination: number[],
    enabledOptions: Options,
    constraints: Constraints,
    requiredSupplements: RequiredSupplement[],
    allOptions: Options
): boolean {
    // Check required supplements
    if (!meetsRequiredSupplements(combination, enabledOptions, requiredSupplements, allOptions)) {
        return false;
    }

    // Calculate amounts and check constraints
    const supplements: [number, Option][] = combination.map((count, index) => [count, enabledOptions[index]]);
    const amounts = calculateAmounts(supplements);

    return !AmountsExceedConstraints(amounts, constraints);
}

/**
 * Checks if the combination includes all required supplements in sufficient amounts
 */
function meetsRequiredSupplements(
    combination: number[],
    enabledOptions: Options,
    requiredSupplements: RequiredSupplement[],
    allOptions: Options
): boolean {
    for (const required of requiredSupplements) {
        const enabledIndex = enabledOptions.indexOf(required.supplement);
        const allOptionsIndex = allOptions.indexOf(required.supplement);

        if (enabledIndex === -1 || allOptionsIndex === -1 || combination[enabledIndex] < required.amount) {
            return false;
        }
    }
    return true;
}

/**
 * Creates a SolverResult from a valid combination
 */
function createSolverResult(
    combination: number[],
    enabledOptions: Options,
    constraints: Constraints
): SolverResult {
    const supplements: [number, Option][] = combination.map((count, index) => [count, enabledOptions[index]]);
    const amounts = calculateAmounts(supplements);
    const distance = calculateDistance(amounts, constraints);
    const numberOfSupplements = combination.reduce((sum, count) => sum + count, 0);

    return {
        supplements,
        distance,
        numberOfSupplements,
        constraints
    };
}

/**
 * Calculates the 'distance' score for a set of nutrient amounts against the provided constraints.
 *
 * The distance is a unitless measure computed as the sum, over each constrained nutrient, of the
 * relative deviation from its target value:
 *
 *   distance = sum_n (|amount_n - target_n| / target_n)
 *
 * Notes:
 * - Lower distance means the combination is closer to the target values (better match).
 * - Nutrients that have no entry in `constraints` are ignored.
 * - This metric treats each constrained nutrient equally (no weighting). Large deviations
 *   can make the distance exceed 1 for that nutrient.
 * - The function returns 0 when all amounts exactly match their targets.
 */
function calculateDistance(amounts: Record<string, number>, constraints: Constraints): number {
    let distance = 0;

    // Iterate over constraints so missing nutrients in `amounts` are treated as 0.
    for (const [nutrient, constraint] of Object.entries(constraints)) {
        // If target is -1 it means "no target" (use as max-only), so skip distance calculation.
        // Also avoid dividing by zero or non-positive targets.
        if (constraint.target === -1) continue;
        if (constraint.target <= 0) continue;

        const amount = amounts[nutrient] ?? 0;
        distance += Math.abs(amount - constraint.target) / constraint.target;
    }

    return distance;
}

/**
 * Sorts results by distance first, then by number of supplements
 */
function sortResults(results: SolverResult[]): SolverResult[] {
    if (results.length === 0) return results;

    // If any constraint has target === -1 we prefer solutions with fewer supplements
    // (this makes solutions that meet max-only constraints with fewer pills ranked higher).
    const constraints = results[0].constraints;
    const hasNoTarget = Object.values(constraints).some(c => c.target === -1);

    if (hasNoTarget) {
        return results.sort((a, b) => {
            // Prefer combinations that include at least one supplement over the empty combination
            const aIsEmpty = a.numberOfSupplements === 0;
            const bIsEmpty = b.numberOfSupplements === 0;
            if (aIsEmpty && !bIsEmpty) return 1;
            if (bIsEmpty && !aIsEmpty) return -1;

            // Both empty or both non-empty: prefer fewer supplements, then lower distance
            if (a.numberOfSupplements === b.numberOfSupplements) {
                return a.distance - b.distance;
            }
            return a.numberOfSupplements - b.numberOfSupplements;
        });
    }

    // Default: sort by distance first (closer to targets is better), then by number of supplements
    return results.sort((a, b) => {
        if (a.distance === b.distance) {
            return a.numberOfSupplements - b.numberOfSupplements;
        }
        return a.distance - b.distance;
    });
}

export function calculateAmounts(supplements: [number, Options[0]][]): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [amount, option] of supplements) {
        for (const ingredient of option.ingredients) {
            if (result[ingredient.name] === undefined) {
                result[ingredient.name] = 0;
            }
            result[ingredient.name] += ingredient.amount * amount;
        }
    }

    return result;
}

export function AmountsExceedConstraints(amounts: Record<string, number>, constraints: Constraints): boolean {
    for (const [key, value] of Object.entries(amounts)) {
        const constraint = constraints[key];
        if (constraint) {
            if (value > constraint.max) {
                return true;
            }
        }
    }

    return false;
}

export function maximumNumberOfSupplement(supplement: Option, constraints: Constraints): number {
    let maxSupplements = Infinity;

    for (const ingredient of supplement.ingredients) {
        const constraint = constraints[ingredient.name];
        if (constraint) {
            const maxForIngredient = Math.floor(constraint.max / ingredient.amount);
            maxSupplements = Math.min(maxSupplements, maxForIngredient);
        }
    }

    return Math.min(maxSupplements, 100);
}

/**
 * generates all possible combinations of supplements
 * so all numbers count down from maxCounts to 0
 * @param maxCounts 
 * @returns 
 */
export function generateAllCombinations(maxCounts: number[]): number[][] {
    // calculate the number of possible combinations
    const numberOfCombinations = maxCounts.reduce((product, count) => product * (count + 1), 1);

    if (numberOfCombinations > 1000000) {
        throw new Error('Too many combinations');
    }

    const results: number[][] = [];

    function helper(index: number, current: number[]) {
        if (index === maxCounts.length) {
            results.push(current.slice());
            return;
        }
        for (let count = 0; count <= maxCounts[index]; count++) {
            current.push(count);
            helper(index + 1, current);
            current.pop();
        }
    }

    if (maxCounts.length > 0) {
        helper(0, []);
    } else {
        return [];
    }

    return results;
}
