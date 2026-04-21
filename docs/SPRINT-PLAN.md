# Sprint Plan — Open Solar Planer

> **Scope:** 34 two-week sprints (68 weeks, ~16 months) to reach v5.0.  
> Based on 1–2 focused contributors. Adjust sprint velocity accordingly.  
> All sprints follow: branch → PR → CI green → merge to `main` → auto-release via Release Please.

---

## Conventions

- Sprint = 2 weeks
- Each sprint has a **goal**, **deliverables**, and **definition of done**
- Deliverables reference items from `ROADMAP.md`
- All new pure logic functions require unit tests (`npm test` stays green)
- Every PR must include a `data-testid` on new output elements

---

## Phase 0 — Foundation (Sprints 1–2)

### Sprint 1 — Developer Experience & CI Hardening
**Goal:** Every contributor can clone, run, test, and ship in < 5 minutes.

**Deliverables:**
- [ ] Expand test coverage: `calculateLayout()` edge cases (0-width, 0-height, float inputs, negative gaps)
- [ ] Add `test:coverage` script output badge to README
- [ ] Set up Vitest coverage threshold (80 % statements/branches)
- [ ] Add PR template check: "tests added/updated?"
- [ ] Document dev setup in CONTRIBUTING.md (already exists — verify and update if stale)
- [ ] Verify `npm run lint`, `npm test`, `npm run build` all green on `main`

**Definition of done:** Coverage badge visible in README; CI passes on fresh clone in under 3 min.

---

### Sprint 2 — Physics Module Scaffold
**Goal:** Create the `src/physics/` directory with constants and wiring modules, fully tested.

**Deliverables:**
- [ ] `src/physics/constants.ts` — all physical constants (see `docs/ELECTRICAL-PHYSICS.md` §X.2)
- [ ] `src/physics/wiring.ts` — `calculateCableCSA()`, `voltageDropPercent()`
- [ ] `src/test/physics/wiring.test.ts` — unit tests against IEC 60364-5-52 reference values
- [ ] `src/physics/index.ts` — re-exports public API
- [ ] ESLint rule: no `any` in `src/physics/`

**Definition of done:** `npm test` green with new tests; wiring functions exported and documented.

---

## Phase 1 — UX Polish & Panel Library (Sprints 3–10)

### Sprint 3 — Undo/Redo Stack
**Goal:** Ctrl+Z / Ctrl+Y works for all canvas placement and deletion actions.

**Deliverables:**
- [ ] Implement generic `useUndoRedo<T>` hook in `src/hooks/useUndoRedo.ts`
- [ ] Wire into panel placement, panel deletion, exclusion zone draw, exclusion zone delete
- [ ] Keyboard shortcut: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo)
- [ ] Toolbar undo/redo buttons with `aria-label` and `data-testid`
- [ ] Tests: verify stack depth, redo after new action clears redo stack

**Definition of done:** All canvas mutations undoable; tests pass; mobile undo buttons visible on touch.

---

### Sprint 4 — Keyboard Shortcuts & Accessibility
**Goal:** WCAG 2.1 AA baseline; keyboard users can complete a full layout without mouse.

**Deliverables:**
- [ ] `?` key opens a keyboard shortcut help overlay modal
- [ ] All modal/overlay components trap focus and close on Escape
- [ ] All canvas toolbar buttons reachable by Tab
- [ ] Add `role="region"` and `aria-label` to major layout sections
- [ ] Audit with `axe-core` (add as dev dependency, run in tests)
- [ ] Fix any axe errors found

**Definition of done:** Zero axe-core errors on the main page; keyboard navigation demo recorded in PR.

---

### Sprint 5 — Colour Themes & i18n Scaffold
**Goal:** Light/dark/high-contrast themes; i18n infrastructure in place (EN + DE strings).

**Deliverables:**
- [ ] Theme switcher in settings panel: light / dark / high-contrast
- [ ] Theme persisted to `localStorage`; applied via a CSS class on `<html>`
- [ ] Tailwind CSS v4 theme tokens for each theme variant
- [ ] `src/i18n/en.ts` and `src/i18n/de.ts` with all UI strings
- [ ] `useTranslation()` hook wires strings into all components
- [ ] Language picker in settings; persisted to `localStorage`

**Definition of done:** App fully translatable; DE translation covers all strings; themes switch without page reload.

---

### Sprint 6 — Panel Preset Library Expansion
**Goal:** 30+ real-world module presets in `src/assets/panels.json`.

**Deliverables:**
- [ ] Define `PanelPreset` TypeScript interface (id, brand, model, width_mm, length_mm, depth_mm, weight_kg, power_Wp, efficiency_pct, Voc, Isc, Vmpp, Impp, betaVoc, alphaIsc, NOCT, datasheet_url, price_eur, year)
- [ ] Populate `panels.json` with ≥ 30 modules: Longi Hi-MO X6, Jinko Tiger Neo, REC Alpha, SunPower Maxeon 6, Q CELLS Q.PEAK DUO, Trina Vertex S+, Canadian Solar HiHero, Risen RSM, Meyer Burger White, Silfab Prime
- [ ] UI: searchable/filterable preset picker dropdown (by brand, power range)
- [ ] Show datasheet link and efficiency badge in preset picker
- [ ] User-defined custom preset saved to `localStorage`

**Definition of done:** All 30+ presets load and display correctly; custom preset survives page reload.

---

### Sprint 7 — Session Persistence & JSON Export/Import
**Goal:** Projects survive browser refresh; JSON round-trip export/import works.

**Deliverables:**
- [ ] `src/hooks/useProjectPersistence.ts` — debounced auto-save to `localStorage`
- [ ] "Export project" button → downloads `project-<date>.json`
- [ ] "Import project" button → file input, validates schema, loads state
- [ ] `ProjectSchema` Zod validation (or hand-rolled validator, no heavy dep)
- [ ] Restore notification: "Project auto-saved at HH:MM"
- [ ] Tests: export → mutate → import → verify state restored

**Definition of done:** Complete project survives refresh and round-trip JSON export/import.

---

### Sprint 8 — Share-by-URL & PNG Export
**Goal:** Share a complete project via a URL; export canvas as high-resolution PNG.

**Deliverables:**
- [ ] Encode project state as Base64-compressed JSON in URL hash (`#v1:...`)
- [ ] On load: detect and parse URL hash → restore project
- [ ] "Share link" button copies URL to clipboard; shows toast notification
- [ ] "Export PNG" button renders canvas at 2×/3× resolution and triggers download
- [ ] "Export SVG" button for vector-quality output
- [ ] Verify URL ≤ 2 KB for typical project (10 panels, 1 exclusion zone)

**Definition of done:** Share link works in a fresh browser tab; PNG and SVG export correctly render all elements.

---

### Sprint 9 — Touch Gestures & Mobile UX
**Goal:** Pinch-to-zoom and two-finger pan work on iOS/Android; snap-to-grid option.

**Deliverables:**
- [ ] `src/hooks/useCanvasGestures.ts` — handles touch events for pan and pinch-zoom
- [ ] Minimum touch target: 44 × 44 px for all interactive elements (WCAG 2.5.5)
- [ ] Snap-to-grid toggle in toolbar (grid size = panel + gap)
- [ ] Panel rotation in free-placement mode (long-press → rotation handle appears)
- [ ] Haptic feedback on panel placement (Navigator.vibrate, 10 ms)
- [ ] Test on Chrome DevTools device simulation for iPhone 14 and Galaxy S22

**Definition of done:** Pinch-zoom and pan work on mobile; snap-to-grid option functional; all touch targets ≥ 44 px.

---

### Sprint 10 — QR Code & URL Panel Import
**Goal:** Scan a manufacturer QR code to auto-fill a panel preset.

**Deliverables:**
- [ ] Integrate `jsQR` (lightweight, pure JS, no WASM) for QR scanning via device camera
- [ ] "Scan QR" button opens camera overlay; decoded URL auto-fills preset fields
- [ ] "Paste URL" field: paste manufacturer product page URL → attempt to parse width/length/power from page meta tags
- [ ] Manual JSON import/export of entire panel library snapshot
- [ ] Deep-link: `?panel=longi-hi-mo-x6-580` pre-selects a preset on load

**Definition of done:** QR scan correctly fills at least 3 test panel QR codes; URL deep-link works.

---

## Phase 2 — Multi-Area Projects & String Design (Sprints 11–16)

### Sprint 11 — Project & Area Data Model
**Goal:** Introduce `Project` → `Area[]` → `Layout` hierarchy in state.

**Deliverables:**
- [ ] TypeScript interfaces: `Project`, `Area`, `AreaType`, `StringGroup`
- [ ] Migrate existing single-area state to `areas[0]` of a Project
- [ ] Project-level totals: combined panel count, combined kWp
- [ ] All existing tests still pass after refactor
- [ ] No UI changes visible in this sprint (internal refactor only)

**Definition of done:** Existing functionality unchanged; new data model types exported and tested.

---

### Sprint 12 — Area Manager UI
**Goal:** Users can add, rename, delete, and switch between multiple roof areas.

**Deliverables:**
- [ ] Sidebar area list: add / rename / delete / duplicate controls
- [ ] Tab or pill switcher to select active area canvas
- [ ] Colour-coded area badge displayed on canvas header
- [ ] Drag-and-drop reorder in area list (using `@dnd-kit/core`, lightweight)
- [ ] Mini-map panel: all areas shown as labelled thumbnails with their kWp

**Definition of done:** Multiple areas can be created, switched between, and reordered; project totals update correctly.

---

### Sprint 13 — String Sizing Tool
**Goal:** In-app string sizing calculator using the physics from `ELECTRICAL-PHYSICS.md` §II.4.

**Deliverables:**
- [ ] `src/physics/stringDesign.ts` — `calculateStringSizing()`, `buildStringSummary()`
- [ ] `src/test/physics/stringDesign.test.ts`
- [ ] UI: "String Design" panel in sidebar; user enters inverter Vmppt_min/max/abs, Tmin, Tmax
- [ ] Output: recommended string length, Nmin, Nmax, Voc_cold, Vmp_hot, warnings
- [ ] Visual string highlight: click panels → assign to string → string colour-coded on canvas

**Definition of done:** String sizing results match SMA Sunny Design for 3 test cases; warnings displayed for out-of-range configs.

---

### Sprint 14 — MPPT Assignment & Array Summary
**Goal:** Assign string groups to MPPT inputs; display array power summary.

**Deliverables:**
- [ ] `InverterSpec` JSON schema implemented; `inverters.json` seeded with 10 inverters (SMA, Fronius, Huawei, Solis, Goodwe, Enphase, SolarEdge, Victron, Growatt, Deye)
- [ ] MPPT assignment UI: drag string group → MPPT input slot
- [ ] MPPT balance checker: flags if strings on same MPPT differ by > 5 % Vmp
- [ ] Array summary table: total Wp, Voc, Vmp, Isc, Imp per MPPT input
- [ ] Export array summary as CSV

**Definition of done:** MPPT assignment works for multi-MPPT inverters; imbalance warnings displayed.

---

### Sprint 15 — Wiring Length Estimator
**Goal:** Estimate DC string cable lengths from panel positions on canvas; flag voltage drop.

**Deliverables:**
- [ ] Canvas mode: "Show wiring" overlays cable routes from panels → combiner → inverter
- [ ] Inverter position: draggable marker on canvas
- [ ] Cable route: Manhattan routing (horizontal + vertical segments)
- [ ] `calculateCableCSA()` called per string; result shown in BOM preview
- [ ] Voltage drop warning if > 1 % on any DC string

**Definition of done:** Cable lengths estimated within 10 % of actual for a representative roof layout.

---

### Sprint 16 — Single-Line Diagram Generator (SVG)
**Goal:** Auto-generate a single-line electrical diagram as downloadable SVG.

**Deliverables:**
- [ ] `src/diagram/singleLine.ts` — pure function `generateSingleLineSVG(project): string`
- [ ] Diagram includes: panels → string combiner → inverter → AC distribution → grid
- [ ] Wire gauges and fuse ratings shown on diagram
- [ ] SVG downloadable; also renderable inline in app
- [ ] PDF export via `jsPDF` + SVG-to-PDF (keep jsPDF optional chunk, lazy-loaded)

**Definition of done:** Generated SVG opens correctly in Inkscape and browsers; fuse/cable labels correct for test project.

---

## Phase 3 — Cost Planning & BOM (Sprints 17–20)

### Sprint 17 — Component Database
**Goal:** `panels.json`, `inverters.json`, `mounting.json`, `cables.json` fully populated with prices.

**Deliverables:**
- [ ] Add `price_eur`, `price_usd`, `price_date` to `PanelPreset`
- [ ] `mounting.json`: rail, end-clamp, mid-clamp, roof hook, tilt frame — per-unit prices
- [ ] `cables.json`: 4 mm² DC cable, 6 mm² DC cable, AC cable, MC4 connectors — per-metre/per-piece
- [ ] User override: any price editable locally (stored in `localStorage`)
- [ ] Community contribution guide for price updates (documented in CONTRIBUTING.md)

**Definition of done:** All JSON files load without errors; prices display in UI; user overrides persist.

---

### Sprint 18 — BOM Generator
**Goal:** Auto-generate complete Bill of Materials from project layout.

**Deliverables:**
- [ ] `src/bom/calculateBOM.ts` — pure function `calculateBOM(project, componentDB): BOMLine[]`
- [ ] BOM lines: panels, inverter suggestion, mounting hardware, cables, connectors, fuses
- [ ] BOM table in UI: quantity, unit price, total — editable quantity
- [ ] Add custom line items (labour, permits, misc.)
- [ ] Export as CSV and JSON

**Definition of done:** BOM generated for test project matches manually computed BOM within ±5 %.

---

### Sprint 19 — Cost Dashboard & Payback Calculator
**Goal:** Total cost, payback period, and break-even chart visible in app.

**Deliverables:**
- [ ] Cost summary: total material, estimated labour (configurable hourly rate × hours), total
- [ ] Cost per kWp; cost per kWh (25-year yield estimate)
- [ ] Payback calculator inputs: electricity tariff (€/kWh), feed-in tariff, annual consumption
- [ ] Break-even chart: canvas-drawn line chart (no charting library)
- [ ] Tax / VAT selector: country dropdown, rates from `vat.json`

**Definition of done:** Payback period matches manual calculation for test inputs; chart renders correctly on mobile.

---

### Sprint 20 — What-If Scenarios & PDF Export
**Goal:** Compare up to 3 configurations side-by-side; export full project report as PDF.

**Deliverables:**
- [ ] Scenario save/load: name and store up to 3 project variants in `localStorage`
- [ ] Side-by-side comparison table: kWp, panel count, cost, payback, annual yield
- [ ] "Export report" button: generates multi-page PDF with layout canvas, BOM, cost summary, single-line diagram
- [ ] PDF uses `jsPDF` (already added in Sprint 16); lazy-loaded chunk

**Definition of done:** Three scenarios compare correctly; PDF opens in Adobe Reader and browser PDF viewer.

---

## Phase 4 — Pitched Roofs & Pseudo-3D (Sprints 21–24)

### Sprint 21 — Pitched Roof Geometry
**Goal:** Each area has tilt and azimuth; calculations account for tilted surface.

**Deliverables:**
- [ ] `Area` model: add `tilt_deg`, `azimuth_deg`, `ridge_position`, `eave_overhang_m`
- [ ] Panel count recalculated accounting for `1/cos(tilt)` effective horizontal footprint
- [ ] Irradiance transposition: POA calculation from `src/physics/irradiance.ts`
- [ ] Azimuth/tilt input UI in Area settings panel
- [ ] Visual indicator: area shading colour-coded by azimuth (south = best = green)

**Definition of done:** Area at 30° tilt south-facing shows correct yield premium vs flat roof for test location.

---

### Sprint 22 — Irradiance Engine
**Goal:** Full `src/physics/irradiance.ts` module with solar position, POA, and annual yield.

**Deliverables:**
- [ ] `solarPosition(lat, lon, date)` — see `ELECTRICAL-PHYSICS.md` §VIII.1
- [ ] `clearSkyGHI(lat, lon, date)` — simplified Ineichen-Perez
- [ ] `planeOfArrayIrradiance(GHI, DHI, solarPos, tilt, azimuth)` — isotropic + Hay-Davies
- [ ] `annualYield(project, lat, lon)` — hourly simulation loop
- [ ] `src/test/physics/irradiance.test.ts` — validated against PVGIS for Munich, London, Madrid
- [ ] Results accurate within ±5 % of PVGIS

**Definition of done:** Annual yield within ±5 % of PVGIS for 3 reference locations; `npm test` green.

---

### Sprint 23 — Pseudo-3D Isometric View
**Goal:** CSS/SVG isometric projection of building with panels overlaid on each face.

**Deliverables:**
- [ ] Building wizard: enter W × D × H → procedural isometric box drawn in SVG
- [ ] Each `Area` mapped to a face (roof planes, south wall)
- [ ] Panel layout rendered using isometric matrix transforms — no 3D library
- [ ] Toggle: 2D plan view ↔ isometric preview per area
- [ ] Isometric view exportable as SVG

**Definition of done:** Isometric view renders for a simple gable house; panel layout matches 2D plan view count.

---

### Sprint 24 — Shadow & Shading Model
**Goal:** Date/time slider shows sun position; obstacles cast shade onto panels.

**Deliverables:**
- [ ] Date/time slider in 3D/isometric view
- [ ] Sun azimuth and elevation computed from `solarPosition()` and displayed
- [ ] Obstacle tool: draw chimney/dormer rectangle on roof; shade computed as cast shadow
- [ ] Shaded panels highlighted in amber; shaded string flagged in string summary
- [ ] Annual yield reduction estimate based on shading fraction × Performance Ratio penalty

**Definition of done:** Shading simulation visually correct for a chimney on a south-facing pitched roof at winter solstice noon.

---

## Phase 5 — Photo-to-Plan (Sprints 25–27)

### Sprint 25 — Perspective Correction
**Goal:** Upload one roof photo → mark 4 corners → get rectified top-down view as canvas background.

**Deliverables:**
- [ ] Photo upload in Area settings
- [ ] 4-corner markup: click/tap 4 points on the photo
- [ ] Homography computation and canvas warp (`<canvas>` 2D API, no external library)
- [ ] User enters one known measurement → scale factor computed
- [ ] Rectified image set as area canvas background layer

**Definition of done:** Rectified image of a rectangular roof section is visually undistorted; scale factor correct within ±10 %.

---

### Sprint 26 — OpenCV.js Photogrammetry (WASM)
**Goal:** Upload 3–10 multi-angle photos → sparse point cloud → roof dimensions suggested.

**Deliverables:**
- [ ] Load `opencv.js` as a lazy WASM chunk (only when feature is invoked)
- [ ] Feature point detection (ORB) and matching across image pairs
- [ ] Epipolar geometry and relative pose estimation
- [ ] Sparse point cloud rendered in a WebGL canvas
- [ ] Dominant plane extraction (RANSAC) → suggest roof dimensions to user
- [ ] All processing 100 % local — no upload to any server

**Definition of done:** Point cloud generated from 5 test photos of a reference roof; dominant plane dimensions within ±15 % of ground truth.

---

### Sprint 27 — AR Measurement Mode (Mobile)
**Goal:** Live camera + device orientation → tap two points → real-world distance estimated.

**Deliverables:**
- [ ] `getUserMedia` camera stream in `<video>` overlay on mobile
- [ ] `DeviceOrientationEvent` + `DeviceMotionEvent` for pitch/roll/yaw
- [ ] Tap-two-points measurement using perspective projection + gyro data
- [ ] Measurements logged as dimension inputs to current area
- [ ] Graceful degradation if orientation API not available (fallback to manual entry)

**Definition of done:** AR measurement within ±20 % for distances 2–10 m; tested on Chrome Android.

---

## Phase 6 — Full 3D Scene Editor (Sprints 28–30)

### Sprint 28 — Three.js Scene Foundation
**Goal:** 3D building wizard with orbit controls; sun light from computed position.

**Deliverables:**
- [ ] Add `three` + `@react-three/fiber` + `@react-three/drei` as lazy-loaded chunk
- [ ] Building wizard: footprint, height, roof type (flat/gable/hip/shed/mansard)
- [ ] Procedural building geometry from wizard inputs
- [ ] Orbit controls: mouse + touch; reset view button
- [ ] Directional light tracks sun position from `solarPosition()`

**Definition of done:** 3D building renders for all 5 roof types; orbit controls work on desktop and mobile.

---

### Sprint 29 — Panel Placement in 3D
**Goal:** Click a face in 3D → open 2D layout editor; panels rendered as 3D boxes.

**Deliverables:**
- [ ] Face picker: raycasting on click → opens 2D face layout editor (reuses Phase 2 canvas engine)
- [ ] Panel geometry: flat box on face, colour-coded by string
- [ ] All faces visible simultaneously in 3D; selected face highlighted
- [ ] Real-time shadow casting from Three.js sun light
- [ ] Wiring path: cable route drawn in 3D from panels → junction box → inverter marker

**Definition of done:** Full layout round-trip: draw in 2D, see in 3D, shading updates when sun slider moved.

---

### Sprint 30 — glTF Export & DXF/SVG Import
**Goal:** Export 3D scene as glTF 2.0; import DXF/SVG floor plans.

**Deliverables:**
- [ ] Export scene as glTF 2.0 (`.glb`) via Three.js `GLTFExporter`
- [ ] Import DXF outline using lightweight DXF parser (no AutoCAD dependency)
- [ ] Import SVG as 2D roof outline
- [ ] Share 3D scene via compressed URL hash (same mechanism as Phase 1, Sprint 8)
- [ ] Embeddable 3D viewer: static iframe URL with no backend required

**Definition of done:** Exported `.glb` opens in Blender and `model-viewer` web component; DXF floor plan imports correctly for 3 test files.

---

## Phase 7 — Off-Grid, Hybrid & System Diagram (Sprints 31–34)

### Sprint 31 — Battery & Off-Grid Sizing
**Goal:** Full off-grid sizing wizard powered by `src/physics/battery.ts`.

**Deliverables:**
- [ ] `src/physics/battery.ts` — `sizeBattery()`, `calcSoC()`, `calcSoH()`, `peukertCapacity()`
- [ ] `src/test/physics/battery.test.ts`
- [ ] Off-grid mode toggle: swaps inverter suggestions to hybrid/off-grid models
- [ ] Battery sizing wizard: daily consumption, autonomy, chemistry selector
- [ ] Battery spec table from `batteries.json` (seed with 10 LFP products)
- [ ] BOM updated with battery bank + charge controller

**Definition of done:** Battery sizing formula matches worked example in `ELECTRICAL-PHYSICS.md` §V.6; off-grid BOM complete.

---

### Sprint 32 — Energy Yield Simulation (Hourly)
**Goal:** Full hourly yield simulation using embedded irradiance data; monthly bar chart.

**Deliverables:**
- [ ] Embed PVGIS-derived monthly GHI lookup table in `src/assets/irradiance.json` (5° lat/lon grid, 12 months)
- [ ] Hourly simulation runs in Web Worker: 8760 steps × all areas
- [ ] Monthly production bar chart (canvas-drawn, no library)
- [ ] Self-consumption ratio: enter daily load profile (hourly kWh array) → self-consumption %
- [ ] Export hourly results as CSV

**Definition of done:** Annual yield within ±5 % of PVGIS for 3 test locations; simulation completes < 500 ms; UI does not freeze.

---

### Sprint 33 — Grid-Tie & Net Metering
**Goal:** Net metering calculator; feed-in tariff database; anti-islanding compliance info.

**Deliverables:**
- [ ] `src/physics/powerQuality.ts` — `calculateNetMetering()`, `checkGridCompliance()`
- [ ] Feed-in tariff database `feedin.json` (community-maintained, per country)
- [ ] Net metering calculator UI: enter import/export tariff, annual consumption → annual bill/credit
- [ ] Grid compliance checker: select country → shows applicable standard + trip settings
- [ ] Permit document helper: generates summary text (project specs, BOM totals, one-line diagram) for copy-paste into permit application

**Definition of done:** Net metering calculation matches manual calculation; grid compliance table correct for DE, US, AU, GB.

---

### Sprint 34 — v5.0 Polish & Documentation
**Goal:** All features stable; docs complete; v5.0 release cut.

**Deliverables:**
- [ ] Full end-to-end test suite: `src/test/e2e/` using Playwright (headless, CI)
- [ ] Performance audit: Lighthouse ≥ 90 on Performance, Accessibility, Best Practices
- [ ] `docs/ELECTRICAL-PHYSICS.md` reviewed and accurate (already created)
- [ ] `docs/HARDWARE-CONTROL.md` reviewed and accurate (already created)
- [ ] User guide / tutorial video script in `docs/USER-GUIDE.md`
- [ ] All ROADMAP.md checkboxes up to Phase 7 checked
- [ ] Release PR merged → GitHub Release v5.0.0 tagged automatically

**Definition of done:** Lighthouse ≥ 90 on all categories; all e2e tests green; v5.0 GitHub Release published.

---

## Sprint Velocity Reference

| Scenario | Sprints per phase |
|----------|------------------|
| 1 contributor, 10 h/week | × 1.5 (all durations longer) |
| 2 contributors, full-time | × 0.5 (can run phases in parallel) |
| Community burst (hackathon) | Phase 1 completable in 1 week |

Phases 2–3 can be developed in parallel by two separate contributors without conflicts (different files).  
Phases 5–6 require Phase 4 area model to be complete first.

---

## Dependency Graph

```
Sprint 1–2  (Foundation)
    └── Sprint 3–10  (Phase 1: UX + Panel Library)
            └── Sprint 11–12  (Area model + Area Manager UI)
                    └── Sprint 13–16  (String design + Wiring + Diagram)
                            └── Sprint 17–20  (BOM + Cost)
                                    └── Sprint 21–24  (Pitched roof + Irradiance)
                                            ├── Sprint 25–27  (Photo-to-plan)
                                            └── Sprint 28–30  (Three.js 3D)
                                                    └── Sprint 31–34  (Off-grid + v5.0)
```

---

*Last updated: April 2026 — Open Solar Planer contributors*
