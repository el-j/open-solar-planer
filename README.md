# ☀️ Open Solar Planer

[![CI](https://github.com/el-j/open-solar-planer/actions/workflows/ci.yml/badge.svg)](https://github.com/el-j/open-solar-planer/actions/workflows/ci.yml)
[![Deploy](https://github.com/el-j/open-solar-planer/actions/workflows/deploy.yml/badge.svg)](https://github.com/el-j/open-solar-planer/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

> **A free, open-source solar module layout planner** — plan your PV installation directly in the browser. No sign-up, no server, fully static.

🚀 **Live app:** [el-j.github.io/open-solar-planer](https://el-j.github.io/open-solar-planer/)

---

## Features

- 🔲 **Visual grid layout** — see exactly how many panels fit on your roof
- 📐 **Custom roof dimensions** — enter width & height in centimetres
- 🖼️ **Background image** — upload a top-down photo of your roof
- 📦 **Panel presets** — Standard (400 W), XL (500 W), Balkonkraftwerk (300 W), or custom
- 🔄 **Portrait / Landscape** — toggle panel orientation with one click
- ↔️ **Mounting gaps** — configure X and Y spacing for clamps and thermal expansion
- ⚡ **Live totals** — panel count, total power (kWp), and grid arrangement update instantly
- 📱 **Responsive** — works on desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| Hosting | [GitHub Pages](https://pages.github.com/) |
| Releases | [Release Please](https://github.com/googleapis/release-please) |

---

## Getting Started (Local Development)

```bash
git clone https://github.com/el-j/open-solar-planer.git
cd open-solar-planer
npm install
npm run dev
```

Open <http://localhost:5173/open-solar-planer/>.

Available scripts:

```bash
npm run dev          # Development server with HMR
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint
npm test             # Run tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run test:coverage # Coverage report
```

---

## Contributing

We welcome contributions of all kinds! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

Quick summary:
1. Open an issue to discuss your change
2. Fork → branch → commit (using [Conventional Commits](https://www.conventionalcommits.org/))
3. Open a PR against `main` — CI must pass

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community standards.

---

## Release Process

Releases are **fully automated** via [Release Please](https://github.com/googleapis/release-please):

1. Merge commits following Conventional Commits land on `main`
2. Release Please opens a **Release PR** with updated `CHANGELOG.md` and bumped version in `package.json`
3. Merge the Release PR → a GitHub Release + tag is created automatically
4. The deploy workflow publishes the new version to GitHub Pages

**Version bumping rules:**
- `fix:` → patch (`1.0.0` → `1.0.1`)
- `feat:` → minor (`1.0.0` → `1.1.0`)
- `feat!:` / `BREAKING CHANGE:` → major (`1.0.0` → `2.0.0`)

---

## GitHub Setup Notes

To enable all automation, ensure the following are configured in your repository settings:

1. **GitHub Pages** → Settings → Pages → Source: **GitHub Actions**
2. **Actions permissions** → Settings → Actions → General → Workflow permissions: **Read and write permissions** + allow PRs
3. **Branch protection** (recommended) → Require PR reviews + status checks for `main`

For GitHub Projects integration, create a project board and link it to this repository for tracking issues and releases in a kanban view.

---

## License

[MIT](./LICENSE) © 2025 el-j and contributors
