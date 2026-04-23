import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { useRoofStore } from '../../stores/RoofStore';
import { clampPanel } from '../../utils/clampPanel';

/**
 * Bottom HUD overlay — shows X/Y/W/H controls for the selected panel or exclusion zone.
 * Only rendered in free-placement mode when an item is selected.
 */
export function SelectionHud() {
  const { freePanels, exclusionZones, selectedId, updatePanel, updateZone } = useFreePlacementStore();
  const { roofWidth, roofHeight } = useRoofStore();

  const selectedPanel = freePanels.find(p => p.id === selectedId) ?? null;
  const selectedZone = exclusionZones.find(z => z.id === selectedId) ?? null;

  if (!selectedPanel && !selectedZone) return null;

  // Use a single variable for reading shared positional properties
  const item = selectedPanel ?? selectedZone!;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-300 shadow-lg"
      data-testid="selection-hud"
    >
      <div className="flex items-center gap-x-3 gap-y-1 px-3 py-2 pr-16 flex-wrap text-xs">
        <span className="font-semibold text-slate-500 uppercase shrink-0">
          {selectedPanel ? 'Modul' : 'Sperrzone'}
        </span>

        {/* X position */}
        <label className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 font-medium">X</span>
          <input
            type="number"
            className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
            value={item.x}
            onChange={e => {
              const val = Number(e.target.value);
              if (selectedPanel) {
                const clamped = clampPanel(val, selectedPanel.y, selectedPanel.width, selectedPanel.height, roofWidth, roofHeight);
                updatePanel(selectedPanel.id, { x: clamped.x });
              } else {
                const clamped = clampPanel(val, selectedZone!.y, selectedZone!.width, selectedZone!.height, roofWidth, roofHeight);
                updateZone(selectedZone!.id, { x: clamped.x });
              }
            }}
            aria-label="Selected item X position in cm"
            data-testid="hud-x"
          />
        </label>

        {/* Y position */}
        <label className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 font-medium">Y</span>
          <input
            type="number"
            className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
            value={item.y}
            onChange={e => {
              const val = Number(e.target.value);
              if (selectedPanel) {
                const clamped = clampPanel(selectedPanel.x, val, selectedPanel.width, selectedPanel.height, roofWidth, roofHeight);
                updatePanel(selectedPanel.id, { y: clamped.y });
              } else {
                const clamped = clampPanel(selectedZone!.x, val, selectedZone!.width, selectedZone!.height, roofWidth, roofHeight);
                updateZone(selectedZone!.id, { y: clamped.y });
              }
            }}
            aria-label="Selected item Y position in cm"
            data-testid="hud-y"
          />
        </label>

        {/* Width */}
        <label className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 font-medium">B</span>
          <input
            type="number"
            className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
            value={item.width}
            onChange={e => {
              const val = Math.max(0, Number(e.target.value));
              if (selectedPanel) {
                updatePanel(selectedPanel.id, { width: val });
              } else {
                updateZone(selectedZone!.id, { width: val });
              }
            }}
            aria-label="Selected item width in cm"
            data-testid="hud-width"
          />
        </label>

        {/* Height */}
        <label className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 font-medium">H</span>
          <input
            type="number"
            className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
            value={item.height}
            onChange={e => {
              const val = Math.max(0, Number(e.target.value));
              if (selectedPanel) {
                updatePanel(selectedPanel.id, { height: val });
              } else {
                updateZone(selectedZone!.id, { height: val });
              }
            }}
            aria-label="Selected item height in cm"
            data-testid="hud-height"
          />
        </label>

        <span className="text-slate-400 shrink-0">cm</span>
      </div>
    </div>
  );
}
