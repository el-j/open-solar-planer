import { Info, Move } from 'lucide-react';
import { useLayout } from '../../hooks/useLayout';
import { useModeStore } from '../../stores/ModeStore';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';

export function EmptyStateOverlay() {
  const layout = useLayout();
  const { mode } = useModeStore();
  const { freePanels, exclusionZones } = useFreePlacementStore();

  if (mode === 'grid' && layout.totalPanels === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm p-4 text-center">
        <Info className="w-8 h-8 text-slate-500 mb-2" />
        <p className="text-slate-800 font-medium">Fläche zu klein</p>
        <p className="text-sm text-slate-600">Die eingegebenen Maße sind zu klein für diese Modulgröße.</p>
      </div>
    );
  }

  if (mode === 'free' && freePanels.length === 0 && exclusionZones.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
        <Move className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-slate-600 font-medium">Freie Platzierung</p>
        <p className="text-sm text-slate-500 mt-1">Klicken um ein Modul zu platzieren.</p>
        <p className="text-sm text-slate-500">„Sperrzone" aktivieren um Bereiche auszuschließen.</p>
      </div>
    );
  }

  return null;
}
