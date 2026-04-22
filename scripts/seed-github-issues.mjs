#!/usr/bin/env node
/**
 * seed-github-issues.mjs
 *
 * Bootstraps the GitHub issue tracker for Open Solar Planer by creating:
 *   • Labels  (type/*, phase/*, status/*, priority/*)
 *   • Milestones  (one per phase)
 *   • Issues  (one per sprint — 34 total — with deliverables as checkboxes)
 *
 * Usage (requires GITHUB_TOKEN env var with `issues: write` scope):
 *   GITHUB_TOKEN=ghp_xxx node scripts/seed-github-issues.mjs
 *
 * Or via GitHub Actions (workflow_dispatch in .github/workflows/seed-issues.yml).
 *
 * Idempotent — already-existing labels / milestones / issues are skipped.
 */

// ─── Config ──────────────────────────────────────────────────────────────────
const OWNER = 'el-j';
const REPO  = 'open-solar-planer';
const TOKEN = process.env.GITHUB_TOKEN;

/** GitHub's rate limit for issue creation is ~80 creates/minute. */
const RATE_LIMIT_DELAY_MS = 800;

if (!TOKEN) {
  console.error('ERROR: GITHUB_TOKEN env var is required.');
  process.exit(1);
}

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept:        'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

// ─── GitHub REST helpers ─────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 422) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

const get  = (path)        => api('GET',   path);
const post = (path, body)  => api('POST',  path, body);

// ─── Labels ──────────────────────────────────────────────────────────────────
const LABELS = [
  // type
  { name: 'type/feat',    color: '0075ca', description: 'New feature'          },
  { name: 'type/fix',     color: 'e11d48', description: 'Bug fix'              },
  { name: 'type/bugfix',  color: 'e11d48', description: 'Bug fix (alias)'      },
  { name: 'type/hotfix',  color: 'dc2626', description: 'Production hotfix'    },
  { name: 'type/docs',    color: '0284c7', description: 'Documentation'        },
  { name: 'type/chore',   color: 'e4e669', description: 'Tooling / deps'       },
  { name: 'type/test',    color: 'bfd4f2', description: 'Tests'               },
  { name: 'type/ci',      color: 'f97316', description: 'CI/CD'               },
  { name: 'type/refactor',color: 'a78bfa', description: 'Refactoring'         },
  { name: 'type/perf',    color: '10b981', description: 'Performance'          },
  // phase — each phase has a distinct colour for easy visual scanning
  { name: 'phase/0',      color: '1d4ed8', description: 'Phase 0 – Canvas Engine'        }, // blue
  { name: 'phase/1',      color: '0891b2', description: 'Phase 1 – Polish & Panel Lib'   }, // cyan
  { name: 'phase/2',      color: '059669', description: 'Phase 2 – Multi-Area Projects'  }, // emerald
  { name: 'phase/3',      color: '16a34a', description: 'Phase 3 – Cost Planning & BOM'  }, // green
  { name: 'phase/4',      color: 'd97706', description: 'Phase 4 – Pitched Roofs / 3D'  }, // amber
  { name: 'phase/5',      color: 'ea580c', description: 'Phase 5 – Photo-to-Plan'        }, // orange
  { name: 'phase/6',      color: 'dc2626', description: 'Phase 6 – Full 3D Editor'       }, // red
  { name: 'phase/7',      color: '7c3aed', description: 'Phase 7 – Off-Grid & Hybrid'    }, // violet
  // status
  { name: 'status/planned',     color: 'fbbf24', description: 'Planned, not started' },
  { name: 'status/in-progress', color: '0e8a16', description: 'Work in progress'     },
  { name: 'status/blocked',     color: 'ef4444', description: 'Blocked'              },
  { name: 'status/done',        color: 'cfd3d7', description: 'Completed'            },
  // priority
  { name: 'priority/high',   color: 'ef4444', description: 'High priority'   },
  { name: 'priority/medium', color: 'f97316', description: 'Medium priority' },
  { name: 'priority/low',    color: '6b7280', description: 'Low priority'    },
  // misc
  { name: 'sprint',     color: 'fbca04', description: 'Sprint deliverable'   },
  { name: 'epic',       color: '8b5cf6', description: 'Epic / large feature' },
  { name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
  { name: 'help wanted',      color: '008672', description: 'Extra attention needed' },
];

// ─── Milestones ──────────────────────────────────────────────────────────────
const MILESTONES = [
  { title: 'Phase 0 – Canvas Engine (v1.1)',         description: 'Multi-area 2D/3D SVG canvas engine — the foundation for everything.' },
  { title: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)', description: 'UX polish, expanded panel presets, session persistence, share-by-URL.' },
  { title: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',    description: 'Multi-surface projects, area manager UI, string & MPPT planning.' },
  { title: 'Phase 3 – Cost Planning & BOM (v2.3–v2.5)',    description: 'Component database, BOM generator, cost dashboard, what-if scenarios.' },
  { title: 'Phase 4 – Pitched Roofs & Pseudo-3D (v3.0–v3.2)', description: 'Pitched roof geometry, irradiance engine, isometric view, shading.' },
  { title: 'Phase 5 – Photo-to-Plan (v3.3–v3.5)',   description: 'Perspective correction, photogrammetry (WASM), AR measurement.' },
  { title: 'Phase 6 – Full 3D Editor (v4.0–v4.2)',  description: 'Three.js scene, panel placement in 3D, glTF export/DXF import.' },
  { title: 'Phase 7 – Off-Grid & Hybrid (v4.3–v5.0)', description: 'Battery sizing, energy yield simulation, grid-tie, system diagram, v5.0 polish.' },
];

// ─── Sprint Issues ────────────────────────────────────────────────────────────
// Each entry maps to one GitHub issue.
// `milestone` is the TITLE string from the MILESTONES array above.
const SPRINT_ISSUES = [
  // ── Phase 0 — Foundation (Pre-canvas) ──────────────────────────────────────
  {
    title: '[Sprint 1] Developer Experience & CI Hardening',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/chore', 'status/planned'],
    body: `## Goal
Every contributor can clone, run, test, and ship in < 5 minutes.

## Deliverables
- [ ] Expand \`calculateLayout()\` edge-case tests (0-width, 0-height, float inputs, negative gaps)
- [ ] Add \`test:coverage\` script output badge to README
- [ ] Set Vitest coverage threshold (80 % statements/branches)
- [ ] Document dev setup in CONTRIBUTING.md (verify and update if stale)
- [ ] Verify \`npm run lint\`, \`npm test\`, \`npm run build\` all green on \`main\`

## Definition of Done
Coverage badge visible in README; CI passes on fresh clone in under 3 min.`,
  },
  {
    title: '[Sprint 2] Physics Module Scaffold',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned'],
    body: `## Goal
Create the \`src/physics/\` directory with constants and wiring modules, fully tested.

## Deliverables
- [ ] \`src/physics/constants.ts\` — all physical constants (IEC/NEC reference values)
- [ ] \`src/physics/wiring.ts\` — \`calculateCableCSA()\`, \`voltageDropPercent()\`
- [ ] \`src/test/physics/wiring.test.ts\` — unit tests against IEC 60364-5-52 reference values
- [ ] \`src/physics/index.ts\` — re-exports public API
- [ ] ESLint rule: no \`any\` in \`src/physics/\`

## Definition of Done
\`npm test\` green with new tests; wiring functions exported and documented.`,
  },

  // ── Phase 0.5 — Canvas Engine ──────────────────────────────────────────────
  {
    title: '[Sprint 0.5.0] Project & Area Data Model',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned', 'priority/high'],
    body: `## Goal
Replace scattered \`useState\` in \`App.tsx\` with a typed \`projectReducer\`.

## Deliverables
- [ ] TypeScript interfaces: \`Project\`, \`Area\`, \`AreaOutline\` (rect + polygon), \`FreePanel\` (with rotation), \`ExclusionZone\`, \`StringGroup\`
- [ ] \`projectReducer.ts\` — all mutations handled as typed actions
- [ ] Undo/redo stack built into the reducer (max 100 entries, structural sharing)
- [ ] \`useProject\` context hook replaces all \`useState\` in \`App.tsx\`
- [ ] All existing tests updated to pass with new data model

## Definition of Done
All existing tests pass; new data model types exported and tested; no \`useState\` left in \`App.tsx\` for project state.`,
  },
  {
    title: '[Sprint 0.5.1] SVG Canvas Renderer',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned', 'priority/high'],
    body: `## Goal
Replace \`<div>\` renderer with an \`<svg viewBox>\` canvas supporting zoom and pan.

## Deliverables
- [ ] \`<svg viewBox>\` as rendering root — zoom/pan changes viewBox only (zero React re-renders)
- [ ] \`AreaCanvas.tsx\` layers: outline → exclusion zones → grid panels → free panels → string overlay → selection handles
- [ ] Grid mode: SVG \`<rect>\` per panel, polygon outline support
- [ ] Free mode: SVG \`<rect>\` per panel with rotation transform; rotation handle
- [ ] Snap-to-grid: configurable grid size, dashed blue guide lines on snap
- [ ] Zoom (wheel + pinch): zoom towards cursor; range 0.1×–5×
- [ ] Pan (Space+drag, middle-mouse, two-finger drag)
- [ ] Full keyboard shortcut set (see \`docs/CANVAS-ENGINE.md\` §11.1)

## Definition of Done
Canvas renders all panels as SVG; zoom/pan works; snap-to-grid functional; all existing tests pass.`,
  },
  {
    title: '[Sprint 0.5.2] Area Manager UI',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned'],
    body: `## Goal
Users can create, manage, and switch between multiple roof areas.

## Deliverables
- [ ] Sidebar area list: add / rename / delete / duplicate / reorder (drag handles)
- [ ] Colour-coded area badges; per-area kWp shown in list
- [ ] Area settings panel: surface type, outline, tilt °, azimuth °, panel preset, gap, grid offset, layout mode toggle, background image, lock/hide
- [ ] Overview mode: all areas on a single infinite canvas
- [ ] Project totals always visible in header

## Definition of Done
Multiple areas can be created, named, switched between, and reordered; project totals update correctly.`,
  },
  {
    title: '[Sprint 0.5.3] Free Placement Mode Upgrade',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned'],
    body: `## Goal
Full free-placement tool palette with multi-select, copy/paste, and per-panel rotation.

## Deliverables
- [ ] Tool palette: Select | Place Panel | Draw Zone | Label | Erase
- [ ] Multi-select: Shift+Click, rubber-band box-drag, Ctrl+A
- [ ] Drag selected group as a unit; snap enabled for all panels simultaneously
- [ ] Copy / paste (Ctrl+C / Ctrl+V) — cross-area paste supported
- [ ] Per-panel rotation: drag handle; Shift = snap to 45°; \`R\` = rotate 90°
- [ ] Click-to-exclude individual grid cells (grid mode shortcut)
- [ ] Auto-fill from point (right-click shortcut in free mode)

## Definition of Done
Multi-select, copy/paste, and rotation all work; keyboard shortcuts functional; tests added for all new logic.`,
  },
  {
    title: '[Sprint 0.5.4] Polygon Area Outline Tool',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned'],
    body: `## Goal
Users can draw a custom polygon roof outline; grid recalculates to stay within the polygon.

## Deliverables
- [ ] Click to place vertices; double-click or click first vertex to close polygon
- [ ] Draggable vertex handles for post-draw adjustment
- [ ] Point-in-polygon test used in grid layout engine
- [ ] Pre-built polygon templates: L-shape, T-shape, trapezoid, triangle, custom
- [ ] Grid recalculates instantly as vertices are dragged

## Definition of Done
Polygon outline tool works for all template shapes; grid layout respects polygon boundary; tests added for point-in-polygon logic.`,
  },
  {
    title: '[Sprint 0.5.5] SVG Isometric View',
    milestone: 'Phase 0 – Canvas Engine (v1.1)',
    labels: ['sprint', 'phase/0', 'type/feat', 'status/planned', 'priority/high'],
    body: `## Goal
Definitive "fake 3D" isometric SVG view — no Three.js, no WebGL, pure SVG matrix math.

## Deliverables
- [ ] Building Wizard: enter footprint W × D × H + roof type → procedural face geometry
- [ ] Each Area assigned to a building face; tilt/azimuth auto-sync from face descriptor
- [ ] Panel layout rendered as SVG \`<polygon>\` via isometric transform (\`toIso()\`, \`rectToIsoPolygon()\`)
- [ ] Four viewpoint presets: NE, NW, SE, SW with 200 ms CSS transition
- [ ] Toggle \`2D Plan ↔ Isometric\` with single button (\`I\` key)
- [ ] Click panel in isometric view → jumps to 2D mode with panel selected
- [ ] Sun direction arrow from \`solarPosition(lat, lon, dateTime)\`
- [ ] Shadow polygons per obstacle — semi-transparent SVG overlay; shaded panels tinted amber
- [ ] Export isometric view as clean annotated SVG
- [ ] \`aria-description\` summary on \`<svg>\`; panel click/keyboard accessible

## Definition of Done
Isometric view passes 12-checkbox quality bar in \`docs/CANVAS-ENGINE.md\` §9.9; live in production ≥ 3 months before any alternative 3D strategy is evaluated.`,
  },

  // ── Phase 1 — Polish & Panel Library ──────────────────────────────────────
  {
    title: '[Sprint 3] Undo/Redo Stack',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
Ctrl+Z / Ctrl+Y works for all canvas placement and deletion actions.

## Deliverables
- [ ] Generic \`useUndoRedo<T>\` hook in \`src/hooks/useUndoRedo.ts\`
- [ ] Wire into panel placement, panel deletion, exclusion zone draw/delete
- [ ] Keyboard shortcut: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo)
- [ ] Toolbar undo/redo buttons with \`aria-label\` and \`data-testid\`
- [ ] Tests: stack depth, redo after new action clears redo stack

## Definition of Done
All canvas mutations undoable; tests pass; mobile undo buttons visible on touch.`,
  },
  {
    title: '[Sprint 4] Keyboard Shortcuts & Accessibility',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
WCAG 2.1 AA baseline; keyboard users can complete a full layout without a mouse.

## Deliverables
- [ ] \`?\` key opens keyboard shortcut help overlay modal
- [ ] All modal/overlay components trap focus and close on Escape
- [ ] All canvas toolbar buttons reachable by Tab
- [ ] \`role="region"\` and \`aria-label\` on major layout sections
- [ ] Audit with \`axe-core\` (dev dependency, run in tests)
- [ ] Fix any axe errors found

## Definition of Done
Zero axe-core errors on the main page; keyboard navigation demo recorded in PR.`,
  },
  {
    title: '[Sprint 5] Colour Themes & i18n Scaffold',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
Light/dark/high-contrast themes; i18n infrastructure in place (EN + DE strings).

## Deliverables
- [ ] Theme switcher in settings: light / dark / high-contrast
- [ ] Theme persisted to \`localStorage\`; applied via CSS class on \`<html>\`
- [ ] Tailwind CSS v4 theme tokens for each theme variant
- [ ] \`src/i18n/en.ts\` and \`src/i18n/de.ts\` with all UI strings
- [ ] \`useTranslation()\` hook wires strings into all components
- [ ] Language picker in settings; persisted to \`localStorage\`

## Definition of Done
App fully translatable; DE translation covers all strings; themes switch without page reload.`,
  },
  {
    title: '[Sprint 6] Panel Preset Library Expansion',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
30+ real-world module presets in \`src/assets/panels.json\`.

## Deliverables
- [ ] \`PanelPreset\` TypeScript interface (id, brand, model, dimensions, power, Voc, Isc, Vmpp, Impp, betaVoc, alphaIsc, NOCT, datasheet_url, price_eur, year)
- [ ] Populate \`panels.json\` with ≥ 30 modules (Longi, Jinko, REC, SunPower, Q CELLS, Trina, Canadian Solar, Risen, Meyer Burger, Silfab)
- [ ] UI: searchable/filterable preset picker (by brand, power range)
- [ ] Show datasheet link and efficiency badge in picker
- [ ] User-defined custom preset saved to \`localStorage\`

## Definition of Done
All 30+ presets load and display correctly; custom preset survives page reload.`,
  },
  {
    title: '[Sprint 7] Session Persistence & JSON Export/Import',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
Projects survive browser refresh; JSON round-trip export/import works.

## Deliverables
- [ ] \`src/hooks/useProjectPersistence.ts\` — debounced auto-save to \`localStorage\`
- [ ] "Export project" button → downloads \`project-<date>.json\`
- [ ] "Import project" button → file input, validates schema, loads state
- [ ] \`ProjectSchema\` validation (Zod or hand-rolled, no heavy dep)
- [ ] Restore notification: "Project auto-saved at HH:MM"
- [ ] Tests: export → mutate → import → verify state restored

## Definition of Done
Complete project survives refresh and round-trip JSON export/import.`,
  },
  {
    title: '[Sprint 8] Share-by-URL & PNG/SVG Export',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
Share a complete project via URL; export canvas as high-resolution PNG or SVG.

## Deliverables
- [ ] Encode project state as Base64-compressed JSON in URL hash (\`#v1:…\`)
- [ ] On load: detect and parse URL hash → restore project
- [ ] "Share link" button copies URL to clipboard; shows toast notification
- [ ] "Export PNG" button renders canvas at 2×/3× resolution
- [ ] "Export SVG" button for vector-quality output
- [ ] Verify URL ≤ 2 KB for typical project (10 panels, 1 exclusion zone)

## Definition of Done
Share link works in a fresh browser tab; PNG and SVG export render all elements correctly.`,
  },
  {
    title: '[Sprint 9] Touch Gestures & Mobile UX',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
Pinch-to-zoom and two-finger pan work on iOS/Android; snap-to-grid option added.

## Deliverables
- [ ] \`src/hooks/useCanvasGestures.ts\` — handles touch events for pan and pinch-zoom
- [ ] Minimum touch target: 44 × 44 px (WCAG 2.5.5)
- [ ] Snap-to-grid toggle in toolbar (grid size = panel + gap)
- [ ] Panel rotation in free-placement mode (long-press → rotation handle)
- [ ] Haptic feedback on panel placement (\`Navigator.vibrate\`, 10 ms)
- [ ] Test on Chrome DevTools device simulation for iPhone 14 and Galaxy S22

## Definition of Done
Pinch-zoom and pan work on mobile; snap-to-grid functional; all touch targets ≥ 44 px.`,
  },
  {
    title: '[Sprint 10] QR Code & URL Panel Import',
    milestone: 'Phase 1 – Polish & Panel Library (v1.2–v1.4)',
    labels: ['sprint', 'phase/1', 'type/feat', 'status/planned'],
    body: `## Goal
Scan a manufacturer QR code to auto-fill a panel preset.

## Deliverables
- [ ] Integrate \`jsQR\` (lightweight pure JS) for QR scanning via device camera
- [ ] "Scan QR" button opens camera overlay; decoded URL auto-fills preset fields
- [ ] "Paste URL" field: attempt to parse width/length/power from page meta tags
- [ ] Manual JSON import/export of entire panel library snapshot
- [ ] Deep-link: \`?panel=longi-hi-mo-x6-580\` pre-selects a preset on load

## Definition of Done
QR scan correctly fills at least 3 test panel QR codes; URL deep-link works.`,
  },

  // ── Phase 2 — Multi-Area Projects ─────────────────────────────────────────
  {
    title: '[Sprint 11] Project & Area Data Model',
    milestone: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',
    labels: ['sprint', 'phase/2', 'type/feat', 'status/planned'],
    body: `## Goal
Introduce \`Project → Area[] → Layout\` hierarchy in state.

## Deliverables
- [ ] TypeScript interfaces: \`Project\`, \`Area\`, \`AreaType\`, \`StringGroup\`
- [ ] Migrate existing single-area state to \`areas[0]\` of a Project
- [ ] Project-level totals: combined panel count, combined kWp
- [ ] All existing tests still pass after refactor
- [ ] No UI changes visible in this sprint (internal refactor only)

## Definition of Done
Existing functionality unchanged; new data model types exported and tested.`,
  },
  {
    title: '[Sprint 12] Area Manager UI',
    milestone: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',
    labels: ['sprint', 'phase/2', 'type/feat', 'status/planned'],
    body: `## Goal
Users can add, rename, delete, and switch between multiple roof areas.

## Deliverables
- [ ] Sidebar area list: add / rename / delete / duplicate controls
- [ ] Tab or pill switcher to select active area canvas
- [ ] Colour-coded area badge displayed on canvas header
- [ ] Drag-and-drop reorder in area list (\`@dnd-kit/core\`, lightweight)
- [ ] Mini-map panel: all areas shown as labelled thumbnails with kWp

## Definition of Done
Multiple areas can be created, switched between, and reordered; project totals update correctly.`,
  },
  {
    title: '[Sprint 13] String Sizing Tool',
    milestone: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',
    labels: ['sprint', 'phase/2', 'type/feat', 'status/planned'],
    body: `## Goal
In-app string sizing calculator using physics from \`docs/ELECTRICAL-PHYSICS.md\` §II.4.

## Deliverables
- [ ] \`src/physics/stringDesign.ts\` — \`calculateStringSizing()\`, \`buildStringSummary()\`
- [ ] \`src/test/physics/stringDesign.test.ts\`
- [ ] UI: "String Design" panel in sidebar; user enters inverter Vmppt_min/max/abs, Tmin, Tmax
- [ ] Output: recommended string length, Nmin, Nmax, Voc_cold, Vmp_hot, warnings
- [ ] Visual string highlight: click panels → assign to string → colour-coded on canvas

## Definition of Done
String sizing results match SMA Sunny Design for 3 test cases; warnings displayed for out-of-range configs.`,
  },
  {
    title: '[Sprint 14] MPPT Assignment & Array Summary',
    milestone: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',
    labels: ['sprint', 'phase/2', 'type/feat', 'status/planned'],
    body: `## Goal
Assign string groups to MPPT inputs; display array power summary.

## Deliverables
- [ ] \`InverterSpec\` JSON schema; \`inverters.json\` seeded with 10 inverters (SMA, Fronius, Huawei, Solis, Goodwe, Enphase, SolarEdge, Victron, Growatt, Deye)
- [ ] MPPT assignment UI: drag string group → MPPT input slot
- [ ] MPPT balance checker: flags if strings on same MPPT differ by > 5 % Vmp
- [ ] Array summary table: total Wp, Voc, Vmp, Isc, Imp per MPPT input
- [ ] Export array summary as CSV

## Definition of Done
MPPT assignment works for multi-MPPT inverters; imbalance warnings displayed.`,
  },
  {
    title: '[Sprint 15] Wiring Length Estimator',
    milestone: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',
    labels: ['sprint', 'phase/2', 'type/feat', 'status/planned'],
    body: `## Goal
Estimate DC string cable lengths from panel positions; flag voltage drop.

## Deliverables
- [ ] Canvas mode: "Show wiring" overlays cable routes panels → combiner → inverter
- [ ] Inverter position: draggable marker on canvas
- [ ] Cable route: Manhattan routing (horizontal + vertical segments)
- [ ] \`calculateCableCSA()\` called per string; result shown in BOM preview
- [ ] Voltage drop warning if > 1 % on any DC string

## Definition of Done
Cable lengths estimated within 10 % of actual for a representative roof layout.`,
  },
  {
    title: '[Sprint 16] Single-Line Diagram Generator (SVG)',
    milestone: 'Phase 2 – Multi-Area Projects (v2.0–v2.2)',
    labels: ['sprint', 'phase/2', 'type/feat', 'status/planned'],
    body: `## Goal
Auto-generate a single-line electrical diagram as downloadable SVG.

## Deliverables
- [ ] \`src/diagram/singleLine.ts\` — pure function \`generateSingleLineSVG(project): string\`
- [ ] Diagram: panels → string combiner → inverter → AC distribution → grid
- [ ] Wire gauges and fuse ratings shown on diagram
- [ ] SVG downloadable; renderable inline in app
- [ ] PDF export via \`jsPDF\` (lazy-loaded optional chunk)

## Definition of Done
Generated SVG opens correctly in Inkscape and browsers; fuse/cable labels correct for test project.`,
  },

  // ── Phase 3 — Cost Planning & BOM ─────────────────────────────────────────
  {
    title: '[Sprint 17] Component Database',
    milestone: 'Phase 3 – Cost Planning & BOM (v2.3–v2.5)',
    labels: ['sprint', 'phase/3', 'type/feat', 'status/planned'],
    body: `## Goal
\`panels.json\`, \`inverters.json\`, \`mounting.json\`, \`cables.json\` fully populated with prices.

## Deliverables
- [ ] Add \`price_eur\`, \`price_usd\`, \`price_date\` to \`PanelPreset\`
- [ ] \`mounting.json\`: rail, end-clamp, mid-clamp, roof hook, tilt frame — per-unit prices
- [ ] \`cables.json\`: 4 mm² DC, 6 mm² DC, AC cable, MC4 connectors — per-metre/per-piece
- [ ] User override: any price editable locally (stored in \`localStorage\`)
- [ ] Community contribution guide for price updates (CONTRIBUTING.md)

## Definition of Done
All JSON files load without errors; prices display in UI; user overrides persist.`,
  },
  {
    title: '[Sprint 18] BOM Generator',
    milestone: 'Phase 3 – Cost Planning & BOM (v2.3–v2.5)',
    labels: ['sprint', 'phase/3', 'type/feat', 'status/planned'],
    body: `## Goal
Auto-generate complete Bill of Materials from project layout.

## Deliverables
- [ ] \`src/bom/calculateBOM.ts\` — pure function \`calculateBOM(project, componentDB): BOMLine[]\`
- [ ] BOM lines: panels, inverter suggestion, mounting hardware, cables, connectors, fuses
- [ ] BOM table in UI: quantity, unit price, total — editable quantity
- [ ] Add custom line items (labour, permits, misc.)
- [ ] Export as CSV and JSON

## Definition of Done
BOM generated for test project matches manually computed BOM within ±5 %.`,
  },
  {
    title: '[Sprint 19] Cost Dashboard & Payback Calculator',
    milestone: 'Phase 3 – Cost Planning & BOM (v2.3–v2.5)',
    labels: ['sprint', 'phase/3', 'type/feat', 'status/planned'],
    body: `## Goal
Total cost, payback period, and break-even chart visible in app.

## Deliverables
- [ ] Cost summary: total material + estimated labour (configurable hourly rate), total
- [ ] Cost per kWp; cost per kWh (25-year yield estimate)
- [ ] Payback calculator inputs: electricity tariff, feed-in tariff, annual consumption
- [ ] Break-even chart: canvas-drawn line chart (no charting library)
- [ ] Tax / VAT selector: country dropdown, rates from \`vat.json\`

## Definition of Done
Payback period matches manual calculation for test inputs; chart renders correctly on mobile.`,
  },
  {
    title: '[Sprint 20] What-If Scenarios & PDF Export',
    milestone: 'Phase 3 – Cost Planning & BOM (v2.3–v2.5)',
    labels: ['sprint', 'phase/3', 'type/feat', 'status/planned'],
    body: `## Goal
Compare up to 3 configurations side-by-side; export full project report as PDF.

## Deliverables
- [ ] Scenario save/load: name and store up to 3 project variants in \`localStorage\`
- [ ] Side-by-side comparison table: kWp, panel count, cost, payback, annual yield
- [ ] "Export report" button: generates multi-page PDF (layout canvas, BOM, cost summary, single-line diagram)
- [ ] PDF uses \`jsPDF\` (already added in Sprint 16); lazy-loaded chunk

## Definition of Done
Three scenarios compare correctly; PDF opens in Adobe Reader and browser PDF viewer.`,
  },

  // ── Phase 4 — Pitched Roofs & Pseudo-3D ───────────────────────────────────
  {
    title: '[Sprint 21] Pitched Roof Geometry',
    milestone: 'Phase 4 – Pitched Roofs & Pseudo-3D (v3.0–v3.2)',
    labels: ['sprint', 'phase/4', 'type/feat', 'status/planned'],
    body: `## Goal
Each area has tilt and azimuth; calculations account for tilted surface.

## Deliverables
- [ ] \`Area\` model: add \`tilt_deg\`, \`azimuth_deg\`, \`ridge_position\`, \`eave_overhang_m\`
- [ ] Panel count recalculated accounting for \`1/cos(tilt)\` effective horizontal footprint
- [ ] Irradiance transposition: POA calculation from \`src/physics/irradiance.ts\`
- [ ] Azimuth/tilt input UI in Area settings panel
- [ ] Visual indicator: area colour-coded by azimuth (south = best = green)

## Definition of Done
Area at 30° tilt south-facing shows correct yield premium vs flat roof for test location.`,
  },
  {
    title: '[Sprint 22] Irradiance Engine',
    milestone: 'Phase 4 – Pitched Roofs & Pseudo-3D (v3.0–v3.2)',
    labels: ['sprint', 'phase/4', 'type/feat', 'status/planned'],
    body: `## Goal
Full \`src/physics/irradiance.ts\` module with solar position, POA, and annual yield.

## Deliverables
- [ ] \`solarPosition(lat, lon, date)\` — Spencer/Cooper algorithm
- [ ] \`clearSkyGHI(lat, lon, date)\` — simplified Ineichen-Perez
- [ ] \`planeOfArrayIrradiance(GHI, DHI, solarPos, tilt, azimuth)\` — isotropic + Hay-Davies
- [ ] \`annualYield(project, lat, lon)\` — hourly simulation loop
- [ ] \`src/test/physics/irradiance.test.ts\` — validated against PVGIS for Munich, London, Madrid

## Definition of Done
Annual yield within ±5 % of PVGIS for 3 reference locations; \`npm test\` green.`,
  },
  {
    title: '[Sprint 23] Pseudo-3D Isometric View (CSS/SVG)',
    milestone: 'Phase 4 – Pitched Roofs & Pseudo-3D (v3.0–v3.2)',
    labels: ['sprint', 'phase/4', 'type/feat', 'status/planned'],
    body: `## Goal
CSS/SVG isometric projection of building with panels overlaid on each face.

## Deliverables
- [ ] Building wizard: enter W × D × H → procedural isometric box drawn in SVG
- [ ] Each \`Area\` mapped to a face (roof planes, south wall)
- [ ] Panel layout rendered using isometric matrix transforms — no 3D library
- [ ] Toggle: 2D plan view ↔ isometric preview per area
- [ ] Isometric view exportable as SVG

## Definition of Done
Isometric view renders for a simple gable house; panel layout matches 2D plan view count.`,
  },
  {
    title: '[Sprint 24] Shadow & Shading Model',
    milestone: 'Phase 4 – Pitched Roofs & Pseudo-3D (v3.0–v3.2)',
    labels: ['sprint', 'phase/4', 'type/feat', 'status/planned'],
    body: `## Goal
Date/time slider shows sun position; obstacles cast shade onto panels.

## Deliverables
- [ ] Date/time slider in 3D/isometric view
- [ ] Sun azimuth and elevation computed from \`solarPosition()\` and displayed
- [ ] Obstacle tool: draw chimney/dormer rectangle; shade computed as cast shadow
- [ ] Shaded panels highlighted in amber; shaded string flagged in string summary
- [ ] Annual yield reduction estimate based on shading fraction × Performance Ratio penalty

## Definition of Done
Shading simulation visually correct for a chimney on south-facing pitched roof at winter solstice noon.`,
  },

  // ── Phase 5 — Photo-to-Plan ───────────────────────────────────────────────
  {
    title: '[Sprint 25] Perspective Correction from Single Photo',
    milestone: 'Phase 5 – Photo-to-Plan (v3.3–v3.5)',
    labels: ['sprint', 'phase/5', 'type/feat', 'status/planned'],
    body: `## Goal
Upload one roof photo → mark 4 corners → get rectified top-down view as canvas background.

## Deliverables
- [ ] Photo upload in Area settings
- [ ] 4-corner markup: click/tap 4 points on the photo
- [ ] Homography computation and canvas warp (\`<canvas>\` 2D API, no external library)
- [ ] User enters one known measurement → scale factor computed
- [ ] Rectified image set as area canvas background layer

## Definition of Done
Rectified image of a rectangular roof section is visually undistorted; scale factor correct within ±10 %.`,
  },
  {
    title: '[Sprint 26] OpenCV.js Photogrammetry (WASM)',
    milestone: 'Phase 5 – Photo-to-Plan (v3.3–v3.5)',
    labels: ['sprint', 'phase/5', 'type/feat', 'status/planned'],
    body: `## Goal
Upload 3–10 multi-angle photos → sparse point cloud → roof dimensions suggested.

## Deliverables
- [ ] Load \`opencv.js\` as a lazy WASM chunk (only when feature is invoked)
- [ ] Feature point detection (ORB) and matching across image pairs
- [ ] Epipolar geometry and relative pose estimation
- [ ] Sparse point cloud rendered in a WebGL canvas
- [ ] Dominant plane extraction (RANSAC) → suggest roof dimensions
- [ ] All processing 100 % local — no server upload

## Definition of Done
Point cloud generated from 5 test photos; dominant plane dimensions within ±15 % of ground truth.`,
  },
  {
    title: '[Sprint 27] AR Measurement Mode (Mobile)',
    milestone: 'Phase 5 – Photo-to-Plan (v3.3–v3.5)',
    labels: ['sprint', 'phase/5', 'type/feat', 'status/planned'],
    body: `## Goal
Live camera + device orientation → tap two points → real-world distance estimated.

## Deliverables
- [ ] \`getUserMedia\` camera stream in \`<video>\` overlay on mobile
- [ ] \`DeviceOrientationEvent\` + \`DeviceMotionEvent\` for pitch/roll/yaw
- [ ] Tap-two-points measurement using perspective projection + gyro data
- [ ] Measurements logged as dimension inputs to current area
- [ ] Graceful degradation if orientation API not available

## Definition of Done
AR measurement within ±20 % for distances 2–10 m; tested on Chrome Android.`,
  },

  // ── Phase 6 — Full 3D Scene Editor ───────────────────────────────────────
  {
    title: '[Sprint 28] Three.js Scene Foundation',
    milestone: 'Phase 6 – Full 3D Editor (v4.0–v4.2)',
    labels: ['sprint', 'phase/6', 'type/feat', 'status/planned'],
    body: `## Goal
3D building wizard with orbit controls; sun light from computed position.

## Deliverables
- [ ] Add \`three\` + \`@react-three/fiber\` + \`@react-three/drei\` as lazy-loaded chunk
- [ ] Building wizard: footprint, height, roof type (flat/gable/hip/shed/mansard)
- [ ] Procedural building geometry from wizard inputs
- [ ] Orbit controls: mouse + touch; reset view button
- [ ] Directional light tracks sun position from \`solarPosition()\`

## Definition of Done
3D building renders for all 5 roof types; orbit controls work on desktop and mobile.`,
  },
  {
    title: '[Sprint 29] Panel Placement in 3D',
    milestone: 'Phase 6 – Full 3D Editor (v4.0–v4.2)',
    labels: ['sprint', 'phase/6', 'type/feat', 'status/planned'],
    body: `## Goal
Click a face in 3D → open 2D layout editor; panels rendered as 3D boxes.

## Deliverables
- [ ] Face picker: raycasting on click → opens 2D face layout editor
- [ ] Panel geometry: flat box on face, colour-coded by string
- [ ] All faces visible simultaneously in 3D; selected face highlighted
- [ ] Real-time shadow casting from Three.js sun light
- [ ] Wiring path: cable route drawn in 3D from panels → junction box → inverter marker

## Definition of Done
Full layout round-trip: draw in 2D, see in 3D, shading updates when sun slider moved.`,
  },
  {
    title: '[Sprint 30] glTF Export & DXF/SVG Import',
    milestone: 'Phase 6 – Full 3D Editor (v4.0–v4.2)',
    labels: ['sprint', 'phase/6', 'type/feat', 'status/planned'],
    body: `## Goal
Export 3D scene as glTF 2.0; import DXF/SVG floor plans.

## Deliverables
- [ ] Export scene as glTF 2.0 (\`.glb\`) via Three.js \`GLTFExporter\`
- [ ] Import DXF outline using lightweight DXF parser (no AutoCAD dependency)
- [ ] Import SVG as 2D roof outline
- [ ] Share 3D scene via compressed URL hash
- [ ] Embeddable 3D viewer: static iframe URL with no backend required

## Definition of Done
Exported \`.glb\` opens in Blender and \`model-viewer\`; DXF floor plan imports correctly for 3 test files.`,
  },

  // ── Phase 7 — Off-Grid & Hybrid ───────────────────────────────────────────
  {
    title: '[Sprint 31] Battery & Off-Grid Sizing',
    milestone: 'Phase 7 – Off-Grid & Hybrid (v4.3–v5.0)',
    labels: ['sprint', 'phase/7', 'type/feat', 'status/planned'],
    body: `## Goal
Full off-grid sizing wizard powered by \`src/physics/battery.ts\`.

## Deliverables
- [ ] \`src/physics/battery.ts\` — \`sizeBattery()\`, \`calcSoC()\`, \`calcSoH()\`, \`peukertCapacity()\`
- [ ] \`src/test/physics/battery.test.ts\`
- [ ] Off-grid mode toggle: swaps inverter suggestions to hybrid/off-grid models
- [ ] Battery sizing wizard: daily consumption, autonomy, chemistry selector
- [ ] Battery spec table from \`batteries.json\` (seed with 10 LFP products)
- [ ] BOM updated with battery bank + charge controller

## Definition of Done
Battery sizing matches worked example in \`docs/ELECTRICAL-PHYSICS.md\` §V.6; off-grid BOM complete.`,
  },
  {
    title: '[Sprint 32] Energy Yield Simulation (Hourly)',
    milestone: 'Phase 7 – Off-Grid & Hybrid (v4.3–v5.0)',
    labels: ['sprint', 'phase/7', 'type/feat', 'status/planned'],
    body: `## Goal
Full hourly yield simulation using embedded irradiance data; monthly bar chart.

## Deliverables
- [ ] Embed PVGIS-derived monthly GHI lookup table in \`src/assets/irradiance.json\` (5° lat/lon grid)
- [ ] Hourly simulation runs in Web Worker: 8760 steps × all areas
- [ ] Monthly production bar chart (canvas-drawn, no library)
- [ ] Self-consumption ratio: enter daily load profile → self-consumption %
- [ ] Export hourly results as CSV

## Definition of Done
Annual yield within ±5 % of PVGIS for 3 test locations; simulation completes < 500 ms; UI does not freeze.`,
  },
  {
    title: '[Sprint 33] Grid-Tie & Net Metering',
    milestone: 'Phase 7 – Off-Grid & Hybrid (v4.3–v5.0)',
    labels: ['sprint', 'phase/7', 'type/feat', 'status/planned'],
    body: `## Goal
Net metering calculator; feed-in tariff database; anti-islanding compliance info.

## Deliverables
- [ ] \`src/physics/powerQuality.ts\` — \`calculateNetMetering()\`, \`checkGridCompliance()\`
- [ ] Feed-in tariff database \`feedin.json\` (community-maintained, per country)
- [ ] Net metering calculator UI: import/export tariff, annual consumption → annual bill/credit
- [ ] Grid compliance checker: select country → shows applicable standard + trip settings
- [ ] Permit document helper: generates summary text for permit applications

## Definition of Done
Net metering calculation matches manual calculation; grid compliance table correct for DE, US, AU, GB.`,
  },
  {
    title: '[Sprint 34] v5.0 Polish & Documentation',
    milestone: 'Phase 7 – Off-Grid & Hybrid (v4.3–v5.0)',
    labels: ['sprint', 'phase/7', 'type/chore', 'type/docs', 'status/planned'],
    body: `## Goal
All features stable; docs complete; v5.0 release cut.

## Deliverables
- [ ] Full e2e test suite: \`src/test/e2e/\` using Playwright (headless, CI)
- [ ] Performance audit: Lighthouse ≥ 90 on Performance, Accessibility, Best Practices
- [ ] \`docs/ELECTRICAL-PHYSICS.md\` reviewed and accurate
- [ ] \`docs/HARDWARE-CONTROL.md\` reviewed and accurate
- [ ] \`docs/USER-GUIDE.md\` user guide / tutorial video script
- [ ] All ROADMAP.md checkboxes up to Phase 7 checked
- [ ] Release PR merged → GitHub Release v5.0.0 tagged automatically

## Definition of Done
Lighthouse ≥ 90 on all categories; all e2e tests green; v5.0 GitHub Release published.`,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('🔍 Dry-run mode — nothing will be created.\n');

  // 1. Create labels
  console.log(`\n📌 Creating ${LABELS.length} labels…`);
  const existingLabels = await get('/labels?per_page=100');
  const existingLabelNames = new Set(existingLabels.map(l => l.name));

  for (const label of LABELS) {
    if (existingLabelNames.has(label.name)) {
      console.log(`  ✓ (exists) ${label.name}`);
      continue;
    }
    if (dryRun) { console.log(`  + (would create) ${label.name}`); continue; }
    await post('/labels', label);
    console.log(`  + created  ${label.name}`);
  }

  // 2. Create milestones
  console.log(`\n🏁 Creating ${MILESTONES.length} milestones…`);
  const existingMs = await get('/milestones?per_page=100&state=all');
  const existingMsTitles = new Map(existingMs.map(m => [m.title, m.number]));

  const milestoneNumbers = {};
  for (const ms of MILESTONES) {
    if (existingMsTitles.has(ms.title)) {
      milestoneNumbers[ms.title] = existingMsTitles.get(ms.title);
      console.log(`  ✓ (exists) ${ms.title}`);
      continue;
    }
    if (dryRun) { console.log(`  + (would create) ${ms.title}`); continue; }
    const created = await post('/milestones', { title: ms.title, description: ms.description });
    milestoneNumbers[ms.title] = created.number;
    console.log(`  + created  ${ms.title} (#${created.number})`);
  }

  // 3. Create sprint issues
  console.log(`\n📋 Creating ${SPRINT_ISSUES.length} sprint issues…`);
  const existingIssues = await get('/issues?per_page=100&state=all');
  const existingTitles = new Set(existingIssues.map(i => i.title));

  // Fetch all labels again (in case they were just created)
  const allLabels = await get('/labels?per_page=100');
  const labelNames = new Set(allLabels.map(l => l.name));

  let created = 0;
  for (const issue of SPRINT_ISSUES) {
    if (existingTitles.has(issue.title)) {
      console.log(`  ✓ (exists) ${issue.title}`);
      continue;
    }
    if (dryRun) { console.log(`  + (would create) ${issue.title}`); continue; }

    const validLabels = issue.labels.filter(l => labelNames.has(l));
    const milestoneNum = milestoneNumbers[issue.milestone];

    const payload = {
      title: issue.title,
      body:  issue.body,
      labels: validLabels,
      ...(milestoneNum ? { milestone: milestoneNum } : {}),
    };

    await post('/issues', payload);
    created++;
    console.log(`  + created  ${issue.title}`);
    // Rate-limit: GitHub allows ~80 issue creates/minute
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS));
  }

  // 4. Detect pre-existing issues using old-style labels that need re-labelling
  console.log('\n🔍 Checking pre-existing issues for legacy labels…');
  const OLD_LABELS = ['enhancement', 'bug', 'invalid', 'question', 'wontfix', 'duplicate', 'help wanted', 'documentation'];
  const allIssues = await get('/issues?per_page=100&state=all');
  const legacyIssues = allIssues.filter(i =>
    i.labels.some(l => OLD_LABELS.includes(l.name)) &&
    !SPRINT_ISSUES.some(s => s.title === i.title)
  );
  if (legacyIssues.length > 0) {
    console.log(`\n⚠️  ${legacyIssues.length} pre-existing issue(s) use old-style labels and need manual re-labelling:`);
    for (const i of legacyIssues) {
      const oldLabs = i.labels.map(l => l.name).join(', ');
      console.log(`   #${i.number}: "${i.title}" (current labels: ${oldLabs})`);
      console.log(`   → suggest: type/feat or type/fix + phase/<N> + status/planned`);
      console.log(`   → run: gh issue edit ${i.number} --add-label "type/feat,status/planned" --remove-label "${oldLabs}"`);
    }
  } else {
    console.log('  ✓ No legacy-label issues found.');
  }

  console.log(`\n✅ Done! ${dryRun ? '(dry-run, nothing was written)' : `Created ${created} new sprint issues.`}`);
  console.log('\nNext steps:');
  console.log('  1. Re-label any legacy issues shown above.');
  console.log('  2. Go to https://github.com/el-j/open-solar-planer/issues and verify everything looks right.');
  console.log('  3. Create a GitHub Project (board or roadmap view) and link these issues.');
  console.log('     → https://github.com/el-j/open-solar-planer/projects/new');
  console.log('  4. Create a `develop` branch from `main` to begin GitFlow:');
  console.log('     git switch main && git pull && git switch -c develop && git push -u origin develop');
}

run().catch(err => { console.error(err); process.exit(1); });
