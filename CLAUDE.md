# Agent Guidelines

This repository is a standalone TypeScript library that provides **universal schema introspection for TypeScript validation libraries**. It extracts metadata (types, constraints, optionality, etc.) from schemas created with libraries like Zod, Yup, Valibot, and ArkType.

## Essential Commands

```bash
pnpm run build       # Build ESM + CJS bundles with type declarations
pnpm run dev         # Build in watch mode
pnpm run test        # Run all tests with Vitest
pnpm run lint        # Check code style with Biome
pnpm run lint-fix    # Auto-fix linting and formatting issues
pnpm run tsc         # Type-check
```

## Tooling

- **Package manager:** `pnpm`.
- **Build:** `tsup` – outputs ESM (`dist/index.js`), CJS (`dist/index.cjs`), and type declarations.
- **Testing:** Vitest. Tests live alongside source files in `src/` with `.test.ts` suffix.
- **Linting & formatting:** [Biome](https://biomejs.dev). Check with `pnpm run lint` and auto-fix with `pnpm run lint-fix`.
- **Type checking:** `pnpm run tsc`.

### TypeScript Guidelines
- **TYPE OVER INTERFACE**: Use `type` instead of `interface` when possible (prefer type aliases)
- **TYPE INFERENCE**: Use TypeScript's inference where possible, but define types for public API surface
- **MINIMAL ANNOTATIONS**: Only add types when required by strict mode or for clarity
- **STRICT MODE**: All TypeScript features enabled for maximum safety
- **GENERIC INFERENCE**: Design generics to be inferred from parameters
- **NO ANY**: ALWAYS avoid `any` - proper types instead, or use `unknown` as a last resort
- **AVOID RETURN TYPES**: DO NOT ADD RETURN TYPES to functions unless strictly necessary

## Coding Style

- NEVER add backwards compatibility to plans or implementations unless explicitly required.
- Do not add comments to the code unless it's an incredibly complex operation.
- Formatting is handled by Biome. It enforces:
  - 2 space indentation.
  - Single quotes.
  - Trailing commas where valid.
  - Semicolons only when required (`semicolons: "asNeeded"`).
- Avoid abbreviations when naming things.
- Avoid Hasty Abstractions: it is OK to repeat things here and there until the right abstraction emerges.
- Run `pnpm run lint-fix` before committing to ensure formatting and import ordering.

## Fixing Bugs

When addressing a bug, follow a test-driven development approach:

1. **Red** – Write a test that reproduces the issue and fails.
2. **Green** – Implement the minimal fix so the new test passes.
3. **Refactor** – Clean up the solution while keeping all tests green.

## Definition of Done

- A task is not done unless `pnpm run lint`, `pnpm run tsc`, and `pnpm run test` are all passing.
- A task is not done if it has leftover comments. ALWAYS remove leftover comments before finishing.

## Batch scripts and delegation to other agents

- DO NOT delegate repetitive tasks to other agents
- DO NOT use batch scripts to make edits across multiple files
- Edit each file individually and manually
- If you really think a task justifies a batch script, include this in the plan or ask a follow-up question with your reasoning
