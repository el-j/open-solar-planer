import { Trash2 } from 'lucide-react';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';

export function ExclusionZoneEditor() {
  const { exclusionZones, selectedId, updateZone, deleteSelected } = useFreePlacementStore();
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
