import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { useScaleFactor } from '../../hooks/useScaleFactor';

export function ExclusionZoneRenderer() {
  const { exclusionZones, selectedId, setSelectedId, deleteSelected } = useFreePlacementStore();
  const scaleFactor = useScaleFactor();

  return (
    <>
      {exclusionZones.map(zone => (
        <div
          key={zone.id}
          className={`absolute border-2 flex items-center justify-center cursor-pointer transition-colors ${
            selectedId === zone.id
              ? 'border-orange-500 bg-orange-300/50'
              : 'border-orange-400 bg-orange-200/40 hover:bg-orange-200/60'
          }`}
          style={{
            left: `${zone.x * scaleFactor}px`,
            top: `${zone.y * scaleFactor}px`,
            width: `${zone.width * scaleFactor}px`,
            height: `${zone.height * scaleFactor}px`,
          }}
          data-testid="exclusion-zone"
          onPointerDown={e => {
            e.stopPropagation();
            setSelectedId(zone.id);
          }}
        >
          {zone.label && zone.height * scaleFactor > 16 && (
            <span className="text-orange-800 text-xs font-medium px-1 truncate max-w-full">
              {zone.label}
            </span>
          )}
          {selectedId === zone.id && (
            <button
              className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center z-20 shadow-md hover:bg-red-600 transition-colors"
              style={{ pointerEvents: 'auto' }}
              onClick={e => { e.stopPropagation(); deleteSelected(); }}
              onPointerDown={e => e.stopPropagation()}
              aria-label="Delete exclusion zone"
              data-testid="inline-zone-delete"
            >
              <span className="text-sm font-bold leading-none">×</span>
            </button>
          )}
        </div>
      ))}
    </>
  );
}
