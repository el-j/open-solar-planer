import { AppHeader } from './AppHeader';
import { RoofSection } from './RoofSection';
import { PanelPresetSection } from './PanelPresetSection';
import { GapSection } from './GapSection';
import { FreePanelEditor } from './FreePanelEditor';
import { ExclusionZoneEditor } from './ExclusionZoneEditor';
import { useModeStore } from '../../stores/ModeStore';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';

type SidebarProps = {
  className?: string;
};

export function Sidebar({ className = '' }: SidebarProps) {
  const { mode } = useModeStore();
  const { selectedId, freePanels, exclusionZones } = useFreePlacementStore();

  const hasSelectedPanel = freePanels.some(p => p.id === selectedId);
  const hasSelectedZone = exclusionZones.some(z => z.id === selectedId);

  return (
    <div className={`w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shadow-sm z-10 shrink-0 ${className}`}>
      <AppHeader />
      <div className="p-5 space-y-6">
        <RoofSection />
        <hr className="border-slate-200" />
        <PanelPresetSection />
        <hr className="border-slate-200" />
        {mode === 'grid' && <GapSection />}
        {mode === 'free' && hasSelectedPanel && <FreePanelEditor />}
        {mode === 'free' && hasSelectedZone && <ExclusionZoneEditor />}
      </div>
    </div>
  );
}
