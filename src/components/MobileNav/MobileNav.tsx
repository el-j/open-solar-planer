import { Sun, Settings } from 'lucide-react';
import { useModeStore } from '../../stores/ModeStore';

export function MobileNav() {
  const { mobileTab, setMobileTab } = useModeStore();

  return (
    <div
      className="md:hidden flex border-t border-slate-200 bg-white shrink-0"
      role="tablist"
      aria-label="Mobile navigation"
    >
      <button
        role="tab"
        aria-selected={mobileTab === 'canvas'}
        onClick={() => setMobileTab('canvas')}
        className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium gap-1 transition-colors ${
          mobileTab === 'canvas' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'
        }`}
        aria-label="Show canvas preview"
        data-testid="mobile-tab-canvas"
      >
        <Sun className="w-5 h-5" />
        Vorschau
      </button>
      <button
        role="tab"
        aria-selected={mobileTab === 'settings'}
        onClick={() => setMobileTab('settings')}
        className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium gap-1 transition-colors ${
          mobileTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'
        }`}
        aria-label="Show settings"
        data-testid="mobile-tab-settings"
      >
        <Settings className="w-5 h-5" />
        Einstellungen
      </button>
    </div>
  );
}
