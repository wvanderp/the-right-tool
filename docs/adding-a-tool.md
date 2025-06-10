# How to Add a New Tool to The Right Tool

This guide outlines the steps required to add a new tool to "The Right Tool" application.

## 1. Create the Tool Folder

Create a new folder for your tool under `src/tools/`. The folder name should be descriptive and use PascalCase (e.g., `MyNewTool`).

```
src/
└── tools/
    └── MyNewTool/
```

## 2. Build the Tool Component

Inside your new tool folder (`src/tools/MyNewTool/`), create the main React component file (e.g., `MyNewTool.tsx`).

- **Use Function Components:** Follow the project standard of using React function components with hooks.
- **TypeScript:** Write the component in TypeScript.
- **Styling:** Use Tailwind CSS for all styling. Adhere to the guidelines in `docs/STYLE_GUIDE.md`. Ensure interactive elements have hover states. Avoid drop shadows, gradients, and animations.
- **Logic:** Keep the core logic separate from the component if it becomes complex. You can create additional `.ts` files within the tool's folder (e.g., `myNewToolLogic.ts`).

Example basic structure (`MyNewTool.tsx`):

```tsx
import React, { useState } from "react";
import ToolPage from "../../components/ToolPage"; // Common layout for all tools
import ToolDescription from "../../components/ToolDescription";

// If your tool has complex logic, place it in a separate file (e.g., myNewToolLogic.ts) and import it here.
// import { processInput } from "./myNewToolLogic";

export default function MyNewTool() {
  // State for your tool's inputs and outputs
  const [inputValue, setInputValue] = useState("");
  const [outputValue, setOutputValue] = useState("");

  const handleProcess = () => {
    // Implement your tool's logic here or call your logic function
    // setOutputValue(processInput(inputValue));
  };

  return (
    <ToolPage title="My New Tool">
      <ToolDescription>
        A brief description of what this tool does. Explain the tool's purpose,
        how to use it, and any important details users should know.
      </ToolDescription>

      {/* Input Area */}
      <div className="mb-4">
        <label
          htmlFor="input"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Input
        </label>
        <textarea
          id="input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full"
          rows={5}
        />
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcess}
        className="btn-primary"
        type="button"
      >
        Process
      </button>

      {/* Output Area */}
      {outputValue && (
        <div className="mt-4">
          <label
            htmlFor="output"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Output
          </label>
          <textarea
            id="output"
            value={outputValue}
            readOnly
            className="w-full p-2 border border-gray-300 rounded bg-gray-50"
            rows={5}
          />
        </div>
      )}
    </ToolPage>
  );
}
```

## 2a. Use Common Components

All tools should use the following common components and structure for consistency:

- **ToolPage**: Wrap your tool UI in the `ToolPage` component from `src/components/ToolPage.tsx`. This provides a consistent layout and title for every tool. The ToolPage component only accepts a `title` prop and `children`.
- **ToolDescription**: For tool descriptions, use the `ToolDescription` component from `src/components/ToolDescription.tsx`. This ensures a consistent, styled description area at the top of each tool. Place it as the first child inside ToolPage. Example usage:

  ```tsx
  import ToolDescription from "../../components/ToolDescription";

  <ToolPage title="My New Tool">
    <ToolDescription>
      Your tool description goes here. Explain what the tool does and any
      important details.
    </ToolDescription>
    {/* Rest of your tool content */}
  </ToolPage>
  ```

- **Separation of Logic**: Place any complex or reusable logic in a separate file (e.g., `myNewToolLogic.ts`) within your tool's folder. Import and use these functions in your main component.
- **Consistent UI Elements**: Use `<label>`, `<textarea>`, `<input>`, and `<button>` elements styled with Tailwind CSS utility classes (like `.btn-primary` for buttons). Always provide hover states for interactive elements. Do not use drop shadows, gradients, or animations.
- **Testing and Documentation**: Each tool must have a `README.md` and a `__tests__` folder for logic tests.

**Example folder structure:**

```
src/
  tools/
    MyNewTool/
      MyNewTool.tsx           // Main React component (UI)
      myNewToolLogic.ts       // Core logic (if needed)
      README.md               // Tool documentation
      __tests__/
        myNewToolLogic.test.ts // Unit tests for logic
```

## 3. Register the Tool

To make the tool accessible in the application, you need to register it:

### 3a. Add Import and Tool Entry in main.tsx

1. **Import your component** at the top of `src/main.tsx`:

   ```tsx
   import MyNewTool from "./tools/MyNewTool/MyNewTool";
   ```

2. **Add your tool to the tools array** in `src/main.tsx`:

   ```tsx
   const tools: ToolComponent[] = [
     // ...existing tools...
     {
       meta: {
         name: "My New Tool",
         route: "/my-new-tool",
       },
       component: MyNewTool,
     },
   ];
   ```


**Important Notes:**
- Use kebab-case for routes (e.g., `/my-new-tool`).
- The route should be unique and descriptive.

## 4. Add Documentation

- **Tool README:** Create a `README.md` file inside your tool's folder (`src/tools/MyNewTool/README.md`). Explain what the tool does, how to use it, and any specific details about its functionality.
- **Main README:** Update the main `README.md` file in the project root to include your new tool in the "Available Tools" list.

## 5. Write Tests

- Create a `__tests__` subfolder within your tool's directory (`src/tools/MyNewTool/__tests__/`).
- Write unit tests for your tool's logic using Vitest. Name the test file appropriately (e.g., `myNewToolLogic.test.ts`).
- Ensure tests cover the core functionality and edge cases.
- Run tests using `npm test run` to ensure they pass.

## 6. Code Style and Conventions

- Follow the existing code style and conventions found throughout the project.
- Ensure code is well-commented where necessary.
- Fix any typos, grammar, or spelling mistakes in code and documentation.

## Checklist

- [ ] Tool folder created (`src/tools/MyNewTool/`).
- [ ] Main tool component created (`MyNewTool.tsx`).
- [ ] Tool uses React function components and hooks.
- [ ] Tool is styled with Tailwind CSS, following the style guide.
- [ ] Interactive elements have hover states.
- [ ] Tool logic is implemented (potentially in separate files).
- [ ] Tool is registered in `src/main.tsx` (import and tools array).
- [ ] Tool-specific `README.md` is created and filled.
- [ ] Main project `README.md` is updated.
- [ ] Unit tests are written in the `__tests__` folder.
- [ ] Tests pass when running `npm test run`.
- [ ] Code adheres to project style and conventions.
- [ ] Code and documentation are free of typos and grammatical errors.

By following these steps, you can successfully contribute a new tool to "The Right Tool" project.
