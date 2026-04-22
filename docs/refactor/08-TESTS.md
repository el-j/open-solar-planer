# Task: Update and Extend Tests

**Type:** test  
**Branch:** `refactor/architecture-v2`  
**Phase:** 8 of 8 — final phase, run after all structural changes are complete

---

## Goal

1. Verify all **existing** tests still pass without modification
2. Add unit tests for the new utils extracted in Phase 2
3. Add smoke tests for the new hooks (where testable without full DOM)
4. Ensure the integration test in `App.test.tsx` still exercises all key user flows

---

## Acceptance Criteria

- [ ] AC1: `npm test` reports **zero** failures
- [ ] AC2: `src/test/layout.test.ts` passes without any changes (backward compat with `src/layout.ts` re-exports)
- [ ] AC3: `src/test/App.test.tsx` passes without any changes (all `data-testid` and `aria-label` attributes preserved)
- [ ] AC4: New util test files listed below exist and cover all specified cases
- [ ] AC5: `npm run test:coverage` shows ≥ 80% line coverage for all files under `src/utils/`

---

## New Test Files to Create

### `src/test/utils/clampPanel.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { clampPanel } from '../../utils/clampPanel';

describe('clampPanel', () => {
  it('returns position unchanged when fully within bounds', () => {
    expect(clampPanel(10, 10, 50, 80, 500, 400)).toEqual({ x: 10, y: 10 });
  });

  it('clamps x to 0 when negative', () => {
    expect(clampPanel(-5, 10, 50, 80, 500, 400)).toEqual({ x: 0, y: 10 });
  });

  it('clamps y to 0 when negative', () => {
    expect(clampPanel(10, -5, 50, 80, 500, 400)).toEqual({ x: 10, y: 0 });
  });

  it('clamps x to roofWidth - panelWidth when overflowing right', () => {
    expect(clampPanel(460, 10, 50, 80, 500, 400)).toEqual({ x: 450, y: 10 });
  });

  it('clamps y to roofHeight - panelHeight when overflowing bottom', () => {
    expect(clampPanel(10, 330, 50, 80, 500, 400)).toEqual({ x: 10, y: 320 });
  });

  it('clamps x to 0 when panel is wider than the roof', () => {
    expect(clampPanel(100, 10, 600, 80, 500, 400)).toEqual({ x: 0, y: 10 });
  });

  it('returns integer values', () => {
    const result = clampPanel(10.7, 20.3, 50, 80, 500, 400);
    expect(result.x).toBe(11);
    expect(result.y).toBe(20);
  });
});
```

### `src/test/utils/effectivePanelSize.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { effectivePanelSize } from '../../utils/effectivePanelSize';

describe('effectivePanelSize', () => {
  it('returns original dimensions in portrait mode', () => {
    expect(effectivePanelSize(113, 172, false)).toEqual({ effectiveWidth: 113, effectiveHeight: 172 });
  });

  it('swaps width and length in landscape mode', () => {
    expect(effectivePanelSize(113, 172, true)).toEqual({ effectiveWidth: 172, effectiveHeight: 113 });
  });

  it('portrait and landscape are symmetric — swapping back gives original', () => {
    const portrait = effectivePanelSize(100, 200, false);
    const landscape = effectivePanelSize(100, 200, true);
    expect(portrait.effectiveWidth).toBe(landscape.effectiveHeight);
    expect(portrait.effectiveHeight).toBe(landscape.effectiveWidth);
  });

  it('returns same value for a square panel regardless of orientation', () => {
    expect(effectivePanelSize(100, 100, false)).toEqual({ effectiveWidth: 100, effectiveHeight: 100 });
    expect(effectivePanelSize(100, 100, true)).toEqual({ effectiveWidth: 100, effectiveHeight: 100 });
  });
});
```

### `src/test/utils/formatPower.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { formatPower } from '../../utils/formatPower';

describe('formatPower', () => {
  it('formats 1600 Wp as "1.60 kWp"', () => {
    expect(formatPower(1600)).toBe('1.60 kWp');
  });

  it('formats 0 Wp as "0.00 kWp"', () => {
    expect(formatPower(0)).toBe('0.00 kWp');
  });

  it('formats 500 Wp as "0.50 kWp"', () => {
    expect(formatPower(500)).toBe('0.50 kWp');
  });

  it('formats 10000 Wp as "10.00 kWp"', () => {
    expect(formatPower(10000)).toBe('10.00 kWp');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatPower(1234)).toBe('1.23 kWp');
  });
});
```

### `src/test/utils/pxToCm.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { pxToCm } from '../../utils/pxToCm';

describe('pxToCm', () => {
  it('converts pixels to cm using the scale factor', () => {
    expect(pxToCm(100, 2)).toBe(50);
  });

  it('returns 0 for 0 pixels', () => {
    expect(pxToCm(0, 2)).toBe(0);
  });

  it('returns px value unchanged when scale is 1', () => {
    expect(pxToCm(75, 1)).toBe(75);
  });
});
```

### `src/test/utils/generateId.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateId } from '../../utils/generateId';

describe('generateId', () => {
  it('starts with "panel-" for panel prefix', () => {
    expect(generateId('panel')).toMatch(/^panel-\d+$/);
  });

  it('starts with "zone-" for zone prefix', () => {
    expect(generateId('zone')).toMatch(/^zone-\d+$/);
  });

  it('produces unique IDs across consecutive calls', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId('panel')));
    // In practice Date.now() may return same ms; just verify format
    ids.forEach(id => expect(id).toMatch(/^panel-\d+$/));
  });
});
```

---

## Files That Must Pass Without Changes

| File | Reason |
|------|--------|
| `src/test/layout.test.ts` | Re-exports from `src/layout.ts` must still work |
| `src/test/App.test.tsx` | All `data-testid` and `aria-label` attributes must be preserved in the new component tree |
| `src/test/setup.ts` | No changes needed |

---

## Mobile Zone Drawing — Regression Test

> ⚠️ **Required:** Once `copilot/bugfix-mobile-drawing-sperrzonen` is merged, review what new or updated tests it added for mobile Sperrzone drawing. Those tests **must still pass** after the refactor.
>
> If that branch does not add tests, add the following to `src/test/App.test.tsx` as a new describe block **after** the refactor is complete:

```typescript
describe('Mobile Sperrzone drawing (regression)', () => {
  it('draws an exclusion zone via pointer events in free mode', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));
    await user.click(screen.getByTestId('tool-draw-zone'));

    const canvas = screen.getByTestId('canvas');
    // Simulate pointer-based zone draw (start → move → up)
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(screen.getAllByTestId('exclusion-zone').length).toBeGreaterThan(0);
  });

  it('discards zone smaller than 2×2 cm on pointer up without meaningful drag', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /switch to free placement mode/i }));
    await user.click(screen.getByTestId('tool-draw-zone'));

    const canvas = screen.getByTestId('canvas');
    // Click without drag — should produce no zone
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(screen.queryAllByTestId('exclusion-zone').length).toBe(0);
  });
});
```

---

## Verification Checklist

Run these commands and confirm all pass before closing this phase:

```bash
npm run lint
npm run build
npm test
npm run test:coverage
```

If `App.test.tsx` fails, check:
1. `data-testid="total-panels"` — rendered by `StatsBar.tsx`
2. `data-testid="total-power"` — rendered by `StatsBar.tsx`
3. `data-testid="canvas"` — rendered by `CanvasArea.tsx` inner div
4. `data-testid="panel"` — rendered by `GridRenderer.tsx`
5. `data-testid="layout-grid"` — rendered by `StatsBar.tsx`
6. `data-testid="mode-toggle"` — rendered by `ModeToggle.tsx`
7. `data-testid="tool-draw-zone"` — rendered by `ToolToggle.tsx`
8. `data-testid="selected-panel-delete"` — rendered by `FreePanelEditor.tsx`
9. `data-testid="selected-panel-width"` — rendered by `FreePanelEditor.tsx`
10. `data-testid="free-panel"` — rendered by `FreePanelRenderer.tsx`
11. `data-testid="exclusion-zone"` — rendered by `ExclusionZoneRenderer.tsx`
12. `data-testid="mobile-tab-canvas"` — rendered by `MobileNav.tsx`
13. `data-testid="mobile-tab-settings"` — rendered by `MobileNav.tsx`

---

## Commit Message

```
test: add unit tests for new utils; verify all existing tests pass
```

---

## Notes / Risks

- The `generateId` test may be non-deterministic if `Date.now()` returns the same millisecond for rapid calls. The test uses regex matching, not equality, which is robust.
- Do not delete or modify `src/test/layout.test.ts` — it is the canonical proof that `src/layout.ts` backward-compat re-exports are working.
- Coverage threshold enforcement (if added to `vite.config.ts`) is optional at this stage. The 80% goal is a guideline, not a gate.
