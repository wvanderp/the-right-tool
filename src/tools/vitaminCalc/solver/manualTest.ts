import { solve } from './solver';

const constraints = {
    vitaminC: { target: -1, max: 200 },
    vitaminD: { target: 50, max: 150 }
};

const options = [
    { id: 1, name: 'combo', maker: 'unknown', ingredients: [{ name: 'vitaminC', amount: 100 }, { name: 'vitaminD', amount: 25 }] }
];

const results = solve(constraints as any, options as any);

console.log('Results length:', results.length);
console.log('Top result distance:', results[0]?.distance);
console.log('Top result numberOfSupplements:', results[0]?.numberOfSupplements);
console.log('Top result supplements:', results[0]?.supplements.map(s => [s[0], s[1].name]));

// Print first result full for inspection
console.log('First result full:', JSON.stringify(results[0], null, 2));
