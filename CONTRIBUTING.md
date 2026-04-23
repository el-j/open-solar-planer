# Contributing to Open Solar Planer

Thank you for your interest in contributing! 🌞

This project is an open-source solar module layout planner hosted on GitHub Pages.
Every contribution — code, bug reports, feature ideas, or documentation — is welcome.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- npm ≥ 10 (comes with Node.js)
- [GitVersion](https://gitversion.net/) ≥ 5.x — **CI only** (installed automatically in GitHub Actions). Optional locally if you want to preview the computed SemVer before pushing.

### Local Setup

```bash
# Clone the repo
git clone https://github.com/el-j/open-solar-planer.git
cd open-solar-planer

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at <http://localhost:5173/open-solar-planer/>.

---

## Branch Strategy (GitFlow + SemVer)

```
main          ← production releases (v1.2.3 — clean SemVer)
develop       ← integration / next release (v1.2.3-beta.N)
  └─ feature/<name>  ← new features   (v1.2.3-feature-<name>.N)
  └─ fix/<name>      ← bug fixes       (v1.2.3-fix-<name>.N)
  └─ bugfix/<name>   ← bug fixes (alias for fix/)
release/<ver> ← release candidates    (v1.2.3-rc.N)   → merges to main + develop
hotfix/<name> ← production hotfixes   (v1.2.3-hotfix.N) → merges to main + develop
```

### Branch naming rules

| Branch type | Pattern                  | Example                        |
|-------------|--------------------------|-------------------------------|
| Feature     | `feature/<kebab-desc>`   | `feature/polygon-roof-outline` |
| Bug fix     | `fix/<kebab-desc>`       | `fix/landscape-panel-count`    |
| Bug fix     | `bugfix/<kebab-desc>`    | `bugfix/snap-to-grid-crash`    |
| Hotfix      | `hotfix/<kebab-desc>`    | `hotfix/critical-calc-error`   |
| Release     | `release/v<major.minor>` | `release/v1.2`                 |
| Chore/docs  | `chore/<kebab-desc>`     | `chore/update-deps`            |

### Base branch rules

| Your branch starts from | PR target   |
|-------------------------|-------------|
| `feature/*`             | `develop`   |
| `fix/*` / `bugfix/*`    | `develop`   |
| `release/*`             | `main` **and** back-merge to `develop` |
| `hotfix/*`              | `main` **and** back-merge to `develop` |

> **Never open a PR directly from `feature/*` or `fix/*` to `main`.**

---

## GitHub Issues — Single Source of Truth

**Every piece of work must be tracked in a GitHub Issue before code is written.**

1. Check the [issue tracker](https://github.com/el-j/open-solar-planer/issues) for an existing issue.
2. If none exists, create one using the appropriate issue template:
   - **Feature Request** — new functionality
   - **Bug Report** — something is broken
   - **Sprint Task** — sprint deliverable from the roadmap (maintainers only)
3. Assign yourself, set the correct **labels** and **milestone** before starting.
4. Reference the issue in every commit: `Closes #N` in the PR description.

### Labels

| Prefix     | Values                                                        |
|------------|---------------------------------------------------------------|
| `type/`    | `feat` `fix` `bugfix` `hotfix` `docs` `chore` `test` `ci` `refactor` `perf` |
| `phase/`   | `0` through `7`                                              |
| `status/`  | `planned` → `in-progress` → `blocked` → `done`              |
| `priority/`| `high` `medium` `low`                                        |

---

## Commits — Conventional Commits (REQUIRED)

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) spec.
This drives **GitVersion** to compute the correct SemVer automatically.

```
<type>(<optional scope>): <short summary>

<optional body>

Closes #<issue-number>
```

**Version bump rules (GitVersion reads these):**

| Commit type               | SemVer bump  |
|---------------------------|-------------|
| `feat!:` / `BREAKING CHANGE:` | **Major** (`1.0.0` → `2.0.0`) |
| `feat:`                   | **Minor** (`1.0.0` → `1.1.0`) |
| `fix:` / `bugfix:` / `hotfix:` / `perf:` / `refactor:` | **Patch** (`1.0.0` → `1.0.1`) |
| `docs:` / `chore:` / `test:` / `ci:` / `style:` | **No bump** |

---

## Scripts

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build locally
npm run lint          # Run ESLint
npm test              # Run tests once (Vitest)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Test coverage report
```

---

## Pull Request Process

1. **Open a GitHub Issue first** for any non-trivial change.
2. Create your branch from the correct base (`develop` for features/fixes, `main` for hotfixes).
3. Make changes — keep commits atomic and conventional.
4. Ensure `npm run lint`, `npm test`, and `npm run build` all pass locally.
5. Open a PR to the correct **target branch** (see branch rules above).
6. Fill in the PR template, including `Closes #N` and the source/target branch types.
7. CI will run automatically (lint + test + build + GitVersion); all checks must pass.
8. A maintainer will review and merge your PR.

---

## Release Process (Automated via GitVersion)

1. Feature/fix PRs merge to `develop` — version becomes e.g. `1.2.0-beta.5`
2. When ready to release: create `release/v1.2` from `develop`
3. Merge `release/v1.2` → `main` (and back-merge to `develop`)
4. The `release.yml` CI workflow auto-detects the clean version, creates the tag `v1.2.0`, and publishes a GitHub Release with auto-generated release notes
5. The `ci.yml` deploy job simultaneously deploys the new version to GitHub Pages

> **No manual tagging or Release Please needed** — GitVersion + the release workflow handle everything.

---

## Project Structure

```
open-solar-planer/
├── src/
│   ├── App.tsx          # Main application component + exported pure functions
│   ├── main.tsx         # Entry point
│   ├── index.css        # Global styles (Tailwind import)
│   └── test/
│       ├── setup.ts     # Test setup
│       ├── layout.test.ts   # Unit tests for calculateLayout()
│       └── App.test.tsx     # Component integration tests
├── scripts/
│   └── seed-github-issues.mjs  # Bootstrap labels/milestones/issues (run once)
├── docs/                # Technical design documents
├── public/              # Static assets
├── GitVersion.yml       # SemVer strategy configuration
└── .github/
    ├── workflows/
    │   ├── ci.yml           # Lint + test + build + Pages deploy (all branches)
    │   ├── release.yml      # GitVersion auto-tag + GitHub Release (main only)
    │   └── seed-issues.yml  # workflow_dispatch to seed GitHub Issues
    ├── ISSUE_TEMPLATE/  # Issue forms
    └── PULL_REQUEST_TEMPLATE.md
```

---

## Code Style

- TypeScript strict mode — no `any`
- ESLint with recommended React rules
- Tailwind CSS for styling — avoid custom CSS unless absolutely necessary
- Functional React components with hooks only
- All business logic in **pure exported functions** (so they can be unit-tested)
- `data-testid` on key output elements; `aria-label` on all inputs

---

## Questions?

Open a [Discussion](https://github.com/el-j/open-solar-planer/discussions) or ask in an issue. We're happy to help!
