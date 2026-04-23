# Task: Centralize Types into `src/types/index.ts`

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 1 of 8 — must be completed before any other phase

---

## Goal

Create a single type-spec file `src/types/index.ts` that is the authoritative source of truth for all shared domain types. Update `src/layout.ts` to import from (and re-export via) this new file so existing tests keep passing without modification.

---

## Acceptance Criteria

- [ ] AC1: `src/types/index.ts` exists and exports all types listed in the **Types to define** section below
- [ ] AC2: `src/layout.ts` imports its types from `src/types/index.ts` and re-exports them (backward compat)
- [ ] AC3: `src/App.tsx` imports types from `src/types/index.ts` (not from `src/layout.ts` for types)
- [ ] AC4: `npm run build` passes with zero errors
- [ ] AC5: `npm test` passes — all existing tests unchanged
- [ ] AC6: `npm run lint` passes — no new warnings

---

## Types to Define

```typescript
// src/types/index.ts

/** A panel placed freely on the roof canvas (free-placement mode). */
export type FreePanel = {
  id: string;
  x: number;       // cm from roof left edge
  y: number;       // cm from roof top edge
  width: number;   // cm
  height: number;  // cm
  power: number;   // Wp
};

/** A rectangular zone where no panels may be placed. */
export type ExclusionZone = {
  id: string;
  x: number;       // cm from roof left edge
  y: number;       // cm from roof top edge
  width: number;   // cm
  height: number;  // cm
  label?: string;
};

/** A named panel preset (from the dropdown). */
export type PanelPreset = {
  id: string;
  name: string;
  width: number;   // cm (shorter dimension, portrait)
  length: number;  // cm (longer dimension, portrait)
  power: number;   // Wp
};

/** Result returned by calculateLayout(). */
export type LayoutResult = {
  cols: number;
  rows: number;
  totalPanels: number;
  totalPowerWp: number;
  effectivePanelWidth: number;   // cm — accounts for landscape rotation
  effectivePanelHeight: number;  // cm — accounts for landscape rotation
};

/** Active placement mode. */
export type PlacementMode = 'grid' | 'free';

/** Active drawing tool in free-placement mode. */
export type ActiveTool = 'select' | 'draw-zone';

/** Active mobile tab. */
export type MobileTab = 'canvas' | 'settings';

/** Internal drag-state (stored in a ref to avoid re-renders). */
export type DragState = {
  type: 'panel' | 'zone-draw';
  id?: string;
  startX: number;    // canvas px
  startY: number;    // canvas px
  origX?: number;    // cm (panel original position)
  origY?: number;    // cm (panel original position)
  drawZoneId?: string;
};
```

---

## Edge Cases

- EC1: `DragState` has optional fields — the `id` and `origX/origY` are only set for `type: 'panel'`, and `drawZoneId` only for `type: 'zone-draw'`. The type must express this accurately. Consider using a discriminated union:
  ```typescript
  export type DragState =
    | { type: 'panel'; id: string; startX: number; startY: number; origX: number; origY: number }
    | { type: 'zone-draw'; drawZoneId: string; startX: number; startY: number };
  ```
- EC2: `ExclusionZone.label` is optional — ensure any code that reads it uses optional chaining (`zone.label ?? ''`)
- EC3: Re-exports in `src/layout.ts` must use `export type { ... }` (TypeScript `isolatedModules` compatibility)

---

## Files to Change

| File | Change |
|------|--------|
| `src/types/index.ts` | **Create** — define all types as listed above |
| `src/layout.ts` | Replace inline type definitions with `import type { … } from './types'` and add `export type { … }` re-exports at bottom |
| `src/App.tsx` | Change `import type { FreePanel, ExclusionZone } from './layout'` → `import type { FreePanel, ExclusionZone, DragState, PlacementMode, ActiveTool, MobileTab } from './types'` |

---

## New Tests to Write

None for this phase — it is a pure structural move with no logic changes. Existing tests in `src/test/layout.test.ts` must continue to pass without modification (they import from `'../layout'` which will still export the same types).

---

## Commit Message

```
refactor: centralise all types into src/types/index.ts
```

---

## Notes / Risks

- `src/layout.ts` must keep exporting `FreePanel`, `ExclusionZone`, `PanelPreset`, `LayoutResult` — these are directly imported by `src/test/layout.test.ts`. Do not remove or rename these re-exports.
- Use `export type` (not `export`) for type-only re-exports to stay compatible with `verbatimModuleSyntax`/`isolatedModules`.
- After this phase `src/App.tsx` still uses the old `DragState` as an inline object literal type on the ref — refactor that ref type to use the new `DragState` union type from `src/types/index.ts`.
