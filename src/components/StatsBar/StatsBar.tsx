import { useLayout } from '../../hooks/useLayout';
import { useModeStore } from '../../stores/ModeStore';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';
import { formatPower } from '../../utils/formatPower';

export function StatsBar() {
  const layout = useLayout();
  const { mode } = useModeStore();
  const { freePanels } = useFreePlacementStore();

  const freeTotalPower = freePanels.reduce((sum, p) => sum + p.power, 0);
  const panelCount = mode === 'free' ? freePanels.length : layout.totalPanels;
  const powerKwp = mode === 'free' ? formatPower(freeTotalPower) : formatPower(layout.totalPowerWp);

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase font-semibold leading-none">Module</p>
        <p className="text-xl font-bold text-blue-600" data-testid="total-panels">
          {panelCount}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase font-semibold leading-none">Leistung</p>
        <p className="text-xl font-bold text-green-600" data-testid="total-power">
          {powerKwp}
        </p>
      </div>
      {mode === 'grid' && (
        <div className="text-center hidden sm:block">
          <p className="text-xs text-slate-500 uppercase font-semibold leading-none">Anordnung</p>
          <p className="text-base font-medium text-slate-700" data-testid="layout-grid">
            {layout.cols} x {layout.rows}
          </p>
        </div>
      )}
    </div>
  );
}
