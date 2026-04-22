# Task: Rewrite App.tsx as Thin Provider Shell

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 7 of 8 — requires Phases 1–6 to be complete

---

## Goal

Replace the current monolithic `App.tsx` (~800 lines) with a thin Provider shell that:
1. Wraps the app in all Context store Providers
2. Renders the top-level layout grid
3. Contains **zero** business logic and **zero** state

After this phase `App.tsx` should be under 60 lines.

---

## Final `src/App.tsx`

```tsx
import {
  RoofProvider,
  PanelProvider,
  GapProvider,
  FreePlacementProvider,
  ModeProvider,
  CanvasProvider,
} from './stores';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatsBar } from './components/StatsBar/StatsBar';
import { MobileStatsBar } from './components/StatsBar/MobileStatsBar';
import { CanvasArea } from './components/Canvas/CanvasArea';
import { MobileNav } from './components/MobileNav/MobileNav';
import { useKeyboardDelete } from './hooks/useKeyboardDelete';
import { useModeStore } from './stores/ModeStore';

/** Inner layout — rendered inside all Providers */
function PlannerLayout() {
  useKeyboardDelete();
  const { mobileTab } = useModeStore();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800">
      {mobileTab === 'settings' && <MobileStatsBar />}
      <Sidebar />
      <div className={`flex-1 flex flex-col relative bg-slate-200 ${mobileTab !== 'canvas' ? 'hidden md:flex' : ''}`}>
        <StatsBar />
        <CanvasArea />
      </div>
      <MobileNav />
    </div>
  );
}

/** Root — wraps layout in all store Providers */
export default function App() {
  return (
    <RoofProvider>
      <PanelProvider>
        <GapProvider>
          <FreePlacementProvider>
            <ModeProvider>
              <CanvasProvider>
                <PlannerLayout />
              </CanvasProvider>
            </ModeProvider>
          </FreePlacementProvider>
        </GapProvider>
      </PanelProvider>
    </RoofProvider>
  );
}
```

---

## Acceptance Criteria

- [ ] AC1: `src/App.tsx` is ≤ 60 lines
- [ ] AC2: `src/App.tsx` contains no `useState`, `useReducer`, `useMemo`, `useCallback`, `useRef`, or `useEffect` calls
- [ ] AC3: All six store Providers wrap `PlannerLayout`
- [ ] AC4: `useKeyboardDelete` is called in `PlannerLayout` (requires Provider context to be active)
- [ ] AC5: `npm run build` passes with zero TypeScript errors
- [ ] AC6: `npm test` — all existing tests pass (especially `src/test/App.test.tsx`)
- [ ] AC7: `npm run lint` passes

---

## Edge Cases

- EC1: `useKeyboardDelete` must be called **inside** the Provider tree (inside `PlannerLayout`, not in `App`). If called in `App` it will be outside the `FreePlacementProvider` context and throw.
- EC2: Provider nesting order does not matter since stores are independent. However, keep the order consistent for readability (outermost = RoofProvider).
- EC3: `src/test/App.test.tsx` wraps the component in `<MemoryRouter>` but does **not** wrap in store Providers — the Providers are now inside `App` itself, so this is fine. No changes to test file.
- EC4: `mobileTab` is read from `ModeStore` in `PlannerLayout`. The `ModeProvider` must therefore be an ancestor of `PlannerLayout`. In the Provider nesting above it is, so this is correct.

---

## Files to Change

| File | Change |
|------|--------|
| `src/App.tsx` | **Replace** entire content with the thin shell shown above |

No other files change in this phase.

---

## Commit Message

```
refactor: rewrite App.tsx as thin Provider shell (~50 lines)
```

---

## Notes / Risks

- This is the final structural change. After this phase the old monolithic code is fully replaced.
- Run `npm test` **immediately** after this change and fix any failures before proceeding to Phase 8.
- If any integration test fails, compare the `data-testid` attributes in the new component tree against those expected by `App.test.tsx` (listed in `00-OVERVIEW.md`).
