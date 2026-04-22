# Canvas Engine — Deep Technical Plan

> **Priority: HIGHEST NEXT STEP** — This document specifies the complete design for the multi-area 2D + 3D graphical solar panel planner.  
> Everything in this file feeds directly into `SPRINT-PLAN.md` Sprints 11–23 and must be implemented before any cost/BOM or 3D scene work.

---

## 0 · Why This Matters

The current canvas is a **single-area, single-panel-size** renderer hardcoded into `App.tsx`.  
A real solar installation has:

- **Multiple mounting surfaces** (main roof, garage, shed, south façade, carport, ground mount)
- **Different panel models per surface** (larger panels on the main roof, smaller on the shed)
- **Mixed layout modes per surface** (grid auto-fill on the main roof, free placement on a complex L-shaped surface)
- **Individual panel rotation** (landscape on one row, portrait on the next)
- **3D context** so the user can sanity-check tilt, shading, and orientation visually

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
│  Mode C: 3D Isometric (Phase 4)             │
│  Areas mapped to building faces.            │
│  Tilt + azimuth encoded geometrically.      │
└─────────────────────────────────────────────┘
```

The user switches mode via a toolbar toggle. Only one mode is active at a time.

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

## 9 · 3D Isometric View (Phase 4 — CSS/SVG)

### 9.1 Why Isometric Before Three.js

An isometric SVG view can be built with zero new dependencies.  
It gives users the 3D mental model without the bundle cost of Three.js (~500 KB gzipped).  
Three.js is added in Phase 6 once users need true orbit camera and shadows.

### 9.2 Isometric Transform

Standard 2:1 isometric projection:

```
ISO_X = (world_x - world_y) * cos(30°)   = (world_x - world_y) * 0.866
ISO_Y = (world_x + world_y) * sin(30°) - world_z * 1   = (world_x + world_y) * 0.5 - world_z
```

Where `world_z` is the height above the base plane in cm.

```typescript
export interface IsoPoint { x: number; y: number; }
export interface World3D   { x: number; y: number; z: number; }

export function toIso(p: World3D): IsoPoint {
  return {
    x: (p.x - p.y) * Math.cos(Math.PI / 6),
    y: (p.x + p.y) * Math.sin(Math.PI / 6) - p.z,
  };
}
```

### 9.3 Building Model from Areas

Each `Area` maps to a face on the isometric building:

| Area surfaceType | Building face |
|-----------------|--------------|
| `flat-roof` | Top face |
| `pitched-roof` | Sloped face (left or right of ridge) |
| `facade` | Front, rear, or side wall face |
| `ground` | Ground-level rectangle in front of building |

The user enters building footprint (W × D cm) and wall height (H cm) in a "3D Building" settings panel.  
The app procedurally generates the 3 visible faces (top, right, front) as isometric SVG polygons, then overlays each Area's panel layout using the isometric transform.

### 9.4 Panel Rendering in Isometric View

Each panel in an area is transformed:
1. Start with panel `(x, y)` in Area local space (cm)
2. Map to building face local 3D coordinates (applying tilt and azimuth)
3. Apply `toIso()` transform
4. Render as SVG polygon

```typescript
export function panelToIsoPolygon(
  panel: { x: number; y: number; width: number; height: number },
  buildingFaceTransform: (localX: number, localY: number) => World3D
): IsoPoint[] {
  const corners = [
    { x: panel.x,              y: panel.y               },
    { x: panel.x + panel.width, y: panel.y               },
    { x: panel.x + panel.width, y: panel.y + panel.height },
    { x: panel.x,              y: panel.y + panel.height },
  ];
  return corners.map(c => toIso(buildingFaceTransform(c.x, c.y)));
}
```

### 9.5 Isometric View Features (Phase 4)

| Feature | Notes |
|---------|-------|
| Toggle 2D ↔ 3D view | Single button in toolbar |
| Sun position overlay | Arrow showing sun direction at selected date/time |
| Cast shadow preview | Simple 2D shadow polygon per obstacle, no raytracing |
| Area labels | Float above each face |
| Panel count + kWp per face | Show on each face in 3D |
| Export isometric as SVG | For documentation / permit submissions |
| Rotate building | Three azimuth presets: NE view, SE view, SW view |

---

## 10 · 3D Scene Editor (Phase 6 — Three.js)

*Detailed spec in `SPRINT-PLAN.md` Sprints 28–30. Summary here for context:*

### 10.1 Technology

- **`three`** + **`@react-three/fiber`** + **`@react-three/drei`**
- Loaded as a **dynamic import** (`React.lazy + Suspense`) — only downloaded when user clicks "Open 3D View"
- Target bundle size for 3D chunk: < 350 KB gzipped (tree-shaken Three.js)

### 10.2 Feature Parity with 2D

The 3D scene is a **viewer + light editor**, not a replacement for 2D placement.  
Users place panels in 2D and see them in 3D.

| Capability | 2D Canvas | 3D Scene |
|-----------|-----------|---------|
| Place panels | ✅ Primary workflow | ❌ |
| Move panels | ✅ | ❌ |
| Draw exclusion zones | ✅ | ❌ |
| View layout | ✅ | ✅ |
| Visualise tilt + azimuth | ⚠️ (iso only) | ✅ |
| Real-time shadow | ❌ | ✅ |
| String colour highlighting | ✅ | ✅ |
| Sun position slider | ❌ | ✅ |
| Export | SVG / PNG | glTF / PNG |

### 10.3 Panel Geometry in Three.js

Each panel = a `THREE.BoxGeometry(width, thickness, height)` — 2 cm thick.  
Panel face material = `THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 })`.  
Panel back = grey.  
Cell grid texture (optional) = a canvas-generated texture with panel cell lines.

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
| Toggle 2D / 3D view | 3 |
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
| 3D isometric render (250 panels) | < 32 ms | SVG transform, no layout thrash |
| Three.js initial load | < 2 s on 4G | Dynamic import, lazy chunk |

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
| `toIso` | Origin, positive x/y/z, negative values |
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
| **S9** | Isometric view (CSS/SVG, no Three.js dependency) |
| **S10** | Three.js 3D scene (lazy-loaded), orbit controls, sun position |

---

*Last updated: April 2026 — Open Solar Planer contributors*
