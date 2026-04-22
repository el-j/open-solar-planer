import { useRef } from 'react';
import { useCanvasStore } from '../../stores/CanvasStore';
import { useRoofStore } from '../../stores/RoofStore';
import { useModeStore } from '../../stores/ModeStore';
import { useScaleFactor } from '../../hooks/useScaleFactor';
import { useContainerResize } from '../../hooks/useContainerResize';
import { useDragHandlers } from '../../hooks/useDragHandlers';
import { useKeyboardDelete } from '../../hooks/useKeyboardDelete';
import { GridRenderer } from './GridRenderer';
import { ExclusionZoneRenderer } from './ExclusionZoneRenderer';
import { FreePanelRenderer } from './FreePanelRenderer';
import { FabToolbar } from './FabToolbar';
import { EmptyStateOverlay } from './EmptyStateOverlay';

export function CanvasArea() {
  const { bgImage, zoomScale } = useCanvasStore();
  const { roofWidth, roofHeight } = useRoofStore();
  const { mode, activeTool } = useModeStore();
  const scaleFactor = useScaleFactor();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useContainerResize(containerRef);
  useKeyboardDelete();

  const handlers = useDragHandlers(canvasRef);

  const cursor = mode === 'free'
    ? activeTool === 'draw-zone' ? 'crosshair' : 'cell'
    : 'default';

  return (
    <div
      className="flex-1 overflow-hidden relative flex items-center justify-center p-5 touch-none"
      ref={containerRef}
      style={{ overscrollBehavior: 'none' }}
    >
      <div
        ref={canvasRef}
        className="relative shadow-xl border-2 border-slate-400 bg-slate-300 overflow-hidden"
        style={{
          width: `${roofWidth * scaleFactor}px`,
          height: `${roofHeight * scaleFactor}px`,
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          cursor,
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
        }}
        data-testid="canvas"
        onPointerDown={mode === 'free' ? handlers.handleCanvasPointerDown : undefined}
        onPointerMove={mode === 'free' ? handlers.handleCanvasPointerMove : undefined}
        onPointerUp={mode === 'free' ? handlers.handleCanvasPointerUp : undefined}
        onPointerCancel={mode === 'free' ? handlers.handleCanvasPointerCancel : undefined}
      >
        {mode === 'grid' && <GridRenderer />}
        {mode === 'free' && (
          <>
            <ExclusionZoneRenderer />
            <FreePanelRenderer handlers={handlers} />
          </>
        )}
        <EmptyStateOverlay />
      </div>

      {mode === 'free' && <FabToolbar />}
    </div>
  );
}
