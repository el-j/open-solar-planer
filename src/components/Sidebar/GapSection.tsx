import { useGapStore } from '../../stores/GapStore';

export function GapSection() {
  const { gapX, gapY, setGapX, setGapY } = useGapStore();

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Montage-Abstände (cm)
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">X-Abstand</label>
          <input
            type="number"
            value={gapX}
            onChange={e => setGapX(Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded outline-none"
            aria-label="Horizontal gap between panels in cm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Y-Abstand</label>
          <input
            type="number"
            value={gapY}
            onChange={e => setGapY(Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded outline-none"
            aria-label="Vertical gap between panels in cm"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Bedarf für Mittel- und Endklemmen sowie thermische Ausdehnung.
      </p>
    </section>
  );
}
