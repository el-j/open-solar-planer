import { Trash2 } from 'lucide-react';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { useRoofStore } from '../../stores/RoofStore';
import { clampPanel } from '../../utils/clampPanel';

export function ExclusionZoneEditor() {
  const { exclusionZones, selectedId, updateZone, deleteSelected } = useFreePlacementStore();
  const { roofWidth, roofHeight } = useRoofStore();
  const selectedZone = exclusionZones.find(z => z.id === selectedId) ?? null;

  if (!selectedZone) return null;

  return (
    <section>
      <hr className="border-slate-200 mb-4" />
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Sperrzone bearbeiten
      </h2>
      <div className="mb-3">
        <label className="block text-xs text-slate-500 mb-1">Bezeichnung</label>
        <input
          type="text"
          value={selectedZone.label ?? ''}
          onChange={e => updateZone(selectedZone.id, { label: e.target.value })}
          className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          aria-label="Exclusion zone label"
          placeholder="z.B. Kunststoff-Dach"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">X-Position (cm)</label>
          <input
            type="number"
            value={selectedZone.x}
            onChange={e => {
              const clamped = clampPanel(Number(e.target.value), selectedZone.y, selectedZone.width, selectedZone.height, roofWidth, roofHeight);
              updateZone(selectedZone.id, { x: clamped.x });
            }}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Exclusion zone X position in cm"
            data-testid="selected-zone-x"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Y-Position (cm)</label>
          <input
            type="number"
            value={selectedZone.y}
            onChange={e => {
              const clamped = clampPanel(selectedZone.x, Number(e.target.value), selectedZone.width, selectedZone.height, roofWidth, roofHeight);
              updateZone(selectedZone.id, { y: clamped.y });
            }}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Exclusion zone Y position in cm"
            data-testid="selected-zone-y"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Breite (cm)</label>
          <input
            type="number"
            value={selectedZone.width}
            onChange={e => updateZone(selectedZone.id, { width: Math.max(0, Number(e.target.value)) })}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Exclusion zone width in cm"
            data-testid="selected-zone-width"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Höhe (cm)</label>
          <input
            type="number"
            value={selectedZone.height}
            onChange={e => updateZone(selectedZone.id, { height: Math.max(0, Number(e.target.value)) })}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Exclusion zone height in cm"
            data-testid="selected-zone-height"
          />
        </div>
      </div>
      <button
        onClick={deleteSelected}
        className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 rounded transition-colors text-sm font-medium"
        aria-label="Delete selected zone"
      >
        <Trash2 className="w-4 h-4" />
        Zone löschen
      </button>
    </section>
  );
}
