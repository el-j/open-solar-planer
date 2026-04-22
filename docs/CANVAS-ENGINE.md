# Canvas Engine — Deep Technical Plan

> **Priority: HIGHEST NEXT STEP** — This document specifies the complete design for the multi-area 2D + isometric solar panel planner.  
> Everything in this file feeds directly into `SPRINT-PLAN.md` Sprints 11–23 and must be implemented before any cost/BOM or advanced visualisation work.
>
> **Rendering philosophy:** All views — 2D plan, isometric "fake 3D", shadow preview — are implemented with pure SVG and CSS transforms.  
> No WebGL, no Three.js, no canvas 2D API (except for raster image overlay).  
> The isometric view is the definitive "3D" experience and must be excellent before any other visualisation is considered.  
> WebGL/Three.js is **not on the roadmap**; SVG isometric done well looks better, loads instantly, and remains accessible.

---

## 0 · Why This Matters

The current canvas is a **single-area, single-panel-size** renderer hardcoded into `App.tsx`.  
A real solar installation has:

- **Multiple mounting surfaces** (main roof, garage, shed, south façade, carport, ground mount)
- **Different panel models per surface** (larger panels on the main roof, smaller on the shed)
- **Mixed layout modes per surface** (grid auto-fill on the main roof, free placement on a complex L-shaped surface)
- **Individual panel rotation** (landscape on one row, portrait on the next)
- **3D context** so the user can sanity-check tilt, shading, and orientation visually — achieved with an SVG isometric projection, no 3D library needed

This document specifies the full canvas engine redesign to support all of the above.

---

## 1 · Core Concepts

### 1.1 Terminology

| Term | Definition |
|------|-----------|
| **Project** | Top-level container. One JSON file. Holds N Areas + project settings. |
| **Area** | A single mounting surface (flat roof, pitched roof face, façade, ground). Has its own canvas. |
| **Layout** | The panel arrangement inside one Area. Mode: `grid` or `free`. |
| **Panel** | One physical module. In grid mode derived from layout maths. In free mode an explicit `FreePanel` record. |
| **Exclusion Zone** | A named rectangular (or polygon, later) region inside an Area where panels cannot go. |
| **String Group** | A set of panels wired in series; colour-coded on the canvas. |
| **Viewport** | The visible portion of a canvas. Supports zoom (0.1×–5×) and pan (infinite). |
| **Snap Grid** | Invisible cm-resolution grid for snapping free-placed panels. |

---

### 1.2 Coordinate Systems

```
World space (cm)   — absolute position within one Area
    ↓  × scaleFactor (px/cm)
Canvas space (px)  — logical pixel position within the canvas element
    ↓  + scrollOffset (px)
Screen space (px)  — physical pixel position on screen
```

All stored positions are in **world space (cm)**.  
Rendering converts to canvas space on the fly.  
No coordinates are stored in pixels — this ensures zoom/pan never corrupts data.

---

## 2 · Data Model (TypeScript Interfaces)

### 2.1 Project

```typescript
export interface Project {
  id: string;
  name: string;
  version: 2;                         // schema version for migration
  createdAt: string;                  // ISO 8601
  updatedAt: string;
  location?: GeoLocation;
  areas: Area[];
  settings: ProjectSettings;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  timezone: string;
}

export interface ProjectSettings {
  defaultPanelPresetId: string;
  defaultGapX_cm: number;
  defaultGapY_cm: number;
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF' | 'AUD';
  vat_pct: number;
}
```

### 2.2 Area

```typescript
export type AreaSurfaceType = 'flat-roof' | 'pitched-roof' | 'facade' | 'ground' | 'carport' | 'custom';
export type LayoutMode = 'grid' | 'free';

export interface Area {
  id: string;
  name: string;
  colour: string;                     // hex, shown in area list badge
  surfaceType: AreaSurfaceType;

  // Geometry (world space, cm)
  outline: AreaOutline;               // shape of the mounting surface

  // Orientation
  azimuth_deg: number;                // 0=N, 90=E, 180=S, 270=W
  tilt_deg: number;                   // 0=flat, 90=vertical

  // Layout
  mode: LayoutMode;
  panelPresetId: string;              // which panel model to use on this area
  isLandscape: boolean;
  gapX_cm: number;
  gapY_cm: number;
  gridOffset: { x: number; y: number }; // cm — allow shifting the grid within the area

  // Free mode panels
  freePanels: FreePanel[];

  // Exclusion zones
  exclusionZones: ExclusionZone[];

  // String assignment
  stringGroups: StringGroup[];

  // Display
  backgroundImage?: string;          // base64 data URL
  visible: boolean;
  locked: boolean;
}
```

### 2.3 Area Outline (Polygon Support)

```typescript
export type AreaOutline =
  | { type: 'rect'; width_cm: number; height_cm: number }
  | { type: 'polygon'; points: Array<{ x: number; y: number }> }; // cm coordinates
```

Rectangular areas are the common case. Polygon areas (L-shapes, triangles, trapezoids) are stored as a point list. The bounding box of the polygon is used for viewport calculations.

### 2.4 FreePanel (extended from current)

```typescript
export interface FreePanel {
  id: string;
  x: number;              // cm, top-left corner
  y: number;
  width: number;          // cm — can differ from area default (custom per-panel size later)
  height: number;
  rotation_deg: number;   // 0, 90, 180, 270 (or arbitrary 0–360 in future)
  power_W: number;
  panelPresetId?: string; // override area default
  stringGroupId?: string;
  label?: string;
  highlighted?: boolean;  // for search/select
}
```

### 2.5 ExclusionZone (extended from current)

```typescript
export interface ExclusionZone {
  id: string;
  label: string;
  colour: string;
  shape: AreaOutline;     // can be rect or polygon
  opacity: number;        // 0.3 default
}
```

### 2.6 StringGroup

```typescript
export interface StringGroup {
  id: string;
  label: string;          // "String A", "String B", …
  colour: string;
  panelIds: string[];     // references to FreePanel.id (free mode) or grid cell keys
  mpptInput?: string;     // "MPPT 1", "MPPT 2"
}
```

### 2.7 Computed Grid Layout (read-only, not stored)

```typescript
export interface GridLayout {
  cols: number;
  rows: number;
  totalPanels: number;
  totalPower_Wp: number;
  effectivePanelWidth_cm: number;
  effectivePanelHeight_cm: number;
  cells: GridCell[];       // each cell position in world space
}

export interface GridCell {
  col: number;
  row: number;
  x: number;               // cm
  y: number;               // cm
  inExclusionZone: boolean;
  stringGroupId?: string;
}
```

`GridLayout` is derived by `calculateGridLayout(area, panels)` — a pure function, never stored.

---

## 3 · Architecture

### 3.1 File Structure

```
src/
  canvas/
    CanvasEngine.tsx          — main canvas component (area-aware)
    AreaCanvas.tsx            — renders a single Area (2D)
    GridRenderer.tsx          — renders grid-mode panels
    FreePanelRenderer.tsx     — renders free-mode panels with handles
    ExclusionZoneRenderer.tsx — renders exclusion zones
    StringGroupOverlay.tsx    — string colour overlay
    ViewportController.tsx    — zoom, pan, pointer capture
    SnapGrid.ts               — snap helpers
    transforms.ts             — world ↔ canvas ↔ screen conversions
    hitTest.ts                — pointer-to-element hit testing
    useAreaInteraction.ts     — unified pointer event handler
  canvas3d/
    IsoView.tsx               — CSS/SVG isometric projection (Phase 4)
    ThreeScene.tsx            — Three.js scene (Phase 6, lazy-loaded)
  area/
    AreaManager.tsx           — sidebar area list
    AreaMiniMap.tsx           — thumbnail overview of all areas
    AreaSettings.tsx          — tilt, azimuth, outline, panel preset per area
  project/
    projectReducer.ts         — all project mutations (reducer pattern)
    projectActions.ts         — typed action creators
    useProject.ts             — context + dispatch hook
    projectSchema.ts          — Zod (or hand-rolled) validation
    calculateGridLayout.ts    — pure function (moved from App.tsx)
```

### 3.2 State Management (Reducer Pattern)

```typescript
// src/project/projectReducer.ts

export type ProjectAction =
  // Areas
  | { type: 'ADD_AREA'; payload: Partial<Area> }
  | { type: 'DELETE_AREA'; areaId: string }
  | { type: 'RENAME_AREA'; areaId: string; name: string }
  | { type: 'DUPLICATE_AREA'; areaId: string }
  | { type: 'REORDER_AREAS'; areaIds: string[] }
  | { type: 'UPDATE_AREA_SETTINGS'; areaId: string; patch: Partial<Area> }
  | { type: 'SET_AREA_OUTLINE'; areaId: string; outline: AreaOutline }

  // Free panels
  | { type: 'ADD_FREE_PANEL'; areaId: string; panel: FreePanel }
  | { type: 'MOVE_FREE_PANELS'; areaId: string; moves: Array<{ id: string; x: number; y: number }> }
  | { type: 'ROTATE_FREE_PANELS'; areaId: string; ids: string[]; rotation_deg: number }
  | { type: 'DELETE_FREE_PANELS'; areaId: string; ids: string[] }
  | { type: 'DUPLICATE_FREE_PANELS'; areaId: string; ids: string[] }
  | { type: 'SNAP_FREE_PANELS'; areaId: string; ids: string[] }

  // Grid mode
  | { type: 'SET_LAYOUT_MODE'; areaId: string; mode: LayoutMode }
  | { type: 'SET_GRID_OFFSET'; areaId: string; x: number; y: number }
  | { type: 'SET_GAP'; areaId: string; gapX: number; gapY: number }

  // Exclusion zones
  | { type: 'ADD_EXCLUSION_ZONE'; areaId: string; zone: ExclusionZone }
  | { type: 'UPDATE_EXCLUSION_ZONE'; areaId: string; zone: ExclusionZone }
  | { type: 'DELETE_EXCLUSION_ZONE'; areaId: string; zoneId: string }

  // String groups
  | { type: 'ADD_STRING_GROUP'; areaId: string; group: StringGroup }
  | { type: 'ASSIGN_PANELS_TO_STRING'; areaId: string; panelIds: string[]; stringGroupId: string }
  | { type: 'DELETE_STRING_GROUP'; areaId: string; groupId: string }

  // Undo/redo
  | { type: 'UNDO' }
  | { type: 'REDO' };
```

The reducer wraps every mutation in an undo stack automatically — no per-action undo logic needed.

### 3.3 Undo Stack Integration

```typescript
interface HistoryState {
  past: Project[];     // max 100 entries
  present: Project;
  future: Project[];
}

function historyReducer(state: HistoryState, action: ProjectAction): HistoryState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    return { past: state.past.slice(0,-1), present: state.past[state.past.length-1], future: [state.present, ...state.future] };
  }
  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
  }
  const next = projectReducer(state.present, action);
  if (next === state.present) return state; // no change → don't pollute history
  return { past: [...state.past.slice(-99), state.present], present: next, future: [] };
}
```

---

## 4 · 2D Canvas Rendering

### 4.1 Rendering Technology Choice

| Option | Pros | Cons | Decision |
|--------|------|------|---------|
| HTML `<div>` + absolute positioning (current) | Simple, accessible | Slow at 500+ panels (layout thrash), no sub-pixel | Keep for < 50 panels |
| SVG | Vector, accessible, CSS animations | Gets slow at thousands of elements | **Use for 2D — best DX + accessibility** |
| `<canvas>` 2D API | Fast for thousands of elements | Not accessible, harder hit testing | Reserve for background tiles, shadow map |
| WebGL / OffscreenCanvas | Fastest | Complex, overkill for 200 panels | Reserve for 3D (Phase 6) |

**Decision: SVG as the primary 2D renderer.**  
Switch to `<canvas>` background layer for photo overlay / irradiance heatmap.

### 4.2 SVG Viewport Transform

```tsx
// CanvasEngine.tsx
const viewBox = `${-pan.x / zoom} ${-pan.y / zoom} ${containerW / zoom} ${containerH / zoom}`;

return (
  <svg
    viewBox={viewBox}
    width={containerW}
    height={containerH}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onWheel={handleWheel}
    style={{ cursor, touchAction: 'none' }}
  >
    <AreaCanvas area={area} panelPresets={panelPresets} />
  </svg>
);
```

Zoom and pan are implemented entirely via the SVG `viewBox` — no coordinate transforms needed on individual elements.

### 4.3 AreaCanvas Composition

```tsx
// AreaCanvas.tsx
function AreaCanvas({ area, panelPresets }: AreaCanvasProps) {
  const layout = useMemo(() => calculateGridLayout(area, panelPresets), [area, panelPresets]);

  return (
    <g data-area={area.id}>
      {/* 1. Background image (if set) */}
      <BackgroundImageLayer area={area} />

      {/* 2. Area outline + fill */}
      <AreaOutlineLayer outline={area.outline} colour={area.colour} />

      {/* 3. Snap grid lines (only in free mode, only when snap is on) */}
      <SnapGridLayer area={area} />

      {/* 4. Exclusion zones (below panels so zones are visible under transparent panels) */}
      <ExclusionZoneLayer zones={area.exclusionZones} />

      {/* 5. Grid panels or free panels */}
      {area.mode === 'grid'
        ? <GridPanelLayer layout={layout} stringGroups={area.stringGroups} />
        : <FreePanelLayer panels={area.freePanels} stringGroups={area.stringGroups} selectedIds={selectedIds} />
      }

      {/* 6. Selection handles (rendered on top, only in free mode) */}
      <SelectionLayer selectedIds={selectedIds} panels={area.freePanels} />

      {/* 7. String group colour overlay */}
      <StringGroupOverlay panels={area.freePanels} stringGroups={area.stringGroups} />
    </g>
  );
}
```

### 4.4 Panel Rendering

**Grid mode panel (SVG `<rect>`):**
```tsx
function GridPanelLayer({ layout, stringGroups }: GridPanelLayerProps) {
  return (
    <g>
      {layout.cells.filter(c => !c.inExclusionZone).map(cell => {
        const colour = stringGroups.find(sg => sg.panelIds.includes(cellKey(cell)))?.colour ?? '#2563eb';
        return (
          <rect
            key={cellKey(cell)}
            x={cell.x}
            y={cell.y}
            width={layout.effectivePanelWidth_cm}
            height={layout.effectivePanelHeight_cm}
            fill={colour}
            fillOpacity={0.7}
            stroke="#1d4ed8"
            strokeWidth={0.5}
            rx={0.5}
          />
        );
      })}
    </g>
  );
}
```

**Free mode panel with rotation:**
```tsx
function FreePanelElement({ panel, selected, onPointerDown }: FreePanelProps) {
  const cx = panel.x + panel.width / 2;
  const cy = panel.y + panel.height / 2;
  const transform = `rotate(${panel.rotation_deg}, ${cx}, ${cy})`;

  return (
    <g transform={transform} onPointerDown={onPointerDown} style={{ cursor: 'move' }}>
      <rect
        x={panel.x} y={panel.y}
        width={panel.width} height={panel.height}
        fill="#2563eb" fillOpacity={0.75}
        stroke={selected ? '#f59e0b' : '#1d4ed8'}
        strokeWidth={selected ? 1.5 : 0.5}
        rx={0.5}
      />
      {/* Power label — only shown when panel is large enough in viewport */}
      <text x={cx} y={cy + 3} textAnchor="middle" fontSize={8} fill="white" pointerEvents="none">
        {panel.power_W}W
      </text>
      {/* Rotation grip (only when selected) */}
      {selected && <RotationHandle panel={panel} />}
    </g>
  );
}
```

### 4.5 Selection Model

```typescript
interface SelectionState {
  mode: 'none' | 'single' | 'multi' | 'box-select';
  selectedIds: Set<string>;
  boxSelect?: { x0: number; y0: number; x1: number; y1: number }; // world coords
}
```

**Multi-select interactions:**
- **Click** on empty area → deselect all (in select tool); place new panel (if place tool active)
- **Click** on panel → select single
- **Shift+Click** on panel → add/remove from selection
- **Click + drag** on empty area → rubber-band box select
- **Ctrl+A** → select all panels in active area
- **Delete / Backspace** → delete selected panels
- **Ctrl+D** → duplicate selected panels (placed 10 cm offset)
- **Arrow keys** → nudge selected panels by 1 cm (Shift+Arrow = 10 cm)
- **Ctrl+C / Ctrl+V** → copy/paste within same area or to a different area

### 4.6 Rotation Handle

When a panel (or group) is selected, a circular rotation handle appears above the bounding box:

```
    ⊙ ← rotation handle (circular drag target, 12 cm radius from bounding box centre)
  ┌────┐
  │    │  ← selected panel(s), amber border
  └────┘
    ×  ← quick-delete (only on single selection)
```

Drag the rotation handle → compute angle from centre → round to nearest 1° (or 45° if shift held) → `ROTATE_FREE_PANELS` action.

### 4.7 Snap Grid

```typescript
// src/canvas/SnapGrid.ts

export function snapToGrid(value: number, gridSize_cm: number, snapEnabled: boolean): number {
  if (!snapEnabled) return value;
  return Math.round(value / gridSize_cm) * gridSize_cm;
}

export function snapPanelPosition(
  x: number, y: number,
  panelW: number, panelH: number,
  gridSize_cm: number,
  snapEnabled: boolean
): { x: number; y: number } {
  // snap by top-left corner
  return {
    x: snapToGrid(x, gridSize_cm, snapEnabled),
    y: snapToGrid(y, gridSize_cm, snapEnabled),
  };
}

// Default snap grid = panel width + gap (aligns with grid-mode cells)
export function defaultSnapGridSize(panelW: number, gapX: number): number {
  return panelW + gapX;
}
```

Snap lines (guides) appear on screen when dragging close to a snap point — drawn as light blue dashed SVG lines.

### 4.8 Zoom & Pan

```typescript
// src/canvas/ViewportController.tsx

interface ViewportState {
  zoom: number;       // 0.1 – 5.0, 1.0 = 1px per cm
  panX: number;       // SVG viewport offset X (px)
  panY: number;       // SVG viewport offset Y (px)
}

// Wheel → zoom towards cursor position
function handleWheel(e: WheelEvent, state: ViewportState, containerRect: DOMRect): ViewportState {
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const newZoom = Math.max(0.1, Math.min(5, state.zoom * factor));
  // Zoom towards cursor: adjust pan so the point under cursor stays fixed
  const cursorX = e.clientX - containerRect.left;
  const cursorY = e.clientY - containerRect.top;
  const worldX = (cursorX + state.panX) / state.zoom;
  const worldY = (cursorY + state.panY) / state.zoom;
  return {
    zoom: newZoom,
    panX: worldX * newZoom - cursorX,
    panY: worldY * newZoom - cursorY,
  };
}

// Two-finger pinch (touch) — same formula with gestureEvent or pointer delta
// Middle-mouse drag / Space+drag → pan
```

**Keyboard shortcuts for viewport:**
| Key | Action |
|-----|--------|
| `=` / `+` | Zoom in |
| `-` | Zoom out |
| `0` | Fit area to window |
| `1` | 100 % zoom (1 px = 1 cm) |
| `F` | Fit all areas in view (multi-area overview) |
| Space + drag | Pan |
| Middle mouse drag | Pan |

---

## 5 · Multi-Area Canvas

### 5.1 Three View Modes

```
┌─────────────────────────────────────────────┐
│  Mode A: Single Area (current-style)        │
│  One area fills the canvas.                 │
│  Area selector = tabs or sidebar pills.     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Mode B: Overview (all areas on one canvas) │
│  Areas shown as labelled islands.           │
│  Spatial layout is arbitrary (drag areas).  │
│  Useful for seeing project totals visually. │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Mode C: Isometric / "Fake 3D" (SVG/CSS)   │
│  Areas mapped to building faces.            │
│  Tilt + azimuth encoded geometrically.      │
│  Pure SVG — zero extra dependencies.        │
│  This IS the 3D view. Make it excellent.    │
└─────────────────────────────────────────────┘
```

The user switches mode via a toolbar toggle (`2D Plan` | `Overview` | `Isometric`). Only one mode is active at a time.  
**Mode C is the definitive visual "3D" experience** — it must be polished to a very high standard before any other visualisation strategy is considered.

### 5.2 Overview Canvas Layout Algorithm

Each Area is positioned on the overview canvas at a user-draggable offset. Default auto-layout:

```typescript
export function autoLayoutAreas(areas: Area[]): Record<string, { x: number; y: number }> {
  // Simple horizontal strip with 100 cm spacing between bounding boxes
  let cursorX = 0;
  const positions: Record<string, { x: number; y: number }> = {};
  for (const area of areas) {
    positions[area.id] = { x: cursorX, y: 0 };
    const bbox = getOutlineBoundingBox(area.outline);
    cursorX += bbox.width + 100;
  }
  return positions;
}
```

Area labels float above their outline. Clicking an area in overview mode → switches to Mode A (single area focused).

### 5.3 Area Manager Sidebar

```
┌──────────────────────┐
│ + Add Area           │
├──────────────────────┤
│ ■ Main Roof    12 kWp│ ← coloured badge, kWp total
│ ■ Garage        2 kWp│
│ ■ South Façade  1 kWp│
│   ⊕ Add area ...     │
├──────────────────────┤
│ Project total: 15 kWp│
│ Total panels:    38  │
└──────────────────────┘
```

Each area row has: drag handle (reorder), colour dot, name (editable inline), kWp, ⋮ menu (rename, duplicate, delete, settings, lock/unlock).

### 5.4 Area Settings Panel (per area)

| Setting | Control |
|---------|---------|
| Name | Text input |
| Surface type | Select: flat roof / pitched / façade / ground / carport |
| Outline | Rect (W × H sliders) or Polygon (draw tool) |
| Tilt (°) | Slider 0–90 with live label |
| Azimuth (°) | Compass rose selector + number input |
| Panel preset | Preset picker (from panels.json) |
| Orientation | Portrait / Landscape toggle |
| Gap X (cm) | Number input |
| Gap Y (cm) | Number input |
| Grid offset X, Y | Fine-tune panel row alignment |
| Layout mode | Grid / Free toggle |
| Background image | Upload button |
| Visible | Toggle |
| Locked | Toggle (prevent accidental edits) |

---

## 6 · Grid Mode — Deep Design

### 6.1 `calculateGridLayout()` (pure function, refactored)

```typescript
export function calculateGridLayout(
  outline: AreaOutline,
  panelWidth_cm: number,
  panelHeight_cm: number,
  gapX_cm: number,
  gapY_cm: number,
  gridOffsetX_cm: number,
  gridOffsetY_cm: number,
  exclusionZones: ExclusionZone[]
): GridLayout {
  const bbox = getOutlineBoundingBox(outline);
  const step_W = panelWidth_cm + gapX_cm;
  const step_H = panelHeight_cm + gapY_cm;
  const cols = Math.floor((bbox.width - gridOffsetX_cm + gapX_cm) / step_W);
  const rows = Math.floor((bbox.height - gridOffsetY_cm + gapY_cm) / step_H);

  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = gridOffsetX_cm + col * step_W;
      const y = gridOffsetY_cm + row * step_H;
      const panelRect = { x, y, width: panelWidth_cm, height: panelHeight_cm };

      const inZone = exclusionZones.some(z => rectsOverlap(panelRect, getZoneBoundingBox(z)));
      const inOutline = outline.type === 'rect' || pointInPolygon({ x: x + panelWidth_cm/2, y: y + panelHeight_cm/2 }, outline.points);

      if (inOutline) cells.push({ col, row, x, y, inExclusionZone: inZone });
    }
  }

  const activeCells = cells.filter(c => !c.inExclusionZone);
  return {
    cols, rows,
    totalPanels: activeCells.length,
    totalPower_Wp: activeCells.length * /* power from preset */0,
    effectivePanelWidth_cm: panelWidth_cm,
    effectivePanelHeight_cm: panelHeight_cm,
    cells,
  };
}
```

Key enhancement over current: **polygon outline support** — only place panels where the centre falls inside the polygon.

### 6.2 Grid Offset Drag Handle

In grid mode, a dotted-line drag handle at the top-left corner lets the user shift the entire grid within the area (adjusts `gridOffsetX/Y`). This is useful for:
- Aligning the grid to a roof ridge or parapet
- Leaving a required minimum distance from the edge (e.g. 30 cm fire setback)

### 6.3 Click-to-Exclude

In grid mode, clicking on an individual grid cell toggles it between active and excluded (adds/removes a cell-level exclusion rather than a drawn zone). This is for one-off "skip this cell" scenarios without drawing a full exclusion zone.

```typescript
export type CellExclusion = { col: number; row: number }; // added to Area.cellExclusions[]
```

---

## 7 · Free Placement Mode — Deep Design

### 7.1 Tool Palette (per Area, free mode only)

```
[ ↖ Select ]  [ ✛ Place Panel ]  [ ▦ Draw Zone ]  [ ✐ Label ]  [ ⌫ Erase ]
```

| Tool | Pointer behaviour |
|------|------------------|
| **Select** | Click = select, drag = move, box-drag on empty = rubber-band |
| **Place Panel** | Click = place new panel at click point (centred) |
| **Draw Zone** | Click+drag = draw exclusion zone rectangle; release → prompt for label |
| **Label** | Click on panel = edit label; click on zone = edit label |
| **Erase** | Click on panel = delete; click on zone = delete |

### 7.2 Panel Placement Logic (Place Tool)

1. Pointer down → compute world-space position of click.
2. Create a new `FreePanel` at that position (centred under cursor).
3. If snap is enabled → snap top-left corner to nearest snap grid point.
4. Check for overlap with existing panels (bounding box × bounding box — axis-aligned).
5. Highlight overlapping panels in red; allow placement anyway but show warning badge.
6. Dispatch `ADD_FREE_PANEL` action.

### 7.3 Drag Move

1. Pointer down on a panel → set `dragRef` with `startX/Y` and `origX/Y`.
2. Pointer move → compute `delta = (curPos - startPos) / scaleFactor` (world space cm).
3. If multiple panels selected: apply same delta to all selected panels simultaneously.
4. If snap enabled → snap each panel's top-left to grid.
5. Pointer up → dispatch `MOVE_FREE_PANELS` action (batch, one undo entry for all).

### 7.4 Arbitrary Rotation

```
Rotation grip drag → angle = atan2(curY - centrY, curX - centreX) (radians → degrees)
                  → round to 1° (Shift: round to 45°)
                  → dispatch ROTATE_FREE_PANELS
```

The bounding box of a rotated panel for collision detection:
```typescript
export function rotatedBoundingBox(panel: FreePanel): { x: number; y: number; width: number; height: number } {
  const rad = (panel.rotation_deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = panel.width * cos + panel.height * sin;
  const h = panel.width * sin + panel.height * cos;
  return {
    x: panel.x + panel.width / 2 - w / 2,
    y: panel.y + panel.height / 2 - h / 2,
    width: w,
    height: h,
  };
}
```

### 7.5 Copy / Paste

- **Ctrl+C**: serialise selected panels to clipboard as JSON string (via `navigator.clipboard.writeText`)
- **Ctrl+V**: parse clipboard → `pastedPanels` with new IDs, offset by (+20 cm, +20 cm), dispatch `ADD_FREE_PANEL` for each
- **Cross-area paste**: clipboard JSON detected in target area → panels pasted; positions preserved (useful when copying a row across areas of the same size)

### 7.6 Auto-Fill in Free Mode

A "Fill from here" shortcut: right-click on empty area → "Auto-fill grid from this point" → places a temporary grid starting at that point using current panel + gap settings. The user can delete unwanted panels from the result.

---

## 8 · Polygon Area Outline Tool

### 8.1 Draw Mode

1. Open Area Settings → Outline → "Draw polygon"
2. Canvas switches to outline-draw mode (different cursor, toolbar hidden)
3. Click to place polygon vertices
4. Double-click or click first vertex to close the polygon
5. Polygon displayed with draggable vertex handles for adjustment
6. "Confirm" button saves the polygon as `area.outline`

### 8.2 Point-in-Polygon Test (used in grid layout)

```typescript
export function pointInPolygon(pt: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
```

### 8.3 Pre-built Polygon Templates

The outline-draw UI offers quick templates:
- Rectangle (default)
- L-shape (6 vertices)
- T-shape (8 vertices)
- Trapezoid (4 vertices, for hip roof faces)
- Triangle (3 vertices, for gable ends)
- Custom (free draw)

---

## 9 · Isometric View — The Definitive "Fake 3D" (SVG/CSS)

The isometric view is **not a stepping stone to WebGL** — it *is* the 3D view.  
Done well in SVG it looks sharper, loads in milliseconds, stays zoomable/printable, and is accessible to screen readers.  
The goal is to make it look so good that users never miss a polygon 3D engine.

### 9.1 Rendering Technology

| Choice | Reason |
|--------|--------|
| Pure SVG `<polygon>` + `<g transform>` | Instant load (0 KB extra), crisp at any DPI, exportable as SVG |
| CSS `perspective` + `transform: rotateX/Y` | Alternative for the building shell faces — browser-composited, GPU-accelerated, no JS |
| No WebGL, no Three.js, no canvas 2D | Avoids 500 KB+ bundle cost, avoids ugly pixelated look at high zoom, avoids poor accessibility |

**Hybrid approach:** Use CSS 3D transforms for the building shell faces (walls, roof planes) since the browser compositor handles depth-sorting and smooth scrolling for free. Use SVG polygons rendered within those faces for the actual panels, exclusion zones, and labels — because SVG scales perfectly and supports pointer events natively.

### 9.2 Isometric Transform

Standard 2:1 isometric projection, all in SVG coordinate space:

```
ISO_X = (world_x - world_y) × cos(30°)   ≈ (world_x - world_y) × 0.866
ISO_Y = (world_x + world_y) × sin(30°) − world_z   ≈ (world_x + world_y) × 0.5 − world_z
```

Where `world_z` is the height above the base plane in cm (wall height, panel thickness).

```typescript
// src/canvas3d/isoTransform.ts

export interface IsoPoint { x: number; y: number; }
export interface World3D   { x: number; y: number; z: number; }

const COS30 = Math.cos(Math.PI / 6); // 0.866
const SIN30 = Math.sin(Math.PI / 6); // 0.5

export function toIso(p: World3D, scale: number = 1): IsoPoint {
  return {
    x: (p.x - p.y) * COS30 * scale,
    y: (p.x + p.y) * SIN30 * scale - p.z * scale,
  };
}

/** Convert the 4 corners of an axis-aligned panel rectangle to isometric screen points */
export function rectToIsoPolygon(
  x: number, y: number, w: number, h: number,
  faceTransform: (lx: number, ly: number) => World3D,
  scale: number
): IsoPoint[] {
  return [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }
  ].map(c => toIso(faceTransform(c.x, c.y), scale));
}

/** SVG points attribute string from IsoPoint[] */
export function isoPointsAttr(pts: IsoPoint[]): string {
  return pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
```

### 9.3 Building Model

The user enters building geometry in a **Building Wizard** panel:

| Field | Default | Notes |
|-------|---------|-------|
| Footprint width (cm) | 1000 | East-West span |
| Footprint depth (cm) | 800 | North-South span |
| Wall height (cm) | 300 | Eaves height |
| Roof type | `flat` | flat / gable / hip / shed / mansard |
| Ridge height (cm) | 150 | Gable/hip ridge above eaves |
| Building azimuth (°) | 180 | Direction the front face points (180 = south) |

From this the app generates a `BuildingGeometry` object with labelled 3D face descriptors — no physics, just geometry:

```typescript
export interface BuildingFace {
  id: string;                      // 'roof-main', 'wall-south', 'roof-garage', …
  label: string;
  vertices3D: World3D[];           // 3 or 4 corners in building coordinate space
  normal_deg: { azimuth: number; tilt: number }; // used for sun/shadow calc
  areaId?: string;                 // which Area maps to this face
}
```

### 9.4 Face → Area Mapping

Each `Area` in the project is **assigned to a building face** via a dropdown in Area Settings:  
`Face: [Main Roof ▾]` — or `Face: [None / standalone]` for areas not placed on the building model.

When a face is assigned:
- The area's `tilt_deg` and `azimuth_deg` are automatically synchronised from the face descriptor (can be overridden manually)
- The area's outline is auto-cropped to fit within the face bounding box (with user-adjustable offset)

### 9.5 Panel Rendering in Isometric View

For each visible panel (grid or free mode):

1. Retrieve its world-space position `(x, y)` within the Area (cm)
2. Look up the `BuildingFace` for this area → get `faceTransform: (localX, localY) → World3D`
3. Call `rectToIsoPolygon(x, y, w, h, faceTransform, scale)` → 4 `IsoPoint` screen coordinates
4. Render as `<polygon points="..." fill={stringColour} stroke="#1d4ed8" />`

The face transform encodes the face's tilt and position in building space so panels appear correctly sloped on pitched roofs.

### 9.6 Building Roof Types — Face Transforms

```typescript
// src/canvas3d/buildingFaces.ts

/** Flat roof: panels lie in the Z=wallHeight plane */
export function flatRoofFaceTransform(
  buildingX: number, buildingY: number, wallHeight: number
): (lx: number, ly: number) => World3D {
  return (lx, ly) => ({ x: buildingX + lx, y: buildingY + ly, z: wallHeight });
}

/** Gable roof south face: panels lie on a tilted plane */
export function gableRoofSouthFaceTransform(
  buildingX: number, buildingDepth: number,
  wallHeight: number, ridgeHeight: number, tilt_deg: number
): (lx: number, ly: number) => World3D {
  const tilt_rad = (tilt_deg * Math.PI) / 180;
  return (lx, ly) => ({
    x: buildingX + lx,
    y: buildingY + ly * Math.cos(tilt_rad),
    z: wallHeight + ly * Math.sin(tilt_rad),
  });
}

// Similarly: gableRoofNorthFaceTransform, hipRoofFaceTransform, shedRoofFaceTransform, …
```

### 9.7 View Controls (Isometric Mode)

| Control | Action |
|---------|--------|
| Four preset viewpoint buttons | NE, NW, SE, SW — rotates the isometric building |
| Scroll / pinch | Zoom the isometric SVG viewBox |
| Drag on empty area | Pan |
| Click on building face | Jump to that Area in 2D mode |
| Click on panel | Select it (shows info tooltip) |
| Toggle "Show panels" | Hide/show all panels for a cleaner building view |
| Toggle "Show shadows" | Show/hide computed shadow polygons |
| Export SVG button | Download the current isometric view as a vector file |

Viewpoint rotation is implemented by swapping the `buildingFaceTransform` sign of axes — no matrix library needed.

### 9.8 Sun Position & Shadow Overlay

Sun azimuth and elevation are computed from `solarPosition(lat, lon, dateTime)` (a pure function, already planned in `ELECTRICAL-PHYSICS.md`).  
Shadow computation is **2D polygon projection** — not raytracing:

```typescript
// src/canvas3d/shadowPolygon.ts

export function computeShadowPolygon(
  obstacle: { vertices3D: World3D[]; height: number },
  sunAzimuth_deg: number,
  sunElevation_deg: number,
  scale: number
): IsoPoint[] {
  // Project each obstacle top vertex along sun direction to ground plane
  const sunDx = Math.cos((sunAzimuth_deg * Math.PI) / 180);
  const sunDy = Math.sin((sunAzimuth_deg * Math.PI) / 180);
  const shadowLength = obstacle.height / Math.tan((sunElevation_deg * Math.PI) / 180);
  return obstacle.vertices3D.map(v =>
    toIso({ x: v.x + sunDx * shadowLength, y: v.y + sunDy * shadowLength, z: 0 }, scale)
  );
}
```

Shadow polygons are rendered as semi-transparent dark SVG polygons under the panels layer. Panels that intersect a shadow polygon are tinted amber as a visual warning.

### 9.9 Quality Bar — What "Excellent" Means

The isometric view is considered production-quality when:

- [ ] All roof types (flat, gable, hip, shed, mansard) render correctly with their panels
- [ ] Shadow polygons appear for chimneys, dormers, and adjacent roof edges
- [ ] Shaded panels are highlighted amber with a tooltip showing estimated power loss
- [ ] Four viewpoint presets (NE/NW/SE/SW) animate smoothly (CSS transition, 200 ms)
- [ ] The view can be exported as a clean, label-annotated SVG suitable for a permit submission
- [ ] Clicking any panel in isometric view jumps to 2D mode with that panel selected
- [ ] The building outline, panels, labels, and north arrow are all legible at A4 print size
- [ ] Screen reader receives a structural summary via `aria-description` on the `<svg>` element

---

## 10 · No WebGL / No Three.js — By Design

> **This section documents the deliberate architectural decision not to use Three.js or any WebGL-based renderer.**

### 10.1 Why Not Three.js

| Problem | Detail |
|---------|--------|
| **Bundle size** | `three` alone is ~600 KB minified. With `@react-three/fiber` + `@react-three/drei` + loaders the chunk easily exceeds 1 MB. This violates the "keep bundle small" project rule. |
| **Visual quality** | A WebGL panel grid with default PBR materials looks plastic and toy-like. The SVG isometric view looks sharper, renders text crisply at any zoom, and can be styled with the same Tailwind tokens used everywhere else. |
| **Accessibility** | A `<canvas>` element is a black box to screen readers. SVG elements carry semantic roles, aria-labels, and keyboard focus — all for free. |
| **Complexity** | Maintaining a React + Three.js + R3F + Drei stack adds enormous surface area for bugs, version conflicts, and build-pipeline complications — for a feature that SVG already covers. |
| **Portability** | SVG exports directly to a vector file. A Three.js scene requires a glTF pipeline and a server-side or client-side renderer to produce a printable document. |
| **"Fake 3D" is fine** | A solar planner doesn't need a physically-based ray-tracing renderer. It needs a clear, unambiguous visualisation of tilt, azimuth, and panel layout — all achievable with isometric SVG. |

### 10.2 Future Consideration Gate

WebGL / Three.js **will not be added** until all of the following are true:

1. The SVG isometric view has been shipped and used in production for ≥ 3 months
2. A real user need exists that SVG provably cannot meet (e.g., realistic shading simulation with thousands of scan lines)
3. The additional capability justifies a permanent ~1 MB increase in bundle size
4. A dedicated contributor volunteers to maintain the 3D stack long-term

If all four gates are met, evaluate **CesiumJS** (for site/terrain) or a **custom WebGL shadow-volume renderer** — not a general-purpose scene graph like Three.js.

---

## 11 · Accessibility & Input Device Support

### 11.1 Keyboard Navigation (full)

| Action | Shortcut |
|--------|---------|
| Select all | Ctrl+A |
| Deselect | Escape |
| Delete selected | Delete / Backspace |
| Duplicate | Ctrl+D |
| Copy | Ctrl+C |
| Paste | Ctrl+V |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y / Ctrl+Shift+Z |
| Nudge 1 cm | Arrow keys |
| Nudge 10 cm | Shift+Arrow |
| Rotate 90° | R |
| Rotate -90° | Shift+R |
| Toggle snap | S |
| Toggle grid mode / free mode | G |
| Toggle 2D plan / Isometric | I |
| Help overlay | ? |
| Fit to window | F |
| Zoom in / out | + / - |
| 100 % zoom | 0 |

### 11.2 Touch Support

| Gesture | Action |
|---------|--------|
| Single tap on empty area (place tool) | Place panel |
| Single tap on panel | Select |
| Tap + hold on panel | Open context menu |
| Drag panel | Move |
| Two-finger drag | Pan |
| Pinch | Zoom |
| Three-finger swipe left/right | Switch area (in single-area mode) |
| Long-press rotation handle | Enter rotation mode |

### 11.3 Screen Reader Support

Each panel SVG element gets:
```tsx
<rect
  role="button"
  aria-label={`Panel ${panel.id}, ${panel.power_W}W, position ${panel.x}×${panel.y} cm`}
  aria-pressed={selected}
  tabIndex={0}
  onKeyDown={handleKeyDown}
/>
```

Grid layout announces total via a live region:
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {totalPanels} panels · {(totalPower_W / 1000).toFixed(2)} kWp
</div>
```

---

## 12 · Performance Targets

| Scenario | Target | Approach |
|----------|--------|----------|
| Render 500 panels, grid mode | < 16 ms / frame | SVG, no re-renders on pan |
| Render 500 panels, free mode | < 16 ms / frame | SVG, keyed by id |
| Pan / zoom gesture | < 10 ms | SVG viewBox only — no React re-render |
| Drag single panel | < 10 ms | Local state in `dragRef`, single panel updates |
| Drag 50 panels simultaneously | < 33 ms | Batch `MOVE_FREE_PANELS` action, one render |
| Project load (50 areas × 50 panels) | < 100 ms | JSON parse + one reducer pass |
| Undo / redo | < 10 ms | Shallow-clone `Project` (structural sharing) |
| Isometric render (250 panels) | < 32 ms | SVG polygon, no layout thrash |
| Isometric viewpoint switch (NE→SW) | < 200 ms | CSS transition on `<svg>` transform |

**Profiling tool**: `window.__OSP_PERF = true` → enables `performance.measure()` markers visible in browser DevTools timeline.

---

## 13 · Testing Strategy

### 13.1 Unit Tests (pure functions)

| Function | Test cases |
|----------|-----------|
| `calculateGridLayout` | 0×0 area, exclusion zone covers full area, polygon outline (L-shape), floating point gaps |
| `pointInPolygon` | Concave polygon, point on edge, degenerate polygon |
| `snapToGrid` | Snap enabled/disabled, sub-pixel values |
| `rotatedBoundingBox` | 0°, 90°, 45°, 180° |
| `toIso` | Origin, positive x/y/z, negative z (below ground) |
| `rectToIsoPolygon` | Flat face, 30° tilt, 45° tilt |
| `computeShadowPolygon` | Sun at zenith (no shadow), low sun, sun below horizon (no shadow) |
| `projectReducer` | Each action type, undo stack depth, redo-after-new-action clears future |

### 13.2 Component Tests (`@testing-library/react`)

| Component | Test cases |
|-----------|-----------|
| `AreaCanvas` | Renders correct number of panels in grid mode; exclusion zone reduces count |
| `FreePanelRenderer` | Panel appears after `ADD_FREE_PANEL`; disappears after `DELETE_FREE_PANELS` |
| `AreaManager` | Add area button creates area; delete area removes it and updates totals |
| `ViewportController` | Wheel event changes zoom; pan stays within bounds |

### 13.3 Accessibility Tests

- `axe-core` integration in `App.test.tsx` — zero violations required
- Keyboard-only walkthrough test: place panel, move it, delete it, undo

---

## 14 · Implementation Phases (Reference to `SPRINT-PLAN.md`)

| Sprint | Canvas Engine Milestone |
|--------|------------------------|
| **S1** | `calculateGridLayout()` extracted to `src/canvas/calculateGridLayout.ts`; polygon support added; existing tests updated |
| **S2** | `projectReducer.ts` + undo history wired; `useProject` context replaces App state |
| **S3** | SVG canvas renderer replaces `<div>` renderer; zoom + pan via `viewBox` |
| **S4** | Free mode refactored to use new SVG renderer + `useAreaInteraction` |
| **S5** | `AreaManager` sidebar + multi-area state; area tabs |
| **S6** | Grid offset drag handle; cell-level exclusion toggle; polygon outline tool |
| **S7** | Multi-select (box select, Shift+Click); copy/paste; keyboard nudge |
| **S8** | String group colour overlay + MPPT assignment UI |
| **S9** | Isometric view v1 — flat roof + gable; NE/SW viewpoints; panel polygons; SVG export |
| **S10** | Isometric view v2 — hip/shed/mansard roofs; façade + ground faces; shadows; shaded-panel amber tint |
| **S11** | Isometric view v3 — viewpoint animation; sun-time slider; click-panel-to-2D; print layout |
| *(future)* | If §10.2 gates are met: evaluate alternative advanced visualisation approach |

---

*Last updated: April 2026 — Open Solar Planer contributors*
