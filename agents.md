# AGENTS.md

## Project Identity

- The site name is **The Right Tool** and must be written in title case.
- The domain is `therighttool.dev`.
- The tagline is: `Why use the wrong tool when you can use the right one?`.
- The Right Tool is an open-source collection of focused, reliable, privacy-conscious browser tools.
- Build for medium to advanced users who want fast results without ads, waiting, tracking, or gimmicks.

## Product Principles

- Every tool should have one clear main purpose.
- Advanced features and configuration are welcome, but they should stay out of the way by default.
- Defaults should work well without setup.
- When an operation is deterministic and not computationally expensive, update the output automatically as input changes.
- Require a button only when the operation is expensive, destructive, non-deterministic, or needs explicit user intent.
- Prefer local browser functionality. Do not collect or store user data on servers.
- Store preferences in local browser storage only when needed, and keep them easy to clear.
- Call external services only when the feature cannot reasonably be done locally or requires external data. Make it clear what data is sent.

## Tech Stack And Code Style

- Use React function components with hooks.
- Write components and logic in TypeScript.
- Separate UI from business logic. Each tool should have a main React component for the UI and separate TypeScript modules for heavy or reusable logic.
- Use Tailwind CSS v4 for styling.
- Prefer existing project utility classes such as `.btn-primary`, `.btn-secondary`, `.card`, `.transition-custom`, and `.text-readable` when they fit.
- Use `react-icons` for icons.
- Fix typos, grammar, and spelling mistakes as you work.
- Sentences in user-facing text and documentation should start with a capital letter and end with a period.

## Styling And Design

- Do not use drop shadows, gradients, or decorative animations.
- Use hover states for interactive elements.
- Use focus states for form controls and buttons.
- Keep transitions limited to state feedback such as hover, focus, color, and opacity changes. Use the project standard 200ms timing where applicable.
- Use the full viewport effectively. Tools, result panels, canvases, sidebars, and controls should expand to fill available width and height.
- Avoid large unused margins. On wide screens, prefer fluid multi-column layouts, full-width panels, and flexible grids.
- Keep text-heavy content readable with sensible max widths, while surrounding tool surfaces can use the available space.
- Use Tailwind's default responsive breakpoints: `sm`, `md`, `lg`, and `xl`.
- Desktop navigation is a fixed sidebar. Mobile navigation collapses to a hamburger menu.
- Mobile layouts must be fully usable, touch-friendly, and stack complex grids vertically.
- Use common spacing from the 4px grid: 8px, 16px, 24px, 32px, and 48px.
- Use a clean system font stack with a 16px base size and comfortable line-height.
- Use normal, medium, and bold font weights for hierarchy.

## Brand And UI Patterns

- Use the configured Tailwind theme colors and project utility classes instead of hard-coded colors when possible.
- The primary brand color is a warm yellow used for primary actions, active navigation, links, highlights, and focus states.
- Main content areas should generally use white backgrounds.
- Navigation and structural surfaces use subtle light gray or dark gray backgrounds.
- Text hierarchy should use dark gray for primary text, medium gray for secondary text, and lighter gray for subtle text.
- Buttons should have clear default, hover, focus, and active states.
- Links use the primary yellow color and should underline on hover.
- Inputs should use light borders, rounded corners, and yellow focus rings.
- Code areas should use a monospace font, comfortable padding, and scroll when needed.
- Upload areas should use dashed borders.
- Sliders should use the yellow accent color.
- Communicate errors, success, loading, and disabled states clearly.
- Use semantic result colors where helpful:
  - Green for success or intersections.
  - Blue for information or alternatives.
  - Orange for warnings or differences.
  - Red for errors or problems.
  - Purple only when multiple alternative difference types are needed.
- Color-coded sections should include consistent padding, rounded corners, item count badges when useful, copy-to-clipboard support where useful, and concise help text.

## Tool Layout Conventions

- Wrap each tool in `ToolPage` from `src/components/ToolPage.tsx`.
- `ToolPage` accepts only `title` and `children`.
- Put `ToolDescription` from `src/components/ToolDescription.tsx` near the top of each tool.
- Use consistent labels, inputs, textareas, buttons, controls, and result panels.
- For side-by-side input layouts, use responsive grids such as `grid-cols-1 md:grid-cols-2`.
- For broader result layouts, use responsive grids such as `xl:grid-cols-2`.
- Use cards for grouped tool surfaces where appropriate, with subtle borders and comfortable padding.

## Adding A New Tool

1. Create a PascalCase folder under `src/tools/`, for example `src/tools/MyNewTool/`.
2. Create the main tool component, for example `MyNewTool.tsx`.
3. Put complex or reusable logic in a separate `.ts` file in the same tool folder.
4. Add unit tests in a `__tests__` folder, focused on the tool logic and edge cases.
5. Add a tool-specific `README.md`.
6. Register the tool in `src/main.tsx` with a dynamic import:

   ```tsx
   const MyNewTool = React.lazy(() => import("./tools/MyNewTool/MyNewTool"));
   ```

7. Add the tool to the `tools` array in `src/main.tsx`.
8. Use a unique, descriptive kebab-case route, for example `/my-new-tool`.
9. Update the root `README.md` available tools list.

Use dynamic imports for all tool components so each tool is code-split and loaded only when needed.

## Testing And Verification

- Use `pnpm` for project commands. The project declares `pnpm@11.7.0`.
- Run tests with `pnpm test`. This uses Vitest in single-run mode.
- When reporting or fixing a bug, first add a failing test that reproduces the bug.
- Run the new test and confirm it fails before implementing the fix.
- After the fix, run the relevant tests again and confirm they pass.
- Run broader tests when the change affects shared behavior, cross-tool contracts, or user-facing workflows.
- Use the Playwright MCP server when browser verification is useful.
- Start the app with `pnpm run dev` before browser testing.
- Open the localhost URL from the dev server. Do not open `index.html` directly because the app is an SPA.
- Determine the relevant route or component path before opening files or testing in the browser.

## Documentation

- Update documentation when code changes.
- Update the root `README.md` when tools are added, removed, renamed, or materially changed.
- Update the tool-specific `README.md` when tool behavior, inputs, outputs, or usage changes.
- Update the style guide when the app's visual language or reusable style patterns change.

## Agent Workflow

- You do not need to ask permission before editing code in this repository.
- Keep changes scoped to the task and consistent with existing project patterns.
- If a directly related improvement is obvious, make it.
- Preserve project conventions over introducing new abstractions.
- Prefer tested, maintainable logic over UI-only behavior.
