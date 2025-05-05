# How to Add a New Tool to The Right Tool

This guide outlines the steps required to add a new tool to the "The Right Tool" application.

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
    <ToolPage
      title="My New Tool"
      description="A brief description of what this tool does."
    >
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
          className="w-full p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
          rows={5}
        />
      </div>

      {/* Process Button */}
      <button
        onClick={handleProcess}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
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

- **ToolPage**: Wrap your tool UI in the `ToolPage` component from `src/components/ToolPage.tsx`. This provides a consistent layout and title for every tool.
- **ToolDescription**: For tool descriptions, use the `ToolDescription` component from `src/components/ToolDescription.tsx`. This ensures a consistent, styled description area at the top of each tool. Example usage:

  ```tsx
  import ToolDescription from "../../components/ToolDescription";

  <ToolDescription>
    Your tool description goes here. Explain what the tool does and any
    important details.
  </ToolDescription>;
  ```

- **Separation of Logic**: Place any complex or reusable logic in a separate file (e.g., `myNewToolLogic.ts`) within your tool's folder. Import and use these functions in your main component.
- **Consistent UI Elements**: Use `<label>`, `<textarea>`, `<input>`, and `<button>` elements styled with Tailwind CSS. Always provide hover states for interactive elements. Do not use drop shadows, gradients, or animations.
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

To make the tool accessible in the application, you need to register it.

1.  **Define Tool Metadata:** Add an entry for your new tool in the `tools` array within `src/HomePage.tsx`. This object should include:

    - `name`: The display name of the tool.
    - `description`: A short description.
    - `path`: The URL path for the tool (e.g., `/my-new-tool`).
    - `component`: A lazy-loaded import of your tool's main component.

    Example entry in `src/HomePage.tsx`:

    ```tsx
    // ... other imports ...
    import { Tool } from "./types/ToolComponent"; // Ensure Tool type is imported

    // ... existing tools ...

    const MyNewToolComponent = React.lazy(
      () => import("./tools/MyNewTool/MyNewTool")
    );

    const tools: Tool[] = [
      // ... existing tool definitions ...
      {
        name: "My New Tool",
        description: "A brief description of what this tool does.",
        path: "/my-new-tool",
        component: MyNewToolComponent,
      },
    ];

    // ... rest of HomePage.tsx ...
    ```

2.  **Add Route:** The routing is handled automatically by the `HomePage.tsx` component based on the `tools` array. Ensure the `path` you defined is unique.

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
- [ ] Tool is registered in `src/HomePage.tsx`.
- [ ] Tool-specific `README.md` is created and filled.
- [ ] Main project `README.md` is updated.
- [ ] Unit tests are written in the `__tests__` folder.
- [ ] Tests pass when running `npm test run`.
- [ ] Code adheres to project style and conventions.
- [ ] Code and documentation are free of typos and grammatical errors.

By following these steps, you can successfully contribute a new tool to "The Right Tool" project.
