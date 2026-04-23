# Task: Create Composed Hooks in `src/hooks/`

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 5 of 8 — requires Phases 1–4 to be complete

---

## Goal

Extract all derived computations and side-effect logic from `App.tsx` into purpose-built hooks in `src/hooks/`. Hooks read from stores and utils but contain no rendering logic. This leaves `App.tsx`'s component tree as pure UI.

---

## Hooks to Create

### `src/hooks/useLayout.ts`

**Purpose:** Compute the grid `LayoutResult` from roof, panel, and gap stores.

```typescript
import { useMemo } from 'react';
import { useRoofStore } from '../stores/RoofStore';
import { usePanelStore } from '../stores/PanelStore';
import { useGapStore } from '../stores/GapStore';
import { calculateLayout } from '../utils/calculateLayout';
import type { LayoutResult } from '../types';

export function useLayout(): LayoutResult {
  const { roofWidth, roofHeight } = useRoofStore();
  const { panelWidth, panelLength, panelPower, isLandscape } = usePanelStore();
  const { gapX, gapY } = useGapStore();

  return useMemo(
    () => calculateLayout(roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY),
    [roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY],
  );
}
```

---

### `src/hooks/useScaleFactor.ts`

**Purpose:** Compute the pixel-per-cm scale factor so the roof fits inside the canvas container.

```typescript
import { useMemo } from 'react';
import { useRoofStore } from '../stores/RoofStore';
import { useCanvasStore } from '../stores/CanvasStore';

export function useScaleFactor(): number {
  const { roofWidth, roofHeight } = useRoofStore();
  const { containerSize } = useCanvasStore();

  return useMemo(() => {
    const availableW = containerSize.width - 40;
    const availableH = containerSize.height - 40;
    if (roofWidth === 0 || roofHeight === 0) return 1;
    return Math.min(availableW / roofWidth, availableH / roofHeight);
  }, [containerSize, roofWidth, roofHeight]);
}
```

---

### `src/hooks/useContainerResize.ts`

**Purpose:** Wire a `ResizeObserver` to update `CanvasStore.containerSize` when the container element changes size.

```typescript
import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useCanvasStore } from '../stores/CanvasStore';

/**
 * Observes `containerRef` with a ResizeObserver and writes width/height
 * into CanvasStore whenever the element is resized.
 */
export function useContainerResize(containerRef: RefObject<HTMLDivElement | null>): void {
  const { setContainerSize } = useCanvasStore();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, setContainerSize]);
}
```

---

### `src/hooks/useImageUpload.ts`

**Purpose:** Handle `<input type="file">` change events and write the data-URL into `CanvasStore`.

```typescript
import { useCallback } from 'react';
import { useCanvasStore } from '../stores/CanvasStore';

export type UseImageUploadReturn = {
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearImage: () => void;
};

export function useImageUpload(): UseImageUploadReturn {
  const { setBgImage } = useCanvasStore();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBgImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [setBgImage]);

  const clearImage = useCallback(() => setBgImage(null), [setBgImage]);

  return { handleImageUpload, clearImage };
}
```

---

### `src/hooks/useKeyboardDelete.ts`

**Purpose:** Listen for `Delete` key presses and call `FreePlacementStore.deleteSelected`.

```typescript
import { useEffect } from 'react';
import { useFreePlacementStore } from '../stores/FreePlacementStore';

/**
 * Registers a window keydown listener that calls deleteSelected() when
 * the Delete key is pressed and an item is currently selected.
 */
export function useKeyboardDelete(): void {
  const { selectedId, deleteSelected } = useFreePlacementStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId !== null) deleteSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteSelected]);
}
```

---

### `src/hooks/useDragHandlers.ts`

**Purpose:** Produce all canvas pointer-event handlers for free-placement mode, including pinch-to-zoom and `pointercancel`. Uses `useRef` for all drag/zoom state to avoid re-renders during gesture.

```typescript
import { useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import { useFreePlacementStore } from '../stores/FreePlacementStore';
import { usePanelStore } from '../stores/PanelStore';
import { useModeStore } from '../stores/ModeStore';
import { useCanvasStore } from '../stores/CanvasStore';
import { useScaleFactor } from './useScaleFactor';
import { pxToCm } from '../utils/pxToCm';
import { clampPanel } from '../utils/clampPanel';
import { clampZoneToBounds } from '../utils/clampZoneToBounds';
import { effectivePanelSize } from '../utils/effectivePanelSize';
import { generateId } from '../utils/generateId';
import { useRoofStore } from '../stores/RoofStore';
import type { DragState, FreePanel } from '../types';

export type DragHandlers = {
  handleCanvasPointerDown:   (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerMove:   (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerUp:     (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePanelPointerDown:    (e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => void;
};

export function useDragHandlers(canvasRef: RefObject<HTMLDivElement | null>): DragHandlers {
  const { roofWidth, roofHeight } = useRoofStore();
  const { panelWidth, panelLength, panelPower, isLandscape } = usePanelStore();
  const { mode, activeTool, setActiveTool } = useModeStore();
  const { zoomScale, setZoomScale } = useCanvasStore();
  const { addPanel, updatePanel, addZone, updateZone, removeZone, setSelectedId } = useFreePlacementStore();
  const scaleFactor = useScaleFactor();

  const dragRef = useRef<DragState | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);

  const effectiveScale = scaleFactor * zoomScale;
  const { effectiveWidth: defaultW, effectiveHeight: defaultH } = effectivePanelSize(panelWidth, panelLength, isLandscape);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'free') return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger touch → start pinch zoom, cancel any ongoing drag
    if (e.pointerType === 'touch' && activePointers.current.size >= 2) {
      const pts = Array.from(activePointers.current.values()).slice(0, 2);
      lastPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (dragRef.current) {
        if (dragRef.current.type === 'zone-draw') {
          removeZone(dragRef.current.drawZoneId);
          setActiveTool('select');
        }
        dragRef.current = null;
      }
      return;
    }

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pxX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const pxY = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

    if (activeTool === 'draw-zone') {
      const id = generateId('zone');
      addZone({ id, x: Math.round(pxToCm(pxX, effectiveScale)), y: Math.round(pxToCm(pxY, effectiveScale)), width: 0, height: 0 });
      dragRef.current = { type: 'zone-draw', drawZoneId: id, startX: pxX, startY: pxY };
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
      return;
    }

    setSelectedId(null);
    const cmX = pxToCm(pxX, effectiveScale);
    const cmY = pxToCm(pxY, effectiveScale);
    const clamped = clampPanel(cmX - defaultW / 2, cmY - defaultH / 2, defaultW, defaultH, roofWidth, roofHeight);
    const id = generateId('panel');
    addPanel({ id, x: clamped.x, y: clamped.y, width: defaultW, height: defaultH, power: panelPower });
    setSelectedId(id);
  }, [mode, activeTool, effectiveScale, defaultW, defaultH, panelPower, roofWidth, roofHeight, addPanel, addZone, removeZone, setActiveTool, setSelectedId]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (e.pointerType === 'touch' && activePointers.current.size >= 2 && lastPinchDist.current !== null) {
      const pts = Array.from(activePointers.current.values()).slice(0, 2);
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = newDist / lastPinchDist.current;
      setZoomScale(Math.min(4, Math.max(0.5, zoomScale * ratio)));
      lastPinchDist.current = newDist;
      return;
    }

    if (!dragRef.current) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pxX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const pxY = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

    if (dragRef.current.type === 'zone-draw') {
      const startCmX = pxToCm(dragRef.current.startX, effectiveScale);
      const startCmY = pxToCm(dragRef.current.startY, effectiveScale);
      const curCmX = pxToCm(pxX, effectiveScale);
      const curCmY = pxToCm(pxY, effectiveScale);
      const clamped = clampZoneToBounds(
        Math.min(startCmX, curCmX), Math.min(startCmY, curCmY),
        Math.abs(curCmX - startCmX), Math.abs(curCmY - startCmY),
        roofWidth, roofHeight,
      );
      updateZone(dragRef.current.drawZoneId, clamped);
    } else if (dragRef.current.type === 'panel') {
      const dxCm = pxToCm(pxX - dragRef.current.startX, effectiveScale);
      const dyCm = pxToCm(pxY - dragRef.current.startY, effectiveScale);
      const { id, origX, origY } = dragRef.current;
      updatePanel(id, clampPanel(origX + dxCm, origY + dyCm, defaultW, defaultH, roofWidth, roofHeight));
    }
  }, [effectiveScale, defaultW, defaultH, roofWidth, roofHeight, zoomScale, setZoomScale, updatePanel, updateZone]);

  const _finishDrag = useCallback((pointerId: number, discard: boolean) => {
    activePointers.current.delete(pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = null;
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      const zid = dragRef.current.drawZoneId;
      if (discard) {
        removeZone(zid);
      } else {
        // Discard zones smaller than 2×2 cm (accidental tap without drag)
        // FreePlacementStore updateZone already set dimensions; removeZone if too small
        // We read the current zone size from store — store provides a selector or we rely on filter
        // Simpler: pass a "min size" flag to removeZone. Use removeZone with a predicate.
        // Implementation: store's removeZoneIfTiny(id) or caller does it inline via removeZone.
        // For clean separation: FreePlacementStore exposes removeTinyZone(id, minW, minH).
      }
      setActiveTool('select');
    }
    dragRef.current = null;
  }, [removeZone, setActiveTool]);

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = null;
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      const zid = dragRef.current.drawZoneId;
      // FreePlacementStore exposes removeTinyZone to discard zones < 2×2 cm
      // (implementation detail: store checks width >= 2 && height >= 2)
      // Use the dedicated store action for this.
    }
    dragRef.current = null;
  }, [setActiveTool]);

  const handleCanvasPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = null;
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      removeZone(dragRef.current.drawZoneId);
      setActiveTool('select');
    }
    dragRef.current = null;
  }, [removeZone, setActiveTool]);

  const handlePanelPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => {
    if (mode !== 'free') return;
    e.stopPropagation();
    if (dragRef.current) return; // ignore second pointer while dragging
    setSelectedId(panel.id);
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = {
      type: 'panel',
      id: panel.id,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origX: panel.x,
      origY: panel.y,
    };
    (canvasRef.current as HTMLDivElement).setPointerCapture?.(e.pointerId);
  }, [mode, setSelectedId, canvasRef]);

  return { handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp, handleCanvasPointerCancel, handlePanelPointerDown };
}
```

> **`FreePlacementStore` must expose a `removeTinyZone(id, minW, minH)` action** that filters out a zone if its width < minW OR height < minH. This encapsulates the "too small to be meaningful" rule and keeps the hook clean.

> **`_finishDrag` note:** the pseudo-code for `_finishDrag` is shown for clarity. In practice, `handleCanvasPointerUp` and `handleCanvasPointerCancel` share similar cleanup logic. The implementation can inline this rather than using a shared helper.

---

### `src/hooks/index.ts`

```typescript
export { useLayout } from './useLayout';
export { useScaleFactor } from './useScaleFactor';
export { useContainerResize } from './useContainerResize';
export { useImageUpload } from './useImageUpload';
export { useKeyboardDelete } from './useKeyboardDelete';
export { useDragHandlers } from './useDragHandlers';
```

---

## Acceptance Criteria

- [ ] AC1: All six hook files and `index.ts` exist under `src/hooks/`
- [ ] AC2: No hook contains JSX (`.ts` extension, not `.tsx`)
- [ ] AC3: Every hook is a named export matching its file name
- [ ] AC4: No hook directly accesses `useState` for state owned by a store — it reads from the store via its consumer hook
- [ ] AC5: `useDragHandlers` uses `useRef<DragState | null>` typed with the discriminated union from `src/types`
- [ ] AC6: `npm run build`, `npm test`, `npm run lint` all pass

---

## Edge Cases

- EC1: `useScaleFactor` — `scaleFactor` of 0 or near-0 when `containerSize` is 0 (before first ResizeObserver callback). Guards: `roofWidth === 0 || roofHeight === 0` already returns 1; but `containerSize.width === 0` would also produce 0. Add guard: `if (availableW <= 0 || availableH <= 0) return 1`.
- EC2: `useDragHandlers` — `defaultW` and `defaultH` are computed outside the callbacks. If the user changes panel orientation while dragging, the drag will continue with the size at drag-start. This is acceptable behaviour (same as existing code).
- EC3: `useContainerResize` — `containerRef.current` may be `null` on first render. The `if (!el) return` guard handles this. The `containerRef` itself is stable (same object), so no infinite loop.
- EC4: `useKeyboardDelete` — re-registers the listener whenever `selectedId` changes. This is correct and expected; the old listener is removed via cleanup.

---

## Commit Message

```
refactor: add composed hooks in src/hooks/
```

---

## Notes / Risks

- Hooks in `.ts` files cannot contain JSX — if you find yourself needing JSX in a hook, it should be a component instead.
- `useDragHandlers` is the most complex hook. Take care with the discriminated union `DragState`: TypeScript should narrow the type inside `if (dragRef.current.type === 'panel')` blocks correctly only if the union is properly defined in Phase 1.
- The `removeZone`-for-tiny-zones logic in `handleCanvasPointerUp` requires `removeZone` to be available from the store. Make sure `FreePlacementStore` exports a `removeZone` action (it does per Phase 4 spec).

### ⚠️ Mobile Sperrzone Fix — Must Be Preserved

Before this phase is implemented, branch **`copilot/bugfix-mobile-drawing-sperrzonen`** will have been merged into `main`. That branch fixes how exclusion zones are drawn on mobile/touch screens.

**Action required before implementing `useDragHandlers`:**

1. Run `git fetch origin main` and `git diff main -- src/App.tsx` (or review the merged PR) to see exactly what the mobile fix changed in the pointer-event handlers.
2. Carry those changes **verbatim** into `useDragHandlers`. Common things to preserve:
   - Any `touch-action: none` style on the canvas element (goes into `CanvasArea.tsx` in Phase 6)
   - Any `e.preventDefault()` calls to suppress scroll during zone drawing
   - Any adjustments to how `getBoundingClientRect()` coordinates are computed for touch events
   - Any `pointerId` / `setPointerCapture` changes
3. The mobile fix must not be lost during the structural move from `App.tsx` to `useDragHandlers`. This is the highest-risk line in the entire refactor.
