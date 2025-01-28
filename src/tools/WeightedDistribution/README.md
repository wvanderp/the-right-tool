# WeightedDistribution

A tool for distributing a total amount across multiple items using percentage-based weights.

## Features

- Distribute any numeric amount across multiple items
- Lock individual items to preserve their percentage
- Dynamic redistribution of remaining percentages
- Real-time validation and feedback
- Add/remove items dynamically
- Precise decimal handling (one decimal place)
- Drag sliders or input exact values
- Visual feedback for locked/unlocked states

## How to Use

1. Enter the total amount you want to distribute
2. Add or remove items using the buttons
3. For each item:
   - Set a name
   - Adjust the percentage using the slider
   - Lock/unlock the percentage using the 🔒/🔓 button
   - Remove items you don't need

The tool will automatically:

- Calculate the distributed amounts
- Normalize remaining percentages
- Validate the total equals 100%
- Show warning if distribution is invalid

## Rules and Behaviors

### Percentage Distribution Rules

- Total of all weights must equal 100%
- Each item has a weight between 0% and 100%
- Weights are displayed with one decimal precision
- Distribution is marked invalid if total percentage ≠ 100%

### Locking Mechanism

- 🔒 Locked items maintain their exact percentage
- 🔓 Unlocked items share remaining percentage proportionally
- Maximum available percentage is dynamically calculated
- Locked items take precedence over unlocked ones

### Weight Redistribution Logic

When changes occur:

1. Locked percentages are preserved
2. Remaining percentage is calculated (100% - sum of locked)
3. Unlocked items share remaining percentage:
   - If all weights are 0: equal distribution
   - Otherwise: proportional to their current weights

## Technical Implementation

The tool consists of two main parts:

1. DistributionCalculator - Pure business logic
2. React Component - UI implementation

### Core Components

- Weight normalization
- Validation logic
- Lock/unlock functionality
- Even distribution algorithm

## Technical Details

```typescript
interface DistributionItem {
    name: string;
    weight: number;    // 0-100
    locked?: boolean;
    value?: number;    // Calculated amount
}

// Example usage
const config = {
    totalAmount: 1000,
    items: [
        { name: 'Rent', weight: 50, locked: true },   // Always 500€
        { name: 'Food', weight: 30 },                 // 300€
        { name: 'Savings', weight: 20 }               // 200€
    ]
};
```

## Error Handling

The tool handles several edge cases:

- Over-allocation (>100%)
- Under-allocation (<100%)
- All items locked
- Zero-weight items
- Decimal precision rounding

## Tips

- Lock important items first
- Use small adjustments for fine-tuning
- Watch the total percentage indicator
- Unlock items to auto-redistribute

## Future Improvements

1. Unallocated percentage indicator
2. Custom rounding strategies
3. Import/export configurations
4. Visualization options
