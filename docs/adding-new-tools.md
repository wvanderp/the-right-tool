# Adding a New Tool

This guide will help you add a new tool to the project.

## Directory Structure

New tools should be added under the `src/tools` directory. Each tool should have its own directory with the following structure:

```
src/tools/YourToolName/
├── YourTool.tsx           # Main component
├── README.md             # Documentation for your tool
├── types.ts             # (Optional) Type definitions
├── components/          # (Optional) Tool-specific components
└── __tests__/          # Test files
```

## Steps to Add a New Tool

1. **Create the Tool Directory**
   - Create a new directory under `src/tools` with your tool's name
   - Use PascalCase for the directory name (e.g., `JSONToGEOJSON`, `WeightedDistribution`)

2. **Create the Main Component**
   - Create your main tool component (e.g., `YourTool.tsx`)
   - The component should export a default React component
   - Example structure:
     ```tsx
     import React from 'react';

     export default function YourTool () {
       return (
         <div>
           {/* Your tool implementation */}
         </div>
       );
     };
     ```

3. **Add Documentation**
   - Create a `README.md` file in your tool's directory
   - Include:
     - Tool description
     - Usage instructions
     - Examples (if applicable)
     - Any special requirements or dependencies

4. **Register the Tool**
   - Open `src/main.tsx`
   - Import your tool component
   - Add it to the `tools` array with the required metadata:
     ```tsx
     const tools: ToolComponent[] = [
       // ...existing tools...
       {
         meta: {
           name: 'Your Tool Name',
           route: '/your-tool-route'
         },
         component: YourTool
       }
     ];
     ```

5. **Testing**
   - Create a `__tests__` directory in your tool's folder
   - Write tests for your tool's functionality
   - Follow the existing test patterns in other tools

## Best Practices

1. **Component Organization**
   - If your tool has multiple components, create a `components` directory
   - Keep components small and focused
   - Use TypeScript for better type safety

2. **State Management**
   - Use React hooks for state management
   - Consider using context if state needs to be shared between components

3. **Types**
   - Create a `types.ts` file if you have tool-specific types
   - Export all types and interfaces
   - Use TypeScript's strict mode

4. **Styling**
   - Use Tailwind CSS classes for styling
   - Follow the project's existing styling patterns
   - Make sure your tool is responsive

## Example

Here's a minimal example of adding a new calculator tool:

```tsx
// src/tools/Calculator/Calculator.tsx
import React, { useState } from 'react';

export default function Calculator () {

  const [result, setResult] = useState<number>(0);

  return (
    <div className="p-4">
      <h1>Calculator</h1>
      {/* Implementation */}
    </div>
  );
};

export default Calculator;

// In src/main.tsx
import Calculator from './tools/Calculator/Calculator';

const tools: ToolComponent[] = [
  // ...existing tools...
  {
    meta: {
      name: 'Calculator',
      route: '/calculator'
    },
    component: Calculator
  }
];
```

## Common Issues and Solutions

1. **Route Not Showing**
   - Make sure the route in metadata is unique
   - Verify the component is properly exported and imported

2. **TypeScript Errors**
   - Ensure your component implements the correct interfaces
   - Check that all required props are properly typed

3. **Styling Issues**
   - Use the browser dev tools to inspect class names
   - Check Tailwind CSS documentation for correct utility classes

## Need Help?

If you run into issues while adding your tool:
- Check the existing tools for examples and patterns
- Review the project's TypeScript configuration
- Test your changes locally before committing