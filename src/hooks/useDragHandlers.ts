import { useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import type React from 'react';
import { useFreePlacementStore } from '../stores/FreePlacementStore';
import { usePanelStore } from '../stores/PanelStore';
import { useModeStore } from '../stores/ModeStore';
import { useCanvasStore } from '../stores/CanvasStore';
import { useRoofStore } from '../stores/RoofStore';
import { useScaleFactor } from './useScaleFactor';
import { pxToCm } from '../utils/pxToCm';
import { clampPanel } from '../utils/clampPanel';
import { clampZoneToBounds } from '../utils/clampZoneToBounds';
import { effectivePanelSize } from '../utils/effectivePanelSize';
import { generateId } from '../utils/generateId';
import type { DragState, FreePanel, ExclusionZone } from '../types';

export type DragHandlers = {
  handleCanvasPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  handlePanelPointerDown: (e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => void;
  handleZonePointerDown: (e: React.PointerEvent<HTMLDivElement>, zone: ExclusionZone) => void;
};

/**
 * Returns all canvas pointer-event handlers for free-placement mode.
 * Handles single-pointer drag (panel move + zone draw) and two-finger pinch-to-zoom.
 *
 * @param canvasRef  Ref to the inner canvas div (for pointer capture on panel drag).
 */
export function useDragHandlers(canvasRef: RefObject<HTMLDivElement | null>): DragHandlers {
  const { roofWidth, roofHeight } = useRoofStore();
  const { panelWidth, panelLength, panelPower, isLandscape } = usePanelStore();
  const { mode, activeTool, setActiveTool } = useModeStore();
  const { zoomScale, setZoomScale } = useCanvasStore();
  const { addPanel, updatePanel, addZone, updateZone, removeZone, removeTinyZone, setSelectedId } =
    useFreePlacementStore();
  const scaleFactor = useScaleFactor();

  // Drag state stored in a ref to avoid re-renders during gesture
  const dragRef = useRef<DragState | null>(null);
  // Multi-touch tracking for pinch-to-zoom
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);

  const effectiveScale = scaleFactor * zoomScale;
  const { effectiveWidth: defaultW, effectiveHeight: defaultH } = effectivePanelSize(
    panelWidth, panelLength, isLandscape,
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'free') return;

      // Track all active pointers for pinch detection
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger touch → start pinch zoom, discard any ongoing single-pointer drag
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
      // Clamp pointer to canvas bounds to prevent out-of-bounds coordinates on mobile scroll
      const pxX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
      const pxY = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

      if (activeTool === 'draw-zone') {
        const id = generateId('zone');
        addZone({
          id,
          x: Math.round(pxToCm(pxX, effectiveScale)),
          y: Math.round(pxToCm(pxY, effectiveScale)),
          width: 0,
          height: 0,
        });
        dragRef.current = { type: 'zone-draw', drawZoneId: id, startX: pxX, startY: pxY };
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
        return;
      }

      // select tool: click on empty canvas → place new panel
      setSelectedId(null);
      const cmX = pxToCm(pxX, effectiveScale);
      const cmY = pxToCm(pxY, effectiveScale);
      const clamped = clampPanel(
        cmX - defaultW / 2, cmY - defaultH / 2,
        defaultW, defaultH, roofWidth, roofHeight,
      );
      const id = generateId('panel');
      addPanel({ id, x: clamped.x, y: clamped.y, width: defaultW, height: defaultH, power: panelPower });
      setSelectedId(id);
    },
    [mode, activeTool, effectiveScale, defaultW, defaultH, panelPower, roofWidth, roofHeight,
      addPanel, addZone, removeZone, setActiveTool, setSelectedId],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Keep pointer position up to date for pinch calculation
      if (activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Pinch zoom: update zoomScale from the ratio of new vs. previous pinch distance
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
      // Clamp pointer to canvas bounds so zone edges can never escape the roof area
      const pxX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
      const pxY = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

      if (dragRef.current.type === 'zone-draw') {
        const startCmX = pxToCm(dragRef.current.startX, effectiveScale);
        const startCmY = pxToCm(dragRef.current.startY, effectiveScale);
        const curCmX = pxToCm(pxX, effectiveScale);
        const curCmY = pxToCm(pxY, effectiveScale);
        const clamped = clampZoneToBounds(
          Math.min(startCmX, curCmX),
          Math.min(startCmY, curCmY),
          Math.abs(curCmX - startCmX),
          Math.abs(curCmY - startCmY),
          roofWidth,
          roofHeight,
        );
        updateZone(dragRef.current.drawZoneId, clamped);
      } else if (dragRef.current.type === 'zone-move') {
        const dxCm = pxToCm(pxX - dragRef.current.startX, effectiveScale);
        const dyCm = pxToCm(pxY - dragRef.current.startY, effectiveScale);
        const { id, origX, origY, zoneWidth, zoneHeight } = dragRef.current;
        const clamped = clampPanel(origX + dxCm, origY + dyCm, zoneWidth, zoneHeight, roofWidth, roofHeight);
        updateZone(id, clamped);
      } else if (dragRef.current.type === 'panel') {
        const dxCm = pxToCm(pxX - dragRef.current.startX, effectiveScale);
        const dyCm = pxToCm(pxY - dragRef.current.startY, effectiveScale);
        const { id, origX, origY } = dragRef.current;
        const clamped = clampPanel(origX + dxCm, origY + dyCm, defaultW, defaultH, roofWidth, roofHeight);
        updatePanel(id, clamped);
      }
    },
    [effectiveScale, defaultW, defaultH, roofWidth, roofHeight, zoomScale, setZoomScale, updatePanel, updateZone],
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) lastPinchDist.current = null;
      if (!dragRef.current) return;
      if (dragRef.current.type === 'zone-draw') {
        const zid = dragRef.current.drawZoneId;
        // Discard zones smaller than 2×2 cm (accidental click without drag)
        removeTinyZone(zid, 2, 2);
        setActiveTool('select');
        // Auto-select the newly drawn zone so the user can immediately adjust its properties
        setSelectedId(zid);
      }
      dragRef.current = null;
    },
    [removeTinyZone, setActiveTool, setSelectedId],
  );

  const handleCanvasPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Browser took over the pointer (e.g. scroll gesture on mobile).
      // Discard any in-progress zone draw and reset tool.
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size < 2) lastPinchDist.current = null;
      if (!dragRef.current) return;
      if (dragRef.current.type === 'zone-draw') {
        removeZone(dragRef.current.drawZoneId);
        setActiveTool('select');
      }
      dragRef.current = null;
    },
    [removeZone, setActiveTool],
  );

  const handlePanelPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => {
      if (mode !== 'free') return;
      e.stopPropagation();
      // Ignore a second pointer while already dragging (prevents ghost panels on multi-touch)
      if (dragRef.current) return;
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
    },
    [mode, setSelectedId, canvasRef],
  );

  const handleZonePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, zone: ExclusionZone) => {
      if (mode !== 'free') return;
      e.stopPropagation();
      if (dragRef.current) return;
      setSelectedId(zone.id);
      const rect = canvasRef.current!.getBoundingClientRect();
      dragRef.current = {
        type: 'zone-move',
        id: zone.id,
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        origX: zone.x,
        origY: zone.y,
        zoneWidth: zone.width,
        zoneHeight: zone.height,
      };
      (canvasRef.current as HTMLDivElement).setPointerCapture?.(e.pointerId);
    },
    [mode, setSelectedId, canvasRef],
  );

  return {
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handlePanelPointerDown,
    handleZonePointerDown,
  };
}
