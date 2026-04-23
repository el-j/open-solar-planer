import { Trash2 } from 'lucide-react';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { useRoofStore } from '../../stores/RoofStore';
import { clampPanel } from '../../utils/clampPanel';

export function FreePanelEditor() {
  const { freePanels, selectedId, updatePanel, deleteSelected } = useFreePlacementStore();
  const { roofWidth, roofHeight } = useRoofStore();
  const selectedPanel = freePanels.find(p => p.id === selectedId) ?? null;

  if (!selectedPanel) return null;

  return (
    <section>
      <hr className="border-slate-200 mb-4" />
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Modul bearbeiten
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">X-Position (cm)</label>
          <input
            type="number"
            value={selectedPanel.x}
            onChange={e => {
              const clamped = clampPanel(Number(e.target.value), selectedPanel.y, selectedPanel.width, selectedPanel.height, roofWidth, roofHeight);
              updatePanel(selectedPanel.id, { x: clamped.x });
            }}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Selected panel X position in cm"
            data-testid="selected-panel-x"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Y-Position (cm)</label>
          <input
            type="number"
            value={selectedPanel.y}
            onChange={e => {
              const clamped = clampPanel(selectedPanel.x, Number(e.target.value), selectedPanel.width, selectedPanel.height, roofWidth, roofHeight);
              updatePanel(selectedPanel.id, { y: clamped.y });
            }}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Selected panel Y position in cm"
            data-testid="selected-panel-y"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Breite (cm)</label>
          <input
            type="number"
            value={selectedPanel.width}
            onChange={e => updatePanel(selectedPanel.id, { width: Number(e.target.value) })}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Selected panel width in cm"
            data-testid="selected-panel-width"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Länge (cm)</label>
          <input
            type="number"
            value={selectedPanel.height}
            onChange={e => updatePanel(selectedPanel.id, { height: Number(e.target.value) })}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Selected panel height in cm"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-slate-500 mb-1">Leistung (Wp)</label>
        <input
          type="number"
          value={selectedPanel.power}
          onChange={e => updatePanel(selectedPanel.id, { power: Number(e.target.value) })}
          className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          aria-label="Selected panel power in Wp"
        />
      </div>
      <button
        onClick={deleteSelected}
        className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 rounded transition-colors text-sm font-medium"
        aria-label="Delete selected panel"
        data-testid="selected-panel-delete"
      >
        <Trash2 className="w-4 h-4" />
        Löschen
      </button>
    </section>
  );
}
