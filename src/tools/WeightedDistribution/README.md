# WeightedDistribution

A tool for distributing a total amount across multiple items using percentage-based weights.

## Features

- Distribute any numeric amount across multiple items
- Lock individual items to preserve their percentage
- Dynamic redistribution of remaining percentages
- Real-time validation
- Add/remove items dynamically

## Rules and Behaviors

### Percentage Distribution Rules

- Total of all weights must equal 100%
- Each item has a weight between 0% and 100%
- Weights are displayed with one decimal precision
- Distribution is marked invalid if:
  - Total percentage is not 100%
  - Sum of locked items exceeds 100%

### Locking Mechanism

- Items can be individually locked/unlocked
- Locked items maintain their percentage
- Remaining percentage is distributed evenly among unlocked items
- When locked items exceed 100%, unlocked items are set to 0%

### Weight Redistribution

- Adding a new item redistributes remaining percentage evenly
- Removing an item redistributes its percentage among unlocked items
- Zero-weight items participate in equal distribution of remaining percentage

## Technical Implementation

The tool consists of two main parts:

1. DistributionCalculator - Pure business logic
2. React Component - UI implementation

### Core Components

- Weight normalization
- Validation logic
- Lock/unlock functionality
- Even distribution algorithm

## Usage Example

```typescript
const config = {
  totalAmount: 1000,
  items: [
    { name: 'Item 1', weight: 40, locked: true },  // Locked at 40% (400€)
    { name: 'Item 2', weight: 30 },                // Will get 30% (300€)
    { name: 'Item 3', weight: 30 }                 // Will get 30% (300€)
  ]
};
```

## Future Improvements

1. Unallocated percentage indicator
2. Custom rounding strategies
3. Import/export configurations
4. Visualization options
