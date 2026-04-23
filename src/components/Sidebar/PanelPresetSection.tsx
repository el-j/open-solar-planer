import { Settings, RotateCw } from 'lucide-react';
import { usePanelStore } from '../../stores/PanelStore';
import { PRESETS } from '../../constants';

export function PanelPresetSection() {
  const {
    selectedPreset, panelWidth, panelLength, panelPower, isLandscape,
    setPanelWidth, setPanelLength, setPanelPower,
    applyPreset, markCustom, toggleOrientation,
  } = usePanelStore();

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Solarmodule
      </h2>

      <div className="mb-3">
        <label className="block text-xs text-slate-500 mb-1">Panel-Vorgaben</label>
        <select
          value={selectedPreset}
          onChange={e => applyPreset(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          aria-label="Panel preset"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Breite (cm)</label>
          <input
            type="number"
            value={panelWidth}
            onChange={e => { setPanelWidth(Number(e.target.value)); markCustom(); }}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Panel width in cm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Länge (cm)</label>
          <input
            type="number"
            value={panelLength}
            onChange={e => { setPanelLength(Number(e.target.value)); markCustom(); }}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Panel length in cm"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-slate-500 mb-1">Leistung pro Modul (Wp)</label>
        <input
          type="number"
          value={panelPower}
          onChange={e => { setPanelPower(Number(e.target.value)); markCustom(); }}
          className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          aria-label="Panel power in Wp"
        />
      </div>

      <button
        onClick={toggleOrientation}
        className="w-full flex items-center justify-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors text-sm font-medium"
        aria-label={isLandscape ? 'Switch to portrait orientation' : 'Switch to landscape orientation'}
      >
        <RotateCw className={`w-4 h-4 transition-transform ${isLandscape ? 'rotate-90' : ''}`} />
        {isLandscape ? 'Querformat (Landscape)' : 'Hochformat (Portrait)'}
      </button>
    </section>
  );
}
