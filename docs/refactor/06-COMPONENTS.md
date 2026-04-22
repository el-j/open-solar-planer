# Task: Decompose App.tsx into Logic-Less Components

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 6 of 8 — requires Phases 1–5 to be complete

---

## Goal

Break the monolithic `App.tsx` rendering tree into small, single-responsibility components under `src/components/`. Each component:
- Reads data from stores via consumer hooks or receives minimal props
- Calls hook actions (never `useState` directly)
- Contains **zero** business logic — all logic lives in utils or hooks

---

## Component Tree

```
App (Provider shell — see Phase 7)
└── AppLayout (flex container)
    ├── MobileStatsBar           [mobile only, settings tab]
    ├── Sidebar
    │   ├── AppHeader
    │   ├── RoofSection
    │   ├── PanelPresetSection
    │   ├── GapSection            [grid mode only]
    │   ├── FreePanelEditor       [free mode + panel selected]
    │   └── ExclusionZoneEditor   [free mode + zone selected]
    ├── MainView
    │   ├── StatsBar
    │   │   ├── PanelCount
    │   │   ├── PowerOutput
    │   │   ├── GridDimensions    [grid mode only]
    │   │   ├── ModeToggle
    │   │   └── ToolToggle        [free mode only]
    │   └── CanvasArea
    │       ├── GridRenderer      [grid mode]
    │       ├── FreePlacementRenderer  [free mode]
    │       │   ├── ExclusionZoneRenderer
    │       │   └── FreePanelRenderer
    │       └── EmptyStateOverlay
    └── MobileNav
```

---

## Files to Create

### `src/components/Sidebar/AppHeader.tsx`

Reads: nothing from stores (static content).  
Renders: app title, GitHub link, About link.

```typescript
// Props: none
// Uses: Link (react-router-dom), lucide icons
```

---

### `src/components/Sidebar/RoofSection.tsx`

Reads: `useRoofStore`, `useCanvasStore` (bgImage).  
Actions: `setRoofWidth`, `setRoofHeight`, `setBgImage` (via `useImageUpload` hook).

```typescript
// No props needed — all data from stores/hooks
```

Key elements to render:
- `<input type="number" aria-label="Roof width in cm">`  
- `<input type="number" aria-label="Roof height in cm">`  
- File upload `<input type="file" aria-label="Upload background image">`  
- "Remove image" button (conditional)

---

### `src/components/Sidebar/PanelPresetSection.tsx`

Reads: `usePanelStore`.  
Actions: `applyPreset`, `setPanelWidth`, `setPanelLength`, `setPanelPower`, `toggleOrientation`, `markCustom`.

Key elements:
- `<select aria-label="Panel preset">` (renders PRESETS from `src/constants`)  
- Width / Length / Power `<input type="number">` fields  
- Orientation toggle `<button aria-label="Switch to landscape/portrait orientation">`

---

### `src/components/Sidebar/GapSection.tsx`

Reads: `useGapStore`, `useModeStore` (renders only in grid mode).  
Actions: `setGapX`, `setGapY`.

---

### `src/components/Sidebar/FreePanelEditor.tsx`

Reads: `useFreePlacementStore` (selected panel data), `useModeStore`.  
Actions: `updatePanel`, `deleteSelected`.  
Renders only when `mode === 'free'` and a panel is selected.

Key elements:
- `data-testid="selected-panel-width"` on width input  
- `data-testid="selected-panel-delete"` on delete button  
- `aria-label="Delete selected panel"` on delete button

---

### `src/components/Sidebar/ExclusionZoneEditor.tsx`

Reads: `useFreePlacementStore` (selected zone data), `useModeStore`.  
Actions: `updateZone`, `deleteSelected`.  
Renders only when `mode === 'free'` and a zone is selected.

---

### `src/components/Sidebar/Sidebar.tsx`

Reads: `useModeStore` (mobileTab).  
Renders: the sidebar panel wrapper + all sidebar section components.

```typescript
// No business logic — just structural layout + conditional rendering
// Hidden on mobile when mobileTab !== 'settings'
```

---

### `src/components/StatsBar/StatsBar.tsx`

Reads: `useModeStore`, `useFreePlacementStore` (free panel count + power), `useLayout` hook.  
Renders: panels count, power, grid dimensions, mode toggle, tool toggle.

Key `data-testid` attributes that must be preserved:
- `data-testid="total-panels"` on the panel count element
- `data-testid="total-power"` on the power output element  
- `data-testid="layout-grid"` on the grid dimensions element

Uses `formatPower` from `src/utils/formatPower.ts` for the kWp display.

---

### `src/components/StatsBar/MobileStatsBar.tsx`

Reads: same as `StatsBar` but condensed.  
Renders only when `mobileTab === 'settings'`.

---

### `src/components/ModeControls/ModeToggle.tsx`

Reads: `useModeStore`.  
Actions: `setMode`.

Key attributes:
- `data-testid="mode-toggle"` on the Grid button
- `aria-label="Switch to grid mode"` on Grid button
- `aria-label="Switch to free placement mode"` on Frei button

---

### `src/components/ModeControls/ToolToggle.tsx`

Reads: `useModeStore` (activeTool).  
Actions: `toggleActiveTool`.

Key attributes:
- `data-testid="tool-draw-zone"` on the Sperrzone button
- `aria-label="Draw exclusion zone"`

---

### `src/components/Canvas/GridRenderer.tsx`

Reads: `useLayout` hook, `usePanelStore` (panelPower), `useScaleFactor` hook, `useGapStore`.

Renders the grid of panels. Each panel div:
- `data-testid="panel"`
- inline `width`/`height` from `layout.effectivePanelWidth/Height * scaleFactor`

No event handlers needed (grid panels are not interactive).

---

### `src/components/Canvas/ExclusionZoneRenderer.tsx`

Reads: `useFreePlacementStore` (exclusionZones, selectedId), `useScaleFactor`.  
Actions: `setSelectedId`.

Each zone:
- `data-testid="exclusion-zone"`
- Conditionally shows label

---

### `src/components/Canvas/FreePanelRenderer.tsx`

Reads: `useFreePlacementStore` (freePanels, selectedId, exclusionZones), `useScaleFactor`, `useDragHandlers` hook.

Each panel:
- `data-testid="free-panel"`
- Calls `handlePanelPointerDown` from `useDragHandlers`
- Uses `panelOverlapsZone` from utils to compute overlap state

---

### `src/components/Canvas/EmptyStateOverlay.tsx`

Reads: `useModeStore`, `useLayout` hook, `useFreePlacementStore`.

Renders:
1. Grid mode + `totalPanels === 0` → "Fläche zu klein" overlay
2. Free mode + no panels + no zones → "Freie Platzierung" hint

---

### `src/components/Canvas/CanvasArea.tsx`

Reads: `useCanvasStore` (bgImage, containerSize), `useModeStore`, `useScaleFactor`, `useRoofStore`.  
Hooks: `useContainerResize(containerRef)`, `useDragHandlers(canvasRef)`.  
Renders: the outer container `div` (with `containerRef`) and the inner canvas `div` (with `canvasRef`).

```typescript
// data-testid="canvas" must be on the inner canvas div
```

Pointer event wiring:
```typescript
onPointerDown={mode === 'free' ? handleCanvasPointerDown : undefined}
onPointerMove={mode === 'free' ? handleCanvasPointerMove : undefined}
onPointerUp={mode === 'free' ? handleCanvasPointerUp : undefined}
```

> ⚠️ **Mobile Sperrzone fix:** Before implementing this component, check what `copilot/bugfix-mobile-drawing-sperrzonen` added to the canvas element (see Phase 5 / `useDragHandlers` notes). In particular:
> - If the fix added `style={{ touchAction: 'none' }}` to the canvas div, include it here
> - If the fix added `onPointerCancel` handler, wire it here as well

Children (rendered inside the canvas div):
- `<GridRenderer />` (when `mode === 'grid'`)
- `<ExclusionZoneRenderer />` (when `mode === 'free'`)
- `<FreePanelRenderer />` (when `mode === 'free'`)
- `<EmptyStateOverlay />`

---

### `src/components/MobileNav/MobileNav.tsx`

Reads: `useModeStore` (mobileTab).  
Actions: `setMobileTab`.

Key attributes:
- `role="tablist"` on container
- `data-testid="mobile-tab-canvas"` on Vorschau button
- `data-testid="mobile-tab-settings"` on Einstellungen button

---

## Acceptance Criteria

- [ ] AC1: Every component listed exists as a `.tsx` file in the path shown
- [ ] AC2: No component uses `useState` — all state comes from store hooks
- [ ] AC3: No component contains business logic — pure rendering + event delegation to stores/hooks
- [ ] AC4: All existing `data-testid` and `aria-label` attributes are preserved (see invariants in `00-OVERVIEW.md`)
- [ ] AC5: `npm run build` passes; `npm test` passes; `npm run lint` passes

---

## Edge Cases

- EC1: `StatsBar` computes `freeTotalPower` inline — extract this derived value from `useFreePlacementStore` (add a `freeTotalPower` selector or compute via `useMemo` in the `StatsBar` component using `freePanels.reduce(...)`). The latter is acceptable since it is view-layer aggregation, not business logic.
- EC2: `FreePanelRenderer` calls `panelOverlapsZone` per panel — this is a pure util call in the render path, which is fine. No hook needed.
- EC3: `CanvasArea` holds two refs (`containerRef`, `canvasRef`) with `useRef`. These refs are local to `CanvasArea` and passed to hooks. Do **not** put refs into Context or stores.
- EC4: `PanelPresetSection` renders the PRESETS array. Import from `src/constants`, not from `src/layout`.

---

## Commit Message

```
refactor: decompose App.tsx into logic-less components in src/components/
```

---

## Notes / Risks

- Components must be `.tsx` (they contain JSX).
- Keep components co-located by feature — `Sidebar/`, `Canvas/`, `StatsBar/`, `ModeControls/`, `MobileNav/`.
- Do not create an `index.ts` barrel for `src/components/` — individual imports from feature folders are explicit and IDE-friendly.
- `CanvasArea` is the most complex component. Take extra care to wire the `canvasRef` correctly into `useDragHandlers` — the ref must point to the **inner** canvas div (not the outer container), same as in the current `App.tsx`.
