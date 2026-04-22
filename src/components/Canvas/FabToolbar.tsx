import { MousePointer, Square, Trash2 } from 'lucide-react';
import { useModeStore } from '../../stores/ModeStore';
import { useFreePlacementStore } from '../../stores/FreePlacementStore';

export function FabToolbar() {
  const { activeTool, setActiveTool, toggleActiveTool } = useModeStore();
  const { selectedId, deleteSelected } = useFreePlacementStore();

  return (
    <div
      className="absolute bottom-4 right-4 z-30 flex flex-col gap-2"
      aria-label="Canvas tools"
      data-testid="floating-toolbar"
    >
      <button
        onClick={() => setActiveTool('select')}
        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          activeTool === 'select' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
        }`}
        aria-label="Select tool"
        data-testid="fab-select"
      >
        <MousePointer className="w-5 h-5" />
      </button>
      <button
        onClick={toggleActiveTool}
        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          activeTool === 'draw-zone' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
        }`}
        aria-label="Draw exclusion zone"
        data-testid="tool-draw-zone"
      >
        <Square className="w-5 h-5" />
      </button>
      {selectedId && (
        <button
          onClick={deleteSelected}
          className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
          aria-label="Delete selected"
          data-testid="fab-delete-selected"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
