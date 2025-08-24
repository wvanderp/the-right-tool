import { solve, Constraints, Options, calculateAmounts, maximumNumberOfSupplement, AmountsExceedConstraints, generateAllCombinations, Option } from './solver';

function createSupplement(name: string, ingredients: {name:string, amount: number}[], id?: number): Option {
    return { id: id ?? Math.random(), name: name, maker: "Unknown", ingredients };
}


describe('solve', () => {
    it('should return an empty array when no options are provided', () => {
        const contains: Constraints = {};
        const options: Options = [];
        const result = solve(contains, options);
        expect(result).toEqual([]);
    });

    it('should return the correct amounts for given options', () => {
        const contains: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const options: Options = [
            { id: 1, name: 'small', maker: "unknown", ingredients: [{ name: 'vitaminC', amount: 12.5 }] },
            { id: 2, name: 'big', maker: "unknown", ingredients: [{ name: 'vitaminC', amount: 75 }] }
        ];
        const result = solve(contains, options);
        expect(result).toHaveLength(33);
        expect(result[0]).toEqual({
            distance: 0,
            numberOfSupplements: 3,
            supplements: [[2, options[0]], [1, options[1]]]
        });
    });

    it('should return the correct amounts for given options with multiple ingredients', () => {
        const contains: Constraints = {
            vitaminC: { target: 100, max: 200 },
            vitaminD: { target: 50, max: 150 }
        };
        const options: Options = [
            { id: 1, name: 'small', maker: "unknown", ingredients: [{ name: 'vitaminC', amount: 12.5 }, { name: 'vitaminD', amount: 15 }] },
            { id: 2, name: 'big', maker: "unknown", ingredients: [{ name: 'vitaminC', amount: 75 }, { name: 'vitaminD', amount: 50 }] }
        ];
        const result = solve(contains, options);
        expect(result).toHaveLength(22);
        expect(result[0]).toEqual({
            distance: 25,
            numberOfSupplements: 1,
            supplements: [[0, options[0]], [1, options[1]]]
        });
    });

    it('Should accept a set of required supplements, that must be included in the result', () => {
        const contains: Constraints = {
            zinc: { target: 10, max: 20 },
            magnesium: { target: 10, max: 20 }
        };
        const options: Options = [
            { id: 1, name: 'small', maker: "unknown", ingredients: [{ name: 'zinc', amount: 5 }, { name: 'magnesium', amount: 5 }] },
            { id: 2, name: 'big', maker: "unknown", ingredients: [{ name: 'vitD', amount: 10 }, { name: 'magnesium', amount: 10 }] }
        ];
        const result = solve(contains, options, [{ amount: 1, supplement: options[1] }]);
        expect(result).toHaveLength(4);
        expect(result[0]).toEqual({
            distance: 10,
            numberOfSupplements: 1,
            supplements: [[0, options[0]], [1, options[1]]]
        });
    });
});

describe('calculateAmounts', () => {
    it('should return an empty object when no supplements are provided', () => {
        const result = calculateAmounts([]);
        expect(result).toEqual({});
    });

    it('should return the correct amounts for given supplements', () => {
        const options: Options = [
            createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }]),
            createSupplement('big', [{ name: 'vitaminC', amount: 75 }])
        ];
        const supplements = [
            [2, options[0]],
            [1, options[1]]
        ] as [number, Options[0]][];

        const result = calculateAmounts(supplements);
        expect(result).toEqual({
            vitaminC: 100
        });
    });

    it('should return the correct amounts for given supplements with multiple ingredients', () => {
        const options: Options = [
            createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }, { name: 'vitaminD', amount: 150 }]),
            createSupplement('big', [{ name: 'vitaminC', amount: 75 }, { name: 'vitaminD', amount: 50 }])
        ];
        const supplements = [
            [2, options[0]],
            [1, options[1]]
        ] as [number, Options[0]][];

        const result = calculateAmounts(supplements);
        expect(result).toEqual({
            vitaminC: 100,
            vitaminD: 350
        });
    });
});

describe('maximumNumberOfSupplement', () => {
    it('should return 100 when the supplement is unconstrained', () => {
        // 100 was chosen as the maximum number of supplements so that the test would not fail due to the number of combinations being too high
        const constraints: Constraints = {};

        const supplement = createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }]);
        const result = maximumNumberOfSupplement(supplement, constraints);
        expect(result).toBe(100);
    });

    it('should return the maximum number of supplements for given constraints', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const supplement = createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }]);
        const result = maximumNumberOfSupplement(supplement, constraints);
        expect(result).toBe(16);
    });

    it('should return the maximum number of supplements for given constraints with multiple ingredients', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 },
            vitaminD: { target: 100, max: 200 }
        };

        const supplement = createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }, { name: 'vitaminD', amount: 150 }]);
        const result = maximumNumberOfSupplement(supplement, constraints);
        expect(result).toBe(1);
    });

    it('should return the maximum number of supplements for given constraints with multiple ingredients are at the maximum', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 12.5 },
            vitaminD: { target: 50, max: 150 }
        };

        const supplement = createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }, { name: 'vitaminD', amount: 150 }]);
        const result = maximumNumberOfSupplement(supplement, constraints);
        expect(result).toBe(1);
    });

    it('should return the maximum number of supplements for given constraints when one of the ingredients is already over the max', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 12.5 },
            vitaminD: { target: 50, max: 150 }
        };

        const supplement = createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }, { name: 'vitaminD', amount: 500 }]);
        const result = maximumNumberOfSupplement(supplement, constraints);
        expect(result).toBe(0);
    });

    it('should return the maximum number of supplements for given constraints when one of the ingredients is unrestrained', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 125 }
        };
        const supplement = createSupplement('small', [{ name: 'vitaminC', amount: 12.5 }, { name: 'vitaminD', amount: 500 }]);
        const result = maximumNumberOfSupplement(supplement, constraints);
        expect(result).toBe(10);
    });
});

describe('AmountsExceedConstraints', () => {
    it('should return false when no amounts are provided', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const amounts = {};
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(false);
    });

    it('should return false when amounts are within the constraints', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const amounts = {
            vitaminC: 100
        };
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(false);
    });

    it('should return true when amounts are over the constraints', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const amounts = {
            vitaminC: 201
        };
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(true);
    });

    it('should return false when amounts are within the constraints with multiple ingredients', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 },
            vitaminD: { target: 50, max: 150 }
        };
        const amounts = {
            vitaminC: 100,
            vitaminD: 50
        };
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(false);
    });

    it('should return true when amounts are over the constraints with multiple ingredients', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 },
            vitaminD: { target: 50, max: 150 }
        };
        const amounts = {
            vitaminC: 201,
            vitaminD: 250
        };
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(true);
    });

    it('should return true when one of the amounts is unconstrained but another is over the constraint', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const amounts = {
            vitaminC: 201,
            vitaminD: 250
        };
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(true);
    });

    it('should return false when one of the amounts is unconstrained but another is within the constraint', () => {
        const constraints: Constraints = {
            vitaminC: { target: 100, max: 200 }
        };
        const amounts = {
            vitaminC: 100,
            vitaminD: 250
        };
        const result = AmountsExceedConstraints(amounts, constraints);
        expect(result).toBe(false);
    });
});


describe('generateAllCombinations', () => {
    it('should return an empty array when no options are provided', () => {
        const result = generateAllCombinations([]);
        expect(result).toEqual([]);
    });

    it('should return only one combination when only one option is provided', () => {
        const result = generateAllCombinations([0]);
        expect(result).toEqual([[0]]);
    });

    it('should return all combinations for multiple options', () => {
        const result = generateAllCombinations([1]);
        expect(result).toEqual([[0], [1]]);
    });

    it('should return all combinations for multiple options', () => {
        const result = generateAllCombinations([2]);
        expect(result).toEqual([[0], [1], [2]]);
    });

    it('should return all combinations for multiple options', () => {
        const result = generateAllCombinations([1, 1]);
        expect(result).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
    });

    it('should return all combinations for multiple options', () => {
        const result = generateAllCombinations([1, 2]);
        expect(result).toEqual([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]);
    });

    it('should return all combinations for multiple options', () => {
        const result = generateAllCombinations([2, 2]);
        expect(result).toEqual([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]);
    });

    it('should throw an error when the number of options is too high', () => {
        expect(() => generateAllCombinations([100, 100, 100])).toThrowError('Too many combinations');
    });
});
