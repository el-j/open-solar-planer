# CLAUDE.md — Open Solar Planer

## Project Summary

**Open Solar Planer** is a free, open-source solar PV layout planner built as a fully static React/TypeScript SPA, hosted on GitHub Pages. Users enter roof dimensions, choose panel presets, set mounting gaps, and see a live visual grid of how many panels fit and the total power output.

**Live app:** https://el-j.github.io/open-solar-planer/
**Repository:** https://github.com/el-j/open-solar-planer

---

## Tech Stack

- **React 19** + **TypeScript** (strict)
- **Vite** (build tool, `@tailwindcss/vite` plugin)
- **Tailwind CSS v4** (`@import "tailwindcss"` in `src/index.css`)
- **lucide-react** (icons)
- **Vitest** + **@testing-library/react** (tests)
- **GitHub Actions** (CI, deploy to Pages, Release Please)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Entire app — component + exported pure functions |
| `src/test/layout.test.ts` | Unit tests for `calculateLayout()` |
| `src/test/App.test.tsx` | Integration tests for the React component |
| `src/test/setup.ts` | Vitest setup (jest-dom matchers) |
| `vite.config.ts` | Vite config with Tailwind plugin, test config, base path |
| `.github/workflows/ci.yml` | Lint + test + build on PRs and pushes to main |
| `.github/workflows/deploy.yml` | Deploy to GitHub Pages on push to main |
| `.github/workflows/release.yml` | Release Please for automated semver |
| `release-please-config.json` | Release Please configuration |

---

## Core Logic

### `calculateLayout(roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY)`

Pure function exported from `App.tsx`. Returns `{ cols, rows, totalPanels, totalPowerWp, effectivePanelWidth, effectivePanelHeight }`.

Formula:
- If landscape: swap width/length
- `cols = floor((roofWidth + gapX) / (effectivePanelWidth + gapX))`
- `rows = floor((roofHeight + gapY) / (effectivePanelHeight + gapY))`
- `totalPanels = max(0, cols) * max(0, rows)`

Always keep this function pure and exported so it stays testable.

---

## Development Commands

```bash
npm run dev           # Dev server at localhost:5173/open-solar-planer/
npm run build         # Production build to dist/
npm run lint          # ESLint
npm test              # Run tests once (Vitest)
npm run test:watch    # Tests in watch mode
npm run test:coverage # Coverage report
```

---

## Commit Convention

**ALL commits must follow Conventional Commits:**

```
feat: add polygon roof drawing
fix: correct panel count in landscape mode
docs: add screenshot to README
chore: update lucide-react
test: add zero-gap edge case
ci: add test coverage upload
```

Types: `feat` | `fix` | `perf` | `refactor` | `docs` | `test` | `chore` | `ci`

Breaking change: `feat!:` or add `BREAKING CHANGE:` footer.

---

## Release Process (Automated)

[Release Please](https://github.com/googleapis/release-please) handles versioning:
- `fix:` → patch bump
- `feat:` → minor bump
- `feat!:` → major bump

When commits land on `main`, Release Please opens a release PR. Merging it creates a GitHub Release + tag. No manual versioning needed.

---

## GitHub Workflow for Issues

1. All work tracked via **GitHub Issues** (bug report / feature request templates in `.github/ISSUE_TEMPLATE/`)
2. Branch from `main`, name: `feat/<description>` or `fix/<description>`
3. PR references issue (`Closes #N`), uses PR template in `.github/PULL_REQUEST_TEMPLATE.md`
4. CI must pass before merge
5. Release PR created automatically by Release Please

---

## Coding Rules

- No backend, no API calls — fully static
- TypeScript strict — no `any`
- Functional components + hooks only
- All business logic in pure exported functions
- `data-testid` on key output elements (`total-panels`, `total-power`, `layout-grid`, `canvas`, `panel`)
- `aria-label` on all inputs and interactive elements
- Tailwind only — no custom CSS except for dynamic inline styles
- Keep bundle small — no heavy dependencies
- Tests required for all new pure functions
