import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { useScaleFactor } from '../../hooks/useScaleFactor';
import { panelOverlapsZone } from '../../utils/panelOverlapsZone';
import type { DragHandlers } from '../../hooks/useDragHandlers';
import type { FreePanel } from '../../types';

type FreePanelRendererProps = {
  handlers: Pick<DragHandlers, 'handlePanelPointerDown'>;
};

export function FreePanelRenderer({ handlers }: FreePanelRendererProps) {
  const { freePanels, exclusionZones, selectedId, deleteSelected } = useFreePlacementStore();
  const scaleFactor = useScaleFactor();

  const renderPanel = (panel: FreePanel) => {
    const overlapping = exclusionZones.some(z => panelOverlapsZone(panel, z));
    const isSelected = selectedId === panel.id;
    return (
      <div
        key={panel.id}
        className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors ${
          overlapping
            ? 'bg-red-700/80 border-2 border-red-400'
            : isSelected
            ? 'bg-blue-700/90 border-2 border-yellow-300'
            : 'bg-blue-900/80 border border-blue-400 hover:bg-blue-800/90'
        }`}
        style={{
          left: `${panel.x * scaleFactor}px`,
          top: `${panel.y * scaleFactor}px`,
          width: `${panel.width * scaleFactor}px`,
          height: `${panel.height * scaleFactor}px`,
        }}
        data-testid="free-panel"
        onPointerDown={e => handlers.handlePanelPointerDown(e, panel)}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: `${(panel.width / 6) * scaleFactor}px ${(panel.height / 10) * scaleFactor}px`,
          }}
        />
        {scaleFactor * Math.min(panel.width, panel.height) > 40 && (
          <span className="text-white text-xs font-semibold z-10 opacity-70">
            {panel.power}W
            {overlapping && ' ⚠'}
          </span>
        )}
        {isSelected && (
          <button
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center z-20 shadow-md hover:bg-red-600 transition-colors"
            style={{ pointerEvents: 'auto' }}
            onClick={e => { e.stopPropagation(); deleteSelected(); }}
            onPointerDown={e => e.stopPropagation()}
            aria-label="Delete panel"
            data-testid="inline-panel-delete"
          >
            <span className="text-sm font-bold leading-none">×</span>
          </button>
        )}
      </div>
    );
  };

  return <>{freePanels.map(renderPanel)}</>;
}
