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
- **GitHub Actions** (CI, deploy to Pages, GitVersion-based release)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Entire app — component + exported pure functions |
| `src/test/layout.test.ts` | Unit tests for `calculateLayout()` |
| `src/test/App.test.tsx` | Integration tests for the React component |
| `src/test/setup.ts` | Vitest setup (jest-dom matchers) |
| `vite.config.ts` | Vite config with Tailwind plugin, test config, base path |
| `GitVersion.yml` | SemVer branch strategy (GitFlow) |
| `.github/workflows/ci.yml` | Lint + test + build + Pages deploy |
| `.github/workflows/release.yml` | GitVersion auto-tag + GitHub Release on main |
| `.github/workflows/seed-issues.yml` | workflow_dispatch — seeds labels/milestones/issues |
| `scripts/seed-github-issues.mjs` | Node.js issue seed script |

---

## Core Logic

### `calculateLayout(roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY)`

Pure function exported from `App.tsx`. Returns `{ cols, rows, totalPanels, totalPowerWp, effectivePanelWidth, effectivePanelHeight }`.

Formula:
- If landscape: swap width/length
- `cols = floor((roofWidth + gapX) / (effectivePanelWidth + gapX))`
- `rows = floor((roofHeight + gapY) / (effectivePanelHeight + gapY))`
- `totalPanels = max(0, cols) * max(0, rows)`

Always keep this function **pure** and **exported** so it stays testable.

---

## GitHub Issues — Single Source of Truth

**All work is tracked in GitHub Issues before any code is written.**

### Active issues (read these first in every session)

```
github-mcp-server-list_issues   owner="el-j" repo="open-solar-planer" state="OPEN"
```

> **Issue #15** — "Need size controls in hud": mobile HUD with W/H/X/Y inputs for selected items; also fixes exclusion zone drag bug. Labels need updating to `type/feat,type/fix,phase/1,status/planned` once seed runs.

### Post-merge bootstrap (run once after this PR lands on main)

```bash
# 1. Trigger the seed workflow — creates labels, milestones, and all 34 sprint issues
#    GitHub → Actions → "Seed GitHub Issues" → Run workflow
#    OR locally:
GITHUB_TOKEN=<pat> node scripts/seed-github-issues.mjs

# 2. Re-label the pre-existing issue #15
gh issue edit 15 \
  --add-label "type/feat,type/fix,phase/1,status/planned,priority/high" \
  --remove-label "enhancement"

# 3. Create the develop branch
git switch main && git pull
git switch -c develop
git push -u origin develop

# 4. Create a GitHub Project for the roadmap view
#    → https://github.com/el-j/open-solar-planer/projects/new
```

### MCP Tools (use these in every agent session)

```
# List open issues
github-mcp-server-list_issues   owner="el-j" repo="open-solar-planer" state="OPEN"

# Read a specific issue (acceptance criteria, labels, milestone)
github-mcp-server-issue_read    method="get"          owner="el-j" repo="open-solar-planer" issue_number=<N>

# Read comments on an issue
github-mcp-server-issue_read    method="get_comments"  owner="el-j" repo="open-solar-planer" issue_number=<N>

# Search issues
github-mcp-server-search_issues query="<keywords> repo:el-j/open-solar-planer"

# Read a PR
github-mcp-server-pull_request_read method="get"      owner="el-j" repo="open-solar-planer" pullNumber=<N>

# Read PR diff
github-mcp-server-pull_request_read method="get_diff" owner="el-j" repo="open-solar-planer" pullNumber=<N>

# List PRs
github-mcp-server-list_pull_requests owner="el-j" repo="open-solar-planer" state="open"
```

### Creating / updating issues (when MCP write tools are unavailable)

```bash
# Create a new issue
gh issue create \
  --title "feat: <short title>" \
  --label "type/feat,phase/0,status/planned" \
  --milestone "Phase 0 – Canvas Engine (v1.1)" \
  --body "..."

# Add a comment
gh issue comment <N> --body "..."

# Close an issue
gh issue close <N>
```

### Label taxonomy

| Prefix     | Values                                                       |
|------------|--------------------------------------------------------------|
| `type/`    | `feat` `fix` `bugfix` `hotfix` `docs` `chore` `test` `ci` `refactor` `perf` |
| `phase/`   | `0` through `7`                                             |
| `status/`  | `planned` → `in-progress` → `blocked` → `done`             |
| `priority/`| `high` `medium` `low`                                       |

---

## Branch Strategy (GitFlow + GitVersion SemVer)

```
main          ← production releases   (v1.2.3)
develop       ← integration branch    (v1.2.3-beta.N)
  └─ feature/<name>   → PR to develop  (v1.2.3-feature-<name>.N)
  └─ fix/<name>       → PR to develop  (v1.2.3-fix-<name>.N)
  └─ bugfix/<name>    → PR to develop  (v1.2.3-bugfix-<name>.N)
release/<ver> → PR to main + back-merge to develop  (v1.2.3-rc.N → v1.2.3)
hotfix/<name> → PR to main + back-merge to develop  (v1.2.3-hotfix.N → v1.2.3)
```

**SemVer bump rules (driven by Conventional Commits read by GitVersion):**

| Commit prefix | Bump |
|---|---|
| `feat!:` / `BREAKING CHANGE:` | Major |
| `feat:` | Minor |
| `fix:` / `bugfix:` / `hotfix:` / `perf:` / `refactor:` | Patch |
| `docs:` / `chore:` / `test:` / `ci:` | No bump |

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

## CI/CD Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push to any branch; PR to `main`/`develop` | GitVersion → lint → test → build → deploy to Pages (main only) |
| `release.yml` | Push to `main` | GitVersion → if clean version + no tag → create annotated tag + GitHub Release |
| `seed-issues.yml` | `workflow_dispatch` (run once) | Creates labels, milestones, and 34 sprint issues |

---

## Coding Rules

- No backend, no API calls — fully static
- TypeScript strict — no `any`
- Functional components + hooks only
- All business logic in **pure exported functions**
- `data-testid` on key output elements (`total-panels`, `total-power`, `layout-grid`, `canvas`, `panel`)
- `aria-label` on all inputs and interactive elements
- Tailwind only — no custom CSS except for dynamic inline styles
- Keep bundle small — no heavy dependencies
- Tests required for all new pure functions
- Every commit must reference a GitHub Issue: `Closes #N`
