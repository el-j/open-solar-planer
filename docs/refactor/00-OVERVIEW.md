# Refactor Overview — Open Solar Planer

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Orchestration order:** Execute phases 01 → 08 in sequence. Each phase is a self-contained task file in this directory.

---

## Problem

`src/App.tsx` (~800 lines) mixes types, state, event handlers, business logic, and rendering into a single component. This makes it hard to test individual concerns, understand data flow, and extend safely.

`src/layout.ts` is already a clean pure-function module but its types are co-located with logic instead of a dedicated type layer.

---

## Target Architecture

```
src/
├── types/
│   └── index.ts                    # Single source of truth for all shared types
├── utils/
│   ├── calculateLayout.ts          # Pure: grid layout computation
│   ├── rectanglesOverlap.ts        # Pure: AABB overlap test
│   ├── panelOverlapsZone.ts        # Pure: panel–zone overlap (uses rectanglesOverlap)
│   ├── clampPanel.ts               # Pure: clamp panel position within roof bounds
│   ├── effectivePanelSize.ts       # Pure: panel w/h accounting for landscape rotation
│   ├── formatPower.ts              # Pure: Wp → "X.XX kWp" string
│   ├── generateId.ts               # Pure: create unique panel/zone IDs
│   └── index.ts                    # Barrel re-export
├── constants/
│   ├── presets.ts                  # PRESETS array (PanelPreset[])
│   └── index.ts
├── stores/                         # React-Context stores — one concern per store
│   ├── RoofStore.tsx               # roofWidth, roofHeight
│   ├── PanelStore.tsx              # panelWidth, panelLength, panelPower, isLandscape, selectedPreset
│   ├── GapStore.tsx                # gapX, gapY
│   ├── FreePlacementStore.tsx      # freePanels, exclusionZones, selectedId + mutation actions
│   ├── ModeStore.tsx               # mode ('grid'|'free'), activeTool, mobileTab
│   ├── CanvasStore.tsx             # bgImage, containerSize, containerRef, canvasRef
│   └── index.ts                    # Re-exports all providers + hooks
├── hooks/
│   ├── useLayout.ts                # Derived: LayoutResult from roof+panel+gap stores
│   ├── useScaleFactor.ts           # Derived: px/cm scale from canvas container + roof
│   ├── useDragHandlers.ts          # Pointer event handlers for free-mode drag + zone draw
│   ├── useKeyboardDelete.ts        # keydown Delete → delete selected item
│   ├── useImageUpload.ts           # File → data-URL state helper
│   ├── useContainerResize.ts       # ResizeObserver → containerSize in CanvasStore
│   └── index.ts
├── components/
│   ├── Sidebar/
│   │   ├── Sidebar.tsx             # Layout wrapper — renders all sidebar sections
│   │   ├── RoofSection.tsx         # Roof width/height + image upload inputs
│   │   ├── PanelPresetSection.tsx  # Preset dropdown + manual w/l/power + orientation
│   │   ├── GapSection.tsx          # gapX / gapY inputs (grid mode only)
│   │   ├── FreePanelEditor.tsx     # Selected free panel editor (free mode only)
│   │   └── ExclusionZoneEditor.tsx # Selected zone editor (free mode only)
│   ├── Canvas/
│   │   ├── CanvasArea.tsx          # Outer container + pointer event wiring
│   │   ├── GridRenderer.tsx        # Renders grid panels (grid mode)
│   │   ├── FreePlacementRenderer.tsx # Renders free panels (free mode)
│   │   ├── ExclusionZoneRenderer.tsx # Renders exclusion zones
│   │   └── EmptyStateOverlay.tsx   # "Too small" and "click to place" overlays
│   ├── StatsBar/
│   │   ├── StatsBar.tsx            # Desktop top info bar (panels, power, grid dims)
│   │   └── MobileStatsBar.tsx      # Mobile condensed stats (shown on settings tab)
│   ├── ModeControls/
│   │   ├── ModeToggle.tsx          # Grid / Frei toggle buttons
│   │   └── ToolToggle.tsx          # Sperrzone tool button (free mode only)
│   └── MobileNav/
│       └── MobileNav.tsx           # Bottom tab bar (Vorschau / Einstellungen)
├── App.tsx                         # Thin shell: wraps all Providers, renders layout grid of components
├── AboutPage.tsx                   # Unchanged
├── main.tsx                        # Unchanged
├── index.css                       # Unchanged
└── test/
    ├── utils/
    │   ├── calculateLayout.test.ts
    │   ├── clampPanel.test.ts
    │   ├── effectivePanelSize.test.ts
    │   ├── formatPower.test.ts
    │   ├── panelOverlapsZone.test.ts
    │   └── rectanglesOverlap.test.ts
    ├── App.test.tsx                # Unchanged (black-box integration)
    └── setup.ts                    # Unchanged
```

---

## Guiding Principles

| Principle | Rule |
|-----------|------|
| **Type safety** | All types in `src/types/index.ts`; no `any`; strict mode |
| **Pure utils** | Every util is a named export in its own file; no side effects; fully testable |
| **Stores** | One React Context per concern; Provider wraps App in `main.tsx`; typed state + actions |
| **Hooks** | Compose stores + utils; never hold raw state; return derived data + callbacks |
| **Components** | Zero business logic; receive data via store hooks or props; render only |
| **Backward compat** | `src/layout.ts` updated to re-export from new locations so existing tests still pass |

---

## Phase Sequence

| Phase | File | Summary |
|-------|------|---------|
| 1 | `01-TYPES.md` | Create `src/types/index.ts` |
| 2 | `02-UTILS.md` | Extract/move utils to `src/utils/` |
| 3 | `03-CONSTANTS.md` | Move `PRESETS` to `src/constants/` |
| 4 | `04-STORES.md` | Create Context stores in `src/stores/` |
| 5 | `05-HOOKS.md` | Create composed hooks in `src/hooks/` |
| 6 | `06-COMPONENTS.md` | Split App.tsx into `src/components/` |
| 7 | `07-APP-SHELL.md` | Rewrite App.tsx as thin Provider + layout shell |
| 8 | `08-TESTS.md` | Add util tests; verify all existing tests still pass |

Each phase must leave the app in a **buildable, passing-test state** before the next phase begins.

---

## Invariants (never break these)

- `calculateLayout` stays pure and exported (test coverage must be maintained)
- `data-testid` attributes (`total-panels`, `total-power`, `canvas`, `panel`, `layout-grid`, `free-panel`, `mode-toggle`, `tool-draw-zone`, `selected-panel-delete`, `selected-panel-width`, `exclusion-zone`, `mobile-tab-canvas`, `mobile-tab-settings`) must remain in the DOM with identical values
- `aria-label` attributes on all inputs and interactive elements must be preserved
- No new external dependencies (no Zustand, Redux, etc.)
- No backend / API calls
- Tailwind CSS only — no custom CSS except dynamic inline styles
