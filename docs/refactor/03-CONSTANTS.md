# Task: Move PRESETS to `src/constants/`

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 3 of 8 — requires Phase 1 (types) to be complete

---

## Goal

Move the `PRESETS` constant array out of `src/layout.ts` and into a dedicated `src/constants/presets.ts` file. This separates data from logic and makes it easy to extend or replace preset data without touching the utility functions.

---

## Acceptance Criteria

- [ ] AC1: `src/constants/presets.ts` exists and exports `PRESETS` as `readonly PanelPreset[]`
- [ ] AC2: `src/constants/index.ts` barrel-exports `PRESETS`
- [ ] AC3: `src/layout.ts` re-exports `PRESETS` from `src/constants/presets.ts` (backward compat)
- [ ] AC4: `src/App.tsx` imports `PRESETS` from `src/constants` (not `src/layout`)
- [ ] AC5: `npm run build`, `npm test`, `npm run lint` all pass without changes to `src/test/layout.test.ts`

---

## Files to Create / Change

### `src/constants/presets.ts` — **Create**

```typescript
import type { PanelPreset } from '../types';

export const PRESETS: readonly PanelPreset[] = [
  { id: 'standard', name: 'Standard Modul (ca. 400W)', width: 113, length: 172, power: 400 },
  { id: 'xl',       name: 'XL Modul (ca. 500W)',       width: 113, length: 209, power: 500 },
  { id: 'bkw',      name: 'Balkonkraftwerk (Kompakt)', width: 100, length: 165, power: 300 },
  { id: 'custom',   name: 'Benutzerdefiniert...',       width: 100, length: 170, power: 350 },
] as const;
```

> **Note:** Use `readonly PanelPreset[]` (not `PanelPreset[]`) to prevent accidental mutation. The `as const` assertion provides the narrowest possible type at the call site.

### `src/constants/index.ts` — **Create**

```typescript
export { PRESETS } from './presets';
```

### `src/layout.ts` — **Update**

Add:
```typescript
export { PRESETS } from './constants/presets';
```

Remove the inline `PRESETS` array definition (it is now in `src/constants/presets.ts`).

### `src/App.tsx` — **Update**

```typescript
// Before:
import { PRESETS, calculateLayout, panelOverlapsZone } from './layout';

// After:
import { PRESETS } from './constants';
import { calculateLayout, panelOverlapsZone } from './utils';
```

---

## Edge Cases

- EC1: `PRESETS.find(p => p.id === presetId)` — the `readonly` modifier does not affect `.find()`. No call-site changes needed.
- EC2: The `'custom'` preset is included in PRESETS and is intentionally the last entry. The UI preset selector renders all entries including custom. Do not change order.
- EC3: Any future code adding a preset must update `src/constants/presets.ts` only — not `layout.ts` or `App.tsx`.

---

## New Tests to Write

None for this phase — the existing `PRESETS` tests in `src/test/layout.test.ts` cover this constant and must continue to pass without modification.

---

## Commit Message

```
refactor: move PRESETS constant to src/constants/presets.ts
```

---

## Notes / Risks

- `src/test/layout.test.ts` imports `PRESETS` from `'../layout'`. The re-export in `src/layout.ts` must be kept.
- Marking `PRESETS` as `readonly` is a tightening of the type — check that no code currently mutates the array (none does in `App.tsx`, but verify).
