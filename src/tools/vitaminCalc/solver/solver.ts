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
    const maxCounts = options.map(option => maximumNumberOfSupplement(option, constraints));
    const results: SolverResult[] = [];
    const totalSupplements = options.length;
    const currentCombination = new Array(totalSupplements).fill(0);

    function helper(index: number) {
        if (index === totalSupplements) {
            // Check if the combination includes all required supplements
            for (const required of requiredSupplements) {
                const optionIndex = options.indexOf(required.supplement);
                if (optionIndex === -1 || currentCombination[optionIndex] < required.amount) {
                    return;
                }
            }

            // Calculate amounts
            const supplements: [number, Option][] = [];
            for (let i = 0; i < totalSupplements; i++) {
                supplements.push([currentCombination[i], options[i]]);
            }
            const amounts = calculateAmounts(supplements);

            // Check if amounts exceed constraints
            if (AmountsExceedConstraints(amounts, constraints)) {
                return;
            }

            // Calculate distance
            let distance = 0;
            for (const [key, value] of Object.entries(amounts)) {
                const constraint = constraints[key];
                if (constraint) {
                    distance += Math.abs(value - constraint.target) / constraint.target;
                }
            }

            // Calculate number of supplements
            const numberOfSupplements = currentCombination.reduce((sum, count) => sum + count, 0);

            results.push({
                supplements,
                distance,
                numberOfSupplements,
                constraints
            });

            return;
        }

        for (let count = 0; count <= maxCounts[index]; count++) {
            currentCombination[index] = count;
            helper(index + 1);
        }
    }

    helper(0);

    // Sort results
    results.sort((a, b) => {
        if (a.distance === b.distance) {
            return a.numberOfSupplements - b.numberOfSupplements;
        }
        return a.distance - b.distance;
    });

    return results;
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

    console.log('Number of combinations:', numberOfCombinations, maxCounts);

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
