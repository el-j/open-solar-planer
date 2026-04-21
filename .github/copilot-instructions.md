# GitHub Copilot Instructions — Open Solar Planer

## Project Overview

This is **Open Solar Planer** — a free, open-source, fully static solar module layout planner built with React 19, TypeScript, Vite, and Tailwind CSS v4. It is hosted on GitHub Pages. There is no backend.

## Architecture

- **`src/App.tsx`** — the entire application lives in one component plus exported pure functions
- **`calculateLayout()`** — pure function exported from `App.tsx` that computes panel grid layout; keep it pure and test it
- **`PRESETS`** — exported constant array of panel presets
- Tailwind CSS v4 (imported via `@import "tailwindcss"` in `index.css`, configured via `@tailwindcss/vite` plugin)
- No router, no state management library — keep it simple

## Coding Conventions

- **TypeScript strict mode** — always type everything explicitly
- **Functional components** with hooks only — no class components
- **Exported pure functions** for all business logic so they can be unit-tested independently
- **`data-testid`** attributes on key interactive/output elements for testing
- **`aria-label`** on all form inputs and interactive elements
- Tailwind utility classes only — no custom CSS unless absolutely necessary
- Follow existing naming: `camelCase` for variables/functions, `PascalCase` for components/types

## Commit Convention (REQUIRED)

All commits **must** use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add polygon roof outline tool
fix: correct landscape mode panel count
docs: update README with setup steps
chore: update tailwindcss to v4.2
test: add edge case for zero-gap layouts
ci: add coverage upload to CI workflow
```

This drives automated semantic versioning via Release Please.

## Testing

- Tests live in `src/test/`
- Unit tests for pure functions in `*.test.ts`
- Component integration tests in `*.test.tsx` using `@testing-library/react`
- Run with `npm test`

## Workflow

1. Create a GitHub issue for any change
2. Branch from `main` using pattern `feat/<name>` or `fix/<name>`
3. Make changes, write/update tests
4. Ensure `npm run lint`, `npm test`, `npm run build` all pass
5. Open PR referencing the issue — CI runs automatically
6. Merge to `main` triggers deploy to GitHub Pages
7. Release Please will aggregate conventional commits and open a release PR when appropriate

## Do NOT

- Add a backend or any server-side code
- Install heavy dependencies — keep bundle size small
- Write inline styles except for dynamic values (scale factors, pixel dimensions)
- Skip tests for new pure logic functions
- Use class components
- Commit without a conventional commit message
