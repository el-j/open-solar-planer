# Task: Create Context-Based Stores in `src/stores/`

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 4 of 8 — requires Phases 1–3 to be complete

---

## Goal

Decompose the monolithic state in `App.tsx` into small, single-responsibility React Context stores. Each store owns one concern. Components and hooks will consume only the stores they need — avoiding prop drilling while keeping the bundle free of external state-management dependencies.

---

## Pattern (apply to every store)

```typescript
// Typed state
type XState = { … };

// Typed actions
type XActions = { … };

// Single context value = state + actions
type XContextValue = XState & XActions;

// Context (undefined default catches missing Provider)
const XContext = createContext<XContextValue | undefined>(undefined);

// Provider component
export function XProvider({ children }: { children: React.ReactNode }) {
  // …useState / useReducer…
  return <XContext.Provider value={…}>{children}</XContext.Provider>;
}

// Consumer hook (throws if used outside Provider)
export function useXStore(): XContextValue {
  const ctx = useContext(XContext);
  if (ctx === undefined) throw new Error('useXStore must be used within XProvider');
  return ctx;
}
```

---

## Stores to Create

### `src/stores/RoofStore.tsx`

**State:**
```typescript
type RoofState = {
  roofWidth: number;   // cm, default 500
  roofHeight: number;  // cm, default 300
};
```

**Actions:**
```typescript
type RoofActions = {
  setRoofWidth: (v: number) => void;
  setRoofHeight: (v: number) => void;
};
```

---

### `src/stores/PanelStore.tsx`

**State:**
```typescript
type PanelState = {
  selectedPreset: string;    // default 'standard'
  panelWidth: number;        // cm, default 113
  panelLength: number;       // cm, default 172
  panelPower: number;        // Wp, default 400
  isLandscape: boolean;      // default false
};
```

**Actions:**
```typescript
type PanelActions = {
  setSelectedPreset: (id: string) => void;
  setPanelWidth: (v: number) => void;
  setPanelLength: (v: number) => void;
  setPanelPower: (v: number) => void;
  toggleOrientation: () => void;
  /**
   * Apply a preset (by ID). If the ID is 'custom', only sets selectedPreset.
   * Otherwise updates all panel fields from the matching PRESETS entry.
   */
  applyPreset: (presetId: string) => void;
  /** Switch selectedPreset to 'custom' without changing dimensions. */
  markCustom: () => void;
};
```

> `applyPreset` encapsulates the `handlePresetChange` logic from App.tsx. It calls `PRESETS.find(...)` internally using the `PRESETS` constant from `src/constants`.

---

### `src/stores/GapStore.tsx`

**State:**
```typescript
type GapState = {
  gapX: number;   // cm, default 2
  gapY: number;   // cm, default 2
};
```

**Actions:**
```typescript
type GapActions = {
  setGapX: (v: number) => void;
  setGapY: (v: number) => void;
};
```

---

### `src/stores/FreePlacementStore.tsx`

**State:**
```typescript
import type { FreePanel, ExclusionZone } from '../types';

type FreePlacementState = {
  freePanels: FreePanel[];
  exclusionZones: ExclusionZone[];
  selectedId: string | null;
};
```

**Actions:**
```typescript
type FreePlacementActions = {
  addPanel: (panel: FreePanel) => void;
  updatePanel: (id: string, patch: Partial<Omit<FreePanel, 'id'>>) => void;
  removePanel: (id: string) => void;
  addZone: (zone: ExclusionZone) => void;
  updateZone: (id: string, patch: Partial<Omit<ExclusionZone, 'id'>>) => void;
  removeZone: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  deleteSelected: () => void;   // removes whichever of panel/zone has selectedId
};
```

> `deleteSelected` encapsulates the `handleDeleteSelected` logic from App.tsx.

---

### `src/stores/ModeStore.tsx`

**State:**
```typescript
import type { PlacementMode, ActiveTool, MobileTab } from '../types';

type ModeState = {
  mode: PlacementMode;         // default 'grid'
  activeTool: ActiveTool;      // default 'select'
  mobileTab: MobileTab;        // default 'canvas'
};
```

**Actions:**
```typescript
type ModeActions = {
  setMode: (m: PlacementMode) => void;
  setActiveTool: (t: ActiveTool) => void;
  toggleActiveTool: () => void;   // toggles 'select' ↔ 'draw-zone'
  setMobileTab: (t: MobileTab) => void;
};
```

---

### `src/stores/CanvasStore.tsx`

**State:**
```typescript
type CanvasState = {
  bgImage: string | null;
  containerSize: { width: number; height: number };  // px
};
```

**Actions:**
```typescript
type CanvasActions = {
  setBgImage: (dataUrl: string | null) => void;
  setContainerSize: (size: { width: number; height: number }) => void;
};
```

> `containerRef` and `canvasRef` remain as `useRef` inside the component tree that needs them (`CanvasArea`), since refs are not serialisable state. They do **not** belong in a Context store.

---

### `src/stores/index.ts`

Export all providers and hooks:

```typescript
export { RoofProvider, useRoofStore } from './RoofStore';
export { PanelProvider, usePanelStore } from './PanelStore';
export { GapProvider, useGapStore } from './GapStore';
export { FreePlacementProvider, useFreePlacementStore } from './FreePlacementStore';
export { ModeProvider, useModeStore } from './ModeStore';
export { CanvasProvider, useCanvasStore } from './CanvasStore';
```

---

## Acceptance Criteria

- [ ] AC1: All six store files and `index.ts` exist under `src/stores/`
- [ ] AC2: Every store follows the exact pattern (typed state, typed actions, `createContext<T | undefined>`, guard in consumer hook)
- [ ] AC3: `src/App.tsx` wraps its render tree in all six Providers (see Phase 7)
- [ ] AC4: No store imports from `src/App.tsx` or any component
- [ ] AC5: `npm run build` passes; `npm test` passes; `npm run lint` passes

> **Note:** At the end of this phase `src/App.tsx` still exists in its current form (it hasn't been split yet). You only need to add the Provider wrappers to `App.tsx` so that the stores are available, and verify the app still works. The full decomposition happens in Phase 6.

---

## Edge Cases

- EC1: `applyPreset('custom')` — must only update `selectedPreset` to `'custom'`; must **not** reset `panelWidth/Length/Power` to the custom preset defaults (the user may have typed their own values).
- EC2: `FreePlacementStore.deleteSelected` — if `selectedId` matches neither a panel nor a zone (stale reference), it must handle this gracefully (no-op or clear `selectedId`).
- EC3: `CanvasStore.containerSize` default `{ width: 800, height: 600 }` — must match the current default in `App.tsx` to avoid layout shift on first render.
- EC4: All Providers are independent — they do **not** need to be nested in any specific order, since they don't depend on each other.

---

## Commit Message

```
refactor: add context-based stores in src/stores/
```

---

## Notes / Risks

- Using `createContext<T | undefined>(undefined)` with a guard in the consumer hook is the safest pattern: it provides a clear error message if a component is used outside its Provider.
- Keep stores in `.tsx` files (not `.ts`) because they contain JSX (the Provider component).
- Do not add `React.memo` to providers at this stage — premature optimisation.
- All default values must exactly match those currently in `App.tsx` to prevent any visible behaviour change.
