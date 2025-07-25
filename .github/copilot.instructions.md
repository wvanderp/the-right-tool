Always use tailwind to style the app.
Use hover states to indicate interactive elements.
Never use drop shadows, gradients, or animations.
Prefer utility classes (like .btn-primary, .btn-secondary, .card) over inline Tailwind classes when available.
We are using tailwind v4

---

Use function components with hooks.

```tsx
interface ReactComponentProps {
  name: string;
}

export default function ReactComponent(props: ReactComponentProps) {
  return <h1>Hello {props.name}.</h1>;
}
```

---

Separate UI components from business logic.
For each tool, create a main React function component for the UI.
Place the core logic (heavy lifting) in separate TypeScript functions or modules within the tool's directory (e.g., `toolLogic.ts`).

---

You should always fix typos, grammar, and spelling mistakes.
Sentences start with a capital letter and end with a period.

---

Run the test to make sure the code is working as expected.

```npm
npm run test
```

This is using Vitest and the run will make it do a single run of the tests instead of watching the files.

---

Make sure to update the documentation if you change the code.

This includes updating:

- The general README file in the root of the project.
- The README file of the tool you are working on.
- The style guide if you change the style of the app.

---

The name of the site is `The Right Tool` and the domain is `therighttool.dev`.
The name should always be written in title case.

The tagline is `Why use the wrong tool when you can use the right one?`.

---

If you want to use icons then you should use the `react-icons` package.

---

When I report a bug, before fixing the bug you must first add a failing test that reproduces the bug. Run the test first. Only after the test is in place and failing, you may proceed to fix the bug and ensure the test passes.

---

You dont have to ask permission to edit the code. I trust you to make the right decisions and changes to improve the codebase.
If you think something can be improved, go ahead and do it.
