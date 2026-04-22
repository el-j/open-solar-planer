import { useLayout } from '../../hooks/useLayout';
import { useModeStore } from '../../stores/ModeStore';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { formatPower } from '../../utils/formatPower';

export function MobileStatsBar() {
  const layout = useLayout();
  const { mode } = useModeStore();
  const { freePanels } = useFreePlacementStore();

  const freeTotalPower = freePanels.reduce((sum, p) => sum + p.power, 0);
  const panelCount = mode === 'free' ? freePanels.length : layout.totalPanels;
  const powerKwp = mode === 'free' ? formatPower(freeTotalPower) : formatPower(layout.totalPowerWp);

  return (
    <div
      className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex justify-around items-center shrink-0 shadow-sm z-10"
      aria-label="Summary stats"
    >
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase font-semibold">Anzahl Module</p>
        <p className="text-xl font-bold text-blue-600">{panelCount}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase font-semibold">Gesamtleistung</p>
        <p className="text-xl font-bold text-green-600">{powerKwp}</p>
      </div>
    </div>
  );
}
