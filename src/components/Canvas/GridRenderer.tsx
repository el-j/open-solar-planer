import { useLayout } from '../../hooks/useLayout';
import { useScaleFactor } from '../../hooks/useScaleFactor';
import { usePanelStore } from '../../stores/PanelStore';
import { useGapStore } from '../../stores/GapStore';

export function GridRenderer() {
  const layout = useLayout();
  const scaleFactor = useScaleFactor();
  const { panelPower } = usePanelStore();
  const { gapX, gapY } = useGapStore();

  return (
    <div
      className="absolute top-0 left-0"
      style={{
        paddingTop: `${(gapY / 2) * scaleFactor}px`,
        paddingLeft: `${(gapX / 2) * scaleFactor}px`,
      }}
    >
      {Array.from({ length: layout.rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex" style={{ marginBottom: `${gapY * scaleFactor}px` }}>
          {Array.from({ length: layout.cols }).map((_, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="bg-blue-900/80 border border-blue-400 shadow-sm flex items-center justify-center relative group hover:bg-blue-800/90 transition-colors cursor-pointer"
              style={{
                width: `${layout.effectivePanelWidth * scaleFactor}px`,
                height: `${layout.effectivePanelHeight * scaleFactor}px`,
                marginRight: `${gapX * scaleFactor}px`,
              }}
              data-testid="panel"
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                  backgroundSize: `${(layout.effectivePanelWidth / 6) * scaleFactor}px ${(layout.effectivePanelHeight / 10) * scaleFactor}px`,
                }}
              />
              {scaleFactor * Math.min(layout.effectivePanelWidth, layout.effectivePanelHeight) > 40 && (
                <span className="text-white text-xs font-semibold z-10 opacity-50 group-hover:opacity-100">
                  {panelPower}W
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
