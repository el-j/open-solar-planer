# GitHub Copilot Instructions — Open Solar Planer

## Project Overview

**Open Solar Planer** is a free, open-source, fully static solar module layout planner built with React 19, TypeScript, Vite, and Tailwind CSS v4. Hosted on GitHub Pages. No backend.

---

## Architecture

- **`src/App.tsx`** — the entire application in one component plus exported pure functions
- **`calculateLayout()`** — pure function exported from `App.tsx`; keep it pure and tested
- **`PRESETS`** — exported constant array of panel presets
- Tailwind CSS v4 (`@import "tailwindcss"` in `index.css`, configured via `@tailwindcss/vite`)
- No router, no state management library — keep it simple

---

## GitHub Issues — Always Check First

**Every piece of work is tracked in a GitHub Issue. Use MCP tools to check before doing anything:**

```
github-mcp-server-list_issues        owner="el-j" repo="open-solar-planer" state="OPEN"
github-mcp-server-issue_read         method="get" owner="el-j" repo="open-solar-planer" issue_number=<N>
github-mcp-server-search_issues      query="<keywords> repo:el-j/open-solar-planer"
github-mcp-server-pull_request_read  method="get" owner="el-j" repo="open-solar-planer" pullNumber=<N>
```

> **After the `feat/implement-github-issue-tracking` PR is merged**, run the seed workflow
> (Actions → "Seed GitHub Issues" → Run workflow) to populate all labels, milestones, and 34 sprint issues.
> Also create a `develop` branch from `main`.

If no issue exists for the work, create one first:
```bash
gh issue create --title "feat: …" --label "type/feat,phase/0,status/planned" --body "…"
```

---

## Branch Strategy (GitFlow + SemVer)

| Branch | Base | PR target | SemVer |
|--------|------|-----------|--------|
| `feature/<name>` | `develop` | `develop` | minor pre-release |
| `fix/<name>` | `develop` | `develop` | patch pre-release |
| `bugfix/<name>` | `develop` | `develop` | patch pre-release |
| `hotfix/<name>` | `main` | `main` + back-merge `develop` | patch |
| `release/<ver>` | `develop` | `main` + back-merge `develop` | release candidate |

**Never open a PR from `feature/*` or `fix/*` directly to `main`.**

---

## Commit Convention (REQUIRED — drives GitVersion SemVer)

```
feat: add polygon roof outline tool        ← minor bump
fix: correct landscape mode panel count    ← patch bump
docs: update README with setup steps       ← no bump
chore: update tailwindcss to v4.2          ← no bump
test: add edge case for zero-gap layouts   ← no bump
ci: add coverage upload to CI workflow     ← no bump
feat!: redesign canvas API                 ← MAJOR bump

Closes #42
```

---

## Coding Conventions

- **TypeScript strict mode** — always type everything explicitly, no `any`
- **Functional components** with hooks only — no class components
- **Exported pure functions** for all business logic (testable independently)
- **`data-testid`** attributes on key interactive/output elements
- **`aria-label`** on all form inputs and interactive elements
- Tailwind utility classes only — no custom CSS unless for dynamic inline values
- Follow existing naming: `camelCase` for variables/functions, `PascalCase` for components/types

---

## Testing

- Tests live in `src/test/`
- Unit tests for pure functions in `*.test.ts`
- Component integration tests in `*.test.tsx` using `@testing-library/react`
- Run with `npm test`

---

## Workflow

1. **Read the GitHub Issue** via MCP (`github-mcp-server-issue_read`)
2. Branch from `develop` (features/fixes) or `main` (hotfixes) with correct naming
3. Make changes, write/update tests
4. Ensure `npm run lint`, `npm test`, `npm run build` all pass
5. Open PR to `develop` (or `main` for hotfixes) — add `Closes #N`
6. CI runs GitVersion + lint + test + build automatically
7. Merge to `develop` → pre-release version; merge `release/*` to `main` → GitHub Release + Pages deploy

---

## Do NOT

- Add a backend or any server-side code
- Install heavy dependencies — keep bundle size small
- Write inline styles except for dynamic values
- Skip tests for new pure logic functions
- Use class components
- Commit without a conventional commit message and issue reference
- Open a PR to `main` from a `feature/*` or `fix/*` branch
