import { RoofProvider } from './stores/RoofStore';
import { PanelProvider } from './stores/PanelStore';
import { GapProvider } from './stores/GapStore';
import { FreePlacementProvider } from './stores/FreePlacementStore';
import { ModeProvider } from './stores/ModeStore';
import { CanvasProvider } from './stores/CanvasStore';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatsBar } from './components/StatsBar/StatsBar';
import { MobileStatsBar } from './components/StatsBar/MobileStatsBar';
import { ModeToggle } from './components/ModeControls/ModeToggle';
import { CanvasArea } from './components/Canvas/CanvasArea';
import { MobileNav } from './components/MobileNav/MobileNav';
import { useModeStore } from './stores/ModeStore';

function PlannerLayout() {
  const { mobileTab } = useModeStore();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800">
      {/* Mobile-only stats bar (visible on settings tab only) */}
      {mobileTab === 'settings' && <MobileStatsBar />}

      {/* Sidebar */}
      <Sidebar className={mobileTab !== 'settings' ? 'hidden md:flex' : ''} />

      {/* Main canvas area */}
      <div className={`flex-1 flex flex-col relative bg-slate-200 ${mobileTab !== 'canvas' ? 'hidden md:flex' : ''}`}>
        {/* Top HUD bar */}
        <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-slate-300 shadow-sm z-10 shrink-0 gap-2 flex-wrap">
          <StatsBar />
          <ModeToggle />
        </div>

        <CanvasArea />
      </div>

      {/* Mobile bottom tab navigation */}
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <RoofProvider>
      <PanelProvider>
        <GapProvider>
          <FreePlacementProvider>
            <ModeProvider>
              <CanvasProvider>
                <PlannerLayout />
              </CanvasProvider>
            </ModeProvider>
          </FreePlacementProvider>
        </GapProvider>
      </PanelProvider>
    </RoofProvider>
  );
}
