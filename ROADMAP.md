# 🗺️ Open Solar Planer — Comprehensive Product Roadmap

> **Mission:** Make solar energy accessible and plannable for everyone — for free, forever, in the browser.  
> **Architecture constraint:** 100 % static, no server, no sign-up. Works offline once loaded. Hosted on GitHub Pages.

---

## 📍 Where We Are Today — v1.0.0

| Capability | Status |
|---|---|
| 2D flat-roof grid layout | ✅ Done |
| Free panel placement with drag | ✅ Done |
| Exclusion zones (draw & label) | ✅ Done |
| Background image overlay | ✅ Done |
| Built-in panel presets (3 sizes) | ✅ Done |
| Portrait / landscape toggle | ✅ Done |
| Mounting gap (X/Y) configuration | ✅ Done |
| Live panel count + kWp total | ✅ Done |
| Mobile-responsive tab layout | ✅ Done |
| CI/CD, Conventional Commits, auto-release | ✅ Done |

---

## 🎯 Phase 0.5 — Multi-Area 2D/3D Canvas Engine  *(v1.1 — HIGHEST PRIORITY)*

> **This is the single most impactful improvement to the tool.**  
> A real solar installation spans multiple surfaces, uses different panels per surface, and needs a 3D sanity-check view.  
> Everything else (cost planning, string design, yield simulation) builds on top of this canvas engine.  
> **All rendering is pure SVG — no Three.js, no WebGL, no canvas 2D.**  
> The isometric "fake 3D" view is the definitive 3D experience and must be excellent before anything else is considered.  
> **Full technical specification:** [`docs/CANVAS-ENGINE.md`](./docs/CANVAS-ENGINE.md)

### 0.5.0 — Project & Area Data Model
- [ ] TypeScript interfaces: `Project`, `Area`, `AreaOutline` (rect + polygon), `FreePanel` (with rotation), `ExclusionZone`, `StringGroup`
- [ ] `projectReducer.ts` — all mutations handled as typed actions (replaces scattered `useState` in `App.tsx`)
- [ ] Undo/redo stack built into the reducer (max 100 entries, structural sharing)
- [ ] `useProject` context hook replaces all `useState` in `App.tsx`
- [ ] All existing tests updated to pass with new data model

### 0.5.1 — SVG Canvas Renderer (replaces `<div>` renderer)
- [ ] `<svg viewBox>` as the rendering root — zoom and pan change `viewBox` only, zero React re-renders
- [ ] `AreaCanvas.tsx` composition: outline layer → exclusion zones → grid panels or free panels → string overlay → selection handles
- [ ] Grid mode: SVG `<rect>` per panel, polygon outline support (panels only placed inside polygon)
- [ ] Free mode: SVG `<rect>` per panel with rotation transform; rotation handle (drag grip above selection box)
- [ ] Snap-to-grid: configurable grid size (default = panel + gap), dashed blue guide lines on snap
- [ ] Zoom (wheel + pinch): zoom towards cursor position; range 0.1×–5×
- [ ] Pan (Space+drag, middle-mouse, two-finger drag)
- [ ] Full keyboard shortcut set (see `docs/CANVAS-ENGINE.md` §11.1)

### 0.5.2 — Area Manager UI
- [ ] Sidebar area list: add / rename / delete / duplicate / reorder (drag handles)
- [ ] Colour-coded area badges; per-area kWp shown in list
- [ ] Area settings panel: surface type, outline (rect or polygon draw tool), tilt °, azimuth °, panel preset, gap, grid offset, layout mode toggle, background image, lock/hide
- [ ] Overview mode: all areas shown side-by-side on a single infinite canvas; click area → focus
- [ ] Project totals (combined panel count + kWp) always visible in header

### 0.5.3 — Free Placement Mode Upgrade
- [ ] Tool palette: Select | Place Panel | Draw Zone | Label | Erase
- [ ] Multi-select: Shift+Click, rubber-band box-drag, Ctrl+A
- [ ] Drag selected group as a unit; snap enabled for all panels simultaneously
- [ ] Copy / paste (Ctrl+C / Ctrl+V) — cross-area paste supported
- [ ] Per-panel rotation: drag rotation handle; Shift = snap to 45°; `R` key = rotate 90°
- [ ] Click-to-exclude individual grid cells (grid mode shortcut)
- [ ] Auto-fill from point (right-click shortcut in free mode)

### 0.5.4 — Polygon Area Outline Tool
- [ ] Click to place vertices; double-click or click first vertex to close polygon
- [ ] Draggable vertex handles for adjustment after drawing
- [ ] Point-in-polygon test used in grid layout (panels only placed inside polygon)
- [ ] Pre-built polygon templates: L-shape, T-shape, trapezoid, triangle, custom
- [ ] Grid layout recalculates instantly as polygon vertices are dragged

### 0.5.5 — SVG Isometric View — The Definitive "Fake 3D"
- [ ] **Building Wizard**: enter footprint W × D × H + roof type (flat/gable/hip/shed/mansard) → procedural face geometry, zero new dependencies
- [ ] Each Area assigned to a building face; `tilt_deg` + `azimuth_deg` auto-sync from face descriptor
- [ ] Panel layout rendered as SVG `<polygon>` via isometric transform (`toIso()`, `rectToIsoPolygon()`)
- [ ] Four viewpoint presets: NE, NW, SE, SW — switch animates via CSS transition (200 ms)
- [ ] Toggle `2D Plan ↔ Isometric` with single button (`I` key shortcut)
- [ ] Clicking a panel in isometric view → jumps to 2D mode with that panel selected
- [ ] Sun direction arrow computed from `solarPosition(lat, lon, dateTime)`
- [ ] Shadow polygons per obstacle (chimney, dormer, adjacent face) — semi-transparent SVG overlay
- [ ] Panels inside a shadow polygon tinted amber; tooltip shows estimated irradiance loss
- [ ] Export isometric view as clean, annotated SVG (for permit documentation)
- [ ] All areas + panels + labels legible at A4 print size
- [ ] `aria-description` summary on `<svg>` element; panel click/keyboard accessible

### 0.5.6 — Quality Gate Before Any Further Visualisation
> **No Three.js. No WebGL. No canvas 2D.** All views are SVG.  
> The isometric SVG view must pass the §9.9 quality bar (12 checkboxes) and be live in production for ≥ 3 months before any alternative visualisation strategy is even evaluated.  
> See `docs/CANVAS-ENGINE.md` §10 for the full reasoning and future gate criteria.

---

## 🚀 Phase 1 — Polish & Panel Library  *(v1.2 – v1.4)*

*Goal: make the existing tool a pleasure to use on any device, and expand the built-in knowledge base.*

### 1.1 — UX & Accessibility Polish
- [ ] Keyboard shortcut help overlay (`?` key)
- [ ] Undo / redo stack for all placement actions (Ctrl+Z / Ctrl+Y)
- [ ] Touch gesture support: pinch-to-zoom, two-finger pan on the canvas
- [ ] Snap-to-grid option in free placement mode
- [ ] Panel rotation per individual panel in free mode (arbitrary angle)
- [ ] Colour themes: light, dark, high-contrast (persisted in `localStorage`)
- [ ] Internationalisation (i18n) scaffold — English, German, Spanish, French as first languages

### 1.2 — Expanded Panel Preset Library
- [ ] Grow built-in preset library to 30+ real-world modules (Longi, Jinko, REC, SunPower, Risen, Canadian Solar, Q CELLS, Trina, …)
- [ ] Per-preset manufacturer URL field stored alongside dimensions & power
- [ ] Community-maintained `panels.json` file in the repo — contributions welcome via PR
- [ ] Panel datasheet PDF link stored in preset (opened in new tab)
- [ ] User-defined custom presets saved to `localStorage`

### 1.3 — Import Panel Data from URL / QR Code
- [ ] Paste a manufacturer product-page URL → browser-side parsing extracts dimensions and wattage (using `fetch` + DOM parser, CORS permitting, or a CORS proxy approach kept fully static)
- [ ] QR code scanner via device camera → decode product URL → auto-fill preset fields
- [ ] Manual JSON import / export of panel library snapshot
- [ ] Share a panel preset via URL query string (deep-link to a pre-configured session)

### 1.4 — Session Persistence & Sharing
- [ ] Auto-save entire project state to `localStorage` (debounced, instant restore on reload)
- [ ] Export project as JSON file (download)
- [ ] Import project from JSON file (upload or drag-drop onto the app)
- [ ] Share-by-URL: encode compact project state in URL hash (Base64-compressed JSON), shareable link ≤ 2 KB
- [ ] Print / export canvas as high-resolution PNG or SVG

---

## 🏘️ Phase 2 — Multi-Area Projects  *(v2.0 – v2.2)*

*Goal: model real installations where panels are spread across multiple surfaces — roof, shed, garage, south wall, pergola — all feeding one or multiple inverters.*

### 2.0 — Project & Area Model
- [ ] Introduce a **Project** as the top-level container
- [ ] A project contains 1-N **Areas** (mounting surfaces)
- [ ] Each Area has: name, type (flat roof / pitched roof / façade / ground), dimensions, orientation (azimuth °), tilt (°), panel layout
- [ ] Areas can belong to the same or different **String groups** (electrical subgraphs)
- [ ] Project-level totals: combined panel count, combined kWp across all areas

### 2.1 — Area Manager UI
- [ ] Sidebar area list with add / rename / delete / duplicate
- [ ] Tab or pill switcher to jump between area canvases
- [ ] Colour-coded area badges on the canvas
- [ ] Drag-and-drop reorder areas in the list
- [ ] Mini-map view: all areas shown as labelled thumbnails with their kWp

### 2.2 — String & MPPT Planning
- [ ] Assign panels / rows to strings
- [ ] Visual string highlight (colour per string)
- [ ] String summary: Voc, Vmp, Isc, Imp computed from panel specs
- [ ] MPPT input compatibility check: enter inverter MPPT voltage range → app flags out-of-range strings
- [ ] Series / parallel wiring topology visualisation (schematic view, not 3D)

---

## 💶 Phase 3 — Cost Planning & Bill of Materials  *(v2.3 – v2.5)*

*Goal: give every user a realistic cost estimate and a complete shopping list without leaving the browser.*

### 2.3 — Component Database
- [ ] Extend `panels.json` to include price fields (price_eur, price_usd — community-maintained, date-stamped)
- [ ] `inverters.json`: brand, model, power range, MPPT count, efficiency, price, URL
- [ ] `mounting.json`: rail types, clamps, roof hooks, tilt frames — with per-unit price
- [ ] `cables.json`: DC cable, AC cable, connectors — priced per metre / per piece
- [ ] All JSON files editable by community; loaded from repo assets at runtime (no backend)
- [ ] User can override any price locally (stored in `localStorage`)

### 2.4 — BOM Generator
- [ ] Auto-generate full Bill of Materials from project layout:
  - Panels (count, model, unit price, total)
  - Inverter(s) suggestion based on total kWp
  - Mounting hardware calculated from panel count + area type + roof type
  - DC/AC cable lengths estimated from area dimensions and string topology
  - Connectors, fuses, junction boxes
- [ ] BOM shown as interactive table in-app — editable quantity, price, supplier
- [ ] Add custom line items (labour, permits, misc.)
- [ ] Export BOM as CSV, JSON, and formatted PDF (via `jsPDF` in-browser, no server)
- [ ] Tax / VAT selector per country

### 2.5 — Cost Dashboard
- [ ] Total material cost, estimated labour cost (configurable hourly rate × estimated hours)
- [ ] Cost per kWp, cost per kWh (based on 25-year energy yield estimate)
- [ ] Payback period calculator: enter electricity tariff, feed-in tariff, annual consumption
- [ ] Break-even chart (simple canvas line chart, no charting library required)
- [ ] What-if scenarios: compare 3 configurations side-by-side
- [ ] Grid / off-grid toggle changes BOM suggestions (battery, charge controller added for off-grid)

---

## 🔭 Phase 4 — Pitched Roofs & Pseudo-3D Visualisation  *(v3.0 – v3.2)*

*Goal: support non-flat roofs, façades, and give users an intuitive 3D-like sense of the layout.*

### 3.0 — Pitched Roof Geometry Model
- [ ] Area tilt angle (0°–90°) and azimuth (0°–360°) stored per area
- [ ] Actual panel area on a tilted surface computed correctly (cos(tilt) correction)
- [ ] Shadow / shading impact flag: south-facing roof sections auto-detected from azimuth
- [ ] Ridge line definition: user draws the ridge on the roof outline, eave overhang configurable
- [ ] Gable walls: triangular areas supported (custom polygon outlines)

### 3.1 — Pseudo-3D Isometric View (CSS/Canvas)
- [ ] Isometric projection of the building block computed from user-entered Width × Depth × Height
- [ ] Each Area rendered as a face on the isometric box (roof planes, wall faces)
- [ ] Panel layout overlaid on each face using isometric transforms (no 3D library needed — pure CSS/SVG matrix math)
- [ ] Toggle between 2D plan view and isometric preview view per-area
- [ ] Isometric view exportable as SVG

### 3.2 — Shadow & Shading Basic Model
- [ ] Date/time slider → sun azimuth & elevation computed per location (Latitude/Longitude input or browser Geolocation API)
- [ ] Simple cast-shadow detection: chimney / dormer obstacle rectangles cast shade onto panels below
- [ ] Shaded cells highlighted in amber; partially shaded string flagged as performance risk
- [ ] Annual yield reduction estimate based on shading ratio

---

## 📸 Phase 5 — Photo-to-Plan Assistant  *(v3.3 – v3.5)*

*Goal: let users photograph their roof and get a measured layout plan automatically in the browser.*

### 3.3 — Perspective Correction from Single Photo
- [ ] Upload one straight-on photo of a roof face
- [ ] User marks 4 corners of the surface with click/tap
- [ ] Homography (perspective warp) applied in a `<canvas>` element → rectified top-down view
- [ ] User enters one known measurement (e.g. ridge length) → scale factor computed
- [ ] Rectified image used as background layer for the area canvas

### 3.4 — Multi-Photo Photogrammetry Assist (Browser WebAssembly)
- [ ] Upload 3–10 photos taken from different angles (walk-around)
- [ ] Use a WASM port of a lightweight feature-matching library (e.g. OpenCV.js) to:
  - Detect feature points
  - Match across images
  - Estimate relative camera poses
  - Produce a sparse point cloud
- [ ] Point cloud rendered in a `<canvas>` WebGL scene
- [ ] Auto-extract dominant plane (roof) → dimensions suggested to user
- [ ] All processing fully local — no upload to any server

### 3.5 — AR Measurement Mode (Mobile)
- [ ] Use `getUserMedia` + DeviceOrientationEvent for live camera overlay on mobile
- [ ] Tap two points in the live view → device gyro + perspective used to estimate real-world distance
- [ ] Measurements logged as dimension inputs to the current area
- [ ] Works entirely in the browser via WebRTC camera API — no native app needed

---

## 🧊 Phase 6 — Full 3D Scene Editor  *(v4.0 – v4.2)*

*Goal: a full browser-based 3D planning environment — no install, no account.*

### 4.0 — 3D Scene Foundation (Three.js)
- [ ] Integrate [Three.js](https://threejs.org/) (or `@react-three/fiber`) as a lazy-loaded chunk to keep initial bundle small
- [ ] Building wizard: enter footprint (W × D), wall height, roof type (flat / gable / hip / shed / mansard)
- [ ] Procedural building geometry generated in Three.js from wizard inputs
- [ ] Orbit controls: rotate, zoom, pan with mouse and touch
- [ ] Ambient + directional light representing the sun position from Phase 4 model

### 4.1 — Panel Placement in 3D
- [ ] Click a roof or wall face → switches to face's 2D layout editor (same engine as Phase 2/3)
- [ ] Panels rendered as 3D box geometry on the face
- [ ] All faces visible simultaneously in 3D; selected face highlighted
- [ ] Wiring path estimation: cable route drawn in 3D from panels → junction box → inverter
- [ ] Real-time shadow casting in Three.js scene per sun position

### 4.2 — Scene Import / Export
- [ ] Export scene as glTF 2.0 file (downloadable, opens in any 3D viewer)
- [ ] Import DXF / SVG floor plan as roof outline in 3D scene
- [ ] Share 3D scene via compressed URL hash (same mechanism as Phase 1.4)
- [ ] Embed 3D viewer iframe: embeddable in any website without backend (static URL)

---

## 🔋 Phase 7 — Off-Grid & Hybrid System Design  *(v4.3 – v5.0)*

*Goal: the complete solar system designer — from photon to socket, on-grid and off-grid.*

### 4.3 — Energy Yield Simulation
- [ ] Hourly irradiance profile per location: use embedded PVGIS-derived lookup table (JSON, pre-computed for latitude bands) — no API call
- [ ] Compute estimated annual yield (kWh) factoring in tilt, azimuth, shading, temperature coefficient
- [ ] Monthly production bar chart (canvas-drawn, no library)
- [ ] Self-consumption ratio calculator: enter daily load profile → compute self-consumption %

### 4.4 — Battery & Off-Grid Sizing
- [ ] Enter daily energy consumption (kWh/day) + autonomy days desired
- [ ] Battery capacity recommendation: Ah @ 24/48 V
- [ ] Battery type selector: Lead-acid, AGM, LiFePO4 — with DoD and cycle life parameters
- [ ] Battery bank BOM added to cost model
- [ ] Charge controller sizing: PWM vs MPPT recommendation with model suggestions from `inverters.json`

### 4.5 — System Diagram Generator
- [ ] Auto-generate single-line electrical diagram as SVG:
  - Panels → combiner box → charge controller / inverter → battery bank → loads
  - Wire gauges computed from current × length
  - Fuse / breaker sizes computed per NEC/IEC rules-of-thumb
- [ ] Downloadable as SVG and PDF
- [ ] Multilingual component labels (from i18n system in Phase 1.1)

### 5.0 — Grid-Tie & Net Metering Planner
- [ ] Grid-tied inverter sizing against local grid frequency (50/60 Hz)
- [ ] Feed-in tariff database (community-maintained JSON per country)
- [ ] Net metering / net billing calculator
- [ ] Anti-islanding compliance note per country
- [ ] Permit/documentation helper: generates a summary PDF with system specs, BOM, and one-line diagram ready for installer or local authority submission

---

## 🤝 How to Contribute

We need contributors in every discipline. Pick up any open issue tagged with your interest:

| Skill | Where to help |
|---|---|
| **React / TypeScript** | All phases — UI components, state management |
| **Canvas / SVG / WebGL** | Phases 4–6 — 2D drawing engine, 3D scene |
| **Solar engineering** | Panel data quality, yield formulas, BOM accuracy |
| **UX / Product** | Wireframes, accessibility, user testing |
| **i18n / translation** | Phase 1.1 — add your language |
| **Data curation** | `panels.json`, `inverters.json`, feed-in tariff DB |
| **WASM / OpenCV.js** | Phase 5 — photogrammetry |
| **Three.js** | Phase 6 — 3D scene |
| **Documentation** | Guides, tutorials, video walkthroughs |

### Getting started in 3 minutes
```bash
git clone https://github.com/el-j/open-solar-planer.git
cd open-solar-planer
npm install
npm run dev        # → http://localhost:5173/open-solar-planer/
npm test           # all tests must stay green
```

Read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for branch naming, commit format, and PR process.  
Open a [GitHub Discussion](https://github.com/el-j/open-solar-planer/discussions) to propose a feature or ask a question before diving into code.

---

## 📐 Technical Constraints (non-negotiable)

These constraints keep the project accessible, trustworthy, and maintainable:

| Constraint | Reason |
|---|---|
| 100 % static — no server, no database, no account | Privacy, no hosting cost, works offline |
| GitHub Pages deployable | Free, permanent, no infra to maintain |
| All processing client-side (browser) | User data stays on device |
| TypeScript strict, no `any` | Correctness, contributor onboarding |
| Pure exported functions for all logic | Unit-testable without rendering |
| `npm test` + `npm run build` always green on `main` | Reliable automated releases |
| No heavy dependencies without tree-shaking analysis | Fast initial load on mobile |
| WCAG 2.1 AA accessibility | Solar planning is for everyone |

---

## 📅 Release Cadence

| Phase | Target version | Rough window |
|---|---|---|
| Phase 1 (Polish + Panel Library) | v1.1 – v1.4 | Ongoing |
| Phase 2 (Multi-Area + Strings) | v2.0 – v2.2 | After Phase 1 stable |
| Phase 3 (Cost + BOM) | v2.3 – v2.5 | Parallel with Phase 2 |
| Phase 4 (Pitched Roof + Pseudo-3D) | v3.0 – v3.2 | After Phase 2 stable |
| Phase 5 (Photo-to-Plan) | v3.3 – v3.5 | Requires Phase 4 area model |
| Phase 6 (Full 3D) | v4.0 – v4.2 | Requires Phase 5 UX patterns |
| Phase 7 (Off-Grid + System Diagram) | v4.3 – v5.0 | Can start in parallel with Phase 6 |

Releases are driven by community contributions — there are no fixed dates. Each Phase milestone is tracked as a [GitHub Milestone](https://github.com/el-j/open-solar-planer/milestones).

---

## 🌍 Vision

> *Solar energy planning should require no money, no specialised software, and no engineering degree. Open Solar Planer will be the Wikipedia of solar installation tools — free, open, multilingual, and built by the community.*

**⭐ Star the repo — every star brings more contributors.**  
**🍴 Fork it — your ideas are welcome.**  
**🌞 Share it — help the world plan cleaner energy.**
