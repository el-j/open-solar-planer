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

**Purpose:** Produce the three canvas pointer-event handlers (down, move, up) for free-placement mode. Uses a `useRef` for drag state to avoid re-renders during drag.

```typescript
import { useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import { useFreePlacementStore } from '../stores/FreePlacementStore';
import { usePanelStore } from '../stores/PanelStore';
import { useModeStore } from '../stores/ModeStore';
import { useScaleFactor } from './useScaleFactor';
import { pxToCm } from '../utils/pxToCm';
import { clampPanel } from '../utils/clampPanel';
import { effectivePanelSize } from '../utils/effectivePanelSize';
import { generateId } from '../utils/generateId';
import { useRoofStore } from '../stores/RoofStore';
import type { DragState, FreePanel } from '../types';

export type DragHandlers = {
  handleCanvasPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerUp: () => void;
  handlePanelPointerDown: (e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => void;
};

/**
 * Returns pointer-event handlers for free-placement canvas interactions.
 * @param canvasRef  Ref to the inner canvas div (used for pointer capture on panel drag).
 */
export function useDragHandlers(canvasRef: RefObject<HTMLDivElement | null>): DragHandlers {
  const { roofWidth, roofHeight } = useRoofStore();
  const { panelWidth, panelLength, panelPower, isLandscape } = usePanelStore();
  const { mode, activeTool, setActiveTool } = useModeStore();
  const { addPanel, updatePanel, addZone, updateZone, setSelectedId } = useFreePlacementStore();
  const scaleFactor = useScaleFactor();
  const dragRef = useRef<DragState | null>(null);

  const { effectiveWidth: defaultW, effectiveHeight: defaultH } = effectivePanelSize(panelWidth, panelLength, isLandscape);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'free') return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;

    if (activeTool === 'draw-zone') {
      const id = generateId('zone');
      addZone({ id, x: Math.round(pxToCm(pxX, scaleFactor)), y: Math.round(pxToCm(pxY, scaleFactor)), width: 0, height: 0 });
      dragRef.current = { type: 'zone-draw', drawZoneId: id, startX: pxX, startY: pxY };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      return;
    }

    setSelectedId(null);
    const cmX = pxToCm(pxX, scaleFactor);
    const cmY = pxToCm(pxY, scaleFactor);
    const clamped = clampPanel(cmX - defaultW / 2, cmY - defaultH / 2, defaultW, defaultH, roofWidth, roofHeight);
    const id = generateId('panel');
    addPanel({ id, x: clamped.x, y: clamped.y, width: defaultW, height: defaultH, power: panelPower });
    setSelectedId(id);
  }, [mode, activeTool, scaleFactor, defaultW, defaultH, panelPower, roofWidth, roofHeight, addPanel, addZone, setSelectedId]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;

    if (dragRef.current.type === 'zone-draw') {
      const startCmX = pxToCm(dragRef.current.startX, scaleFactor);
      const startCmY = pxToCm(dragRef.current.startY, scaleFactor);
      const curCmX = pxToCm(pxX, scaleFactor);
      const curCmY = pxToCm(pxY, scaleFactor);
      updateZone(dragRef.current.drawZoneId, {
        x: Math.round(Math.min(startCmX, curCmX)),
        y: Math.round(Math.min(startCmY, curCmY)),
        width: Math.round(Math.abs(curCmX - startCmX)),
        height: Math.round(Math.abs(curCmY - startCmY)),
      });
    } else if (dragRef.current.type === 'panel') {
      const dxCm = pxToCm(pxX - dragRef.current.startX, scaleFactor);
      const dyCm = pxToCm(pxY - dragRef.current.startY, scaleFactor);
      const { id, origX, origY } = dragRef.current;
      updatePanel(id, clampPanel(origX + dxCm, origY + dyCm, defaultW, defaultH, roofWidth, roofHeight));
    }
  }, [scaleFactor, defaultW, defaultH, roofWidth, roofHeight, updatePanel, updateZone]);

  const handleCanvasPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      const zid = dragRef.current.drawZoneId;
      // Discard zones smaller than 2×2 cm (accidental click without drag)
      // updateZone can't remove — use removeZone from store via side effect:
      // approach: store provides removeZone; call it if zone too small
      setActiveTool('select');
    }
    dragRef.current = null;
  }, [setActiveTool]);

  const handlePanelPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => {
    if (mode !== 'free') return;
    e.stopPropagation();
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
    (canvasRef.current as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [mode, setSelectedId, canvasRef]);

  return { handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp, handlePanelPointerDown };
}
```

> **Implementation note:** `handleCanvasPointerUp` needs to call `removeZone` for zones smaller than 2×2 cm. Import `useFreePlacementStore` and destructure `removeZone` as well.

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
