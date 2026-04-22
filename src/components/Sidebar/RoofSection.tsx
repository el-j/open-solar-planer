import { Maximize, Upload } from 'lucide-react';
import { useRoofStore } from '../../stores/RoofStore';
import { useCanvasStore } from '../../stores/CanvasStore';
import { useImageUpload } from '../../hooks/useImageUpload';

export function RoofSection() {
  const { roofWidth, roofHeight, setRoofWidth, setRoofHeight } = useRoofStore();
  const { bgImage } = useCanvasStore();
  const { handleImageUpload, clearImage } = useImageUpload();

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Maximize className="w-4 h-4" />
        Grundfläche (cm)
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Breite (X)</label>
          <input
            type="number"
            value={roofWidth}
            onChange={e => setRoofWidth(Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Roof width in cm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Länge (Y)</label>
          <input
            type="number"
            value={roofHeight}
            onChange={e => setRoofHeight(Number(e.target.value))}
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            aria-label="Roof height in cm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Hintergrundbild (Draufsicht)</label>
        <label className="cursor-pointer flex items-center justify-center gap-2 w-full p-2 border-2 border-dashed border-slate-300 rounded hover:bg-slate-50 hover:border-blue-400 transition-colors">
          <Upload className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">{bgImage ? 'Bild ändern' : 'Bild hochladen'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            aria-label="Upload background image"
          />
        </label>
        {bgImage && (
          <button onClick={clearImage} className="text-xs text-red-500 mt-1 hover:underline">
            Bild entfernen
          </button>
        )}
      </div>
    </section>
  );
}
