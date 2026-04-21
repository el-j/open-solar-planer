# Contributing to Open Solar Planer

Thank you for your interest in contributing! 🌞

This project is an open-source solar module layout planner hosted on GitHub Pages. Every contribution — code, bug reports, feature ideas, or documentation — is welcome.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- npm ≥ 10 (comes with Node.js)

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

## Development Workflow

### Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/polygon-roof` |
| Bug fix | `fix/<short-description>` | `fix/landscape-calc` |
| Docs | `docs/<short-description>` | `docs/contributing` |
| Chore | `chore/<short-description>` | `chore/update-deps` |

### Commits — Conventional Commits

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This powers automated changelog generation and semantic versioning via [Release Please](https://github.com/googleapis/release-please).

```
<type>(<optional scope>): <short summary>

<optional body>

<optional footer: Closes #42>
```

**Allowed types:**

| Type | When to use |
|------|-------------|
| `feat` | A new user-visible feature |
| `fix` | A bug fix |
| `perf` | A performance improvement |
| `refactor` | Code change with no feature/fix impact |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Tooling, deps, config changes |
| `ci` | CI pipeline changes |

Examples:

```
feat: add polygon roof drawing tool
fix: correct landscape panel count calculation
docs: add screenshot to README
chore: update tailwindcss to v4.2
```

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
npm test             # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Test coverage report
```

---

## Pull Request Process

1. **Open an issue first** for non-trivial changes so the approach can be agreed on.
2. Fork the repo and create a branch following the naming convention above.
3. Make your changes, keeping commits atomic and conventional.
4. Ensure `npm run lint`, `npm test`, and `npm run build` all pass locally.
5. Open a PR against `main` using the provided PR template.
6. CI will run automatically; all checks must pass before merging.
7. A maintainer will review and merge your PR.

---

## Project Structure

```
open-solar-planer/
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Entry point
│   ├── index.css        # Global styles (Tailwind import)
│   └── test/
│       ├── setup.ts     # Test setup
│       ├── layout.test.ts   # Unit tests for layout calculation
│       └── App.test.tsx     # Component integration tests
├── public/              # Static assets
├── .github/
│   ├── workflows/       # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/  # Issue forms
│   └── PULL_REQUEST_TEMPLATE.md
├── release-please-config.json  # Release automation config
└── .release-please-manifest.json
```

---

## Versioning & Releases

This project uses **[Release Please](https://github.com/googleapis/release-please)** for automated semantic versioning:

- `fix:` commits → patch release (e.g. `1.0.0` → `1.0.1`)
- `feat:` commits → minor release (e.g. `1.0.0` → `1.1.0`)
- `feat!:` or `BREAKING CHANGE:` footer → major release (e.g. `1.0.0` → `2.0.0`)

When commits land on `main`, Release Please automatically opens a **release PR** with an updated `CHANGELOG.md` and bumped version. Merging that PR creates a GitHub Release and tag.

---

## Code Style

- TypeScript strict mode
- ESLint with recommended React rules
- Tailwind CSS for styling — avoid custom CSS unless necessary
- Functional React components with hooks

---

## Questions?

Open a [Discussion](https://github.com/el-j/open-solar-planer/discussions) or ask in an issue. We're happy to help!
