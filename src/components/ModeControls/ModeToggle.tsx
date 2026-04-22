import { Settings, Move } from 'lucide-react';
import { useModeStore } from '../../stores/ModeStore';

export function ModeToggle() {
  const { mode, setMode } = useModeStore();

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded p-1">
      <button
        onClick={() => setMode('grid')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          mode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'
        }`}
        aria-label="Switch to grid mode"
        data-testid="mode-toggle"
      >
        <Settings className="w-3.5 h-3.5" />
        Grid
      </button>
      <button
        onClick={() => setMode('free')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          mode === 'free' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'
        }`}
        aria-label="Switch to free placement mode"
      >
        <Move className="w-3.5 h-3.5" />
        Frei
      </button>
    </div>
  );
}
