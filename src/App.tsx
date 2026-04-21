import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, Settings, Sun, Info, Maximize, RotateCw } from 'lucide-react';

// --- Types & Constants ---

export type PanelPreset = {
  id: string;
  name: string;
  width: number; // cm
  length: number; // cm
  power: number; // Wp
};

export const PRESETS: PanelPreset[] = [
  { id: 'standard', name: 'Standard Modul (ca. 400W)', width: 113, length: 172, power: 400 },
  { id: 'xl', name: 'XL Modul (ca. 500W)', width: 113, length: 209, power: 500 },
  { id: 'bkw', name: 'Balkonkraftwerk (Kompakt)', width: 100, length: 165, power: 300 },
  { id: 'custom', name: 'Benutzerdefiniert...', width: 100, length: 170, power: 350 },
];

export type LayoutResult = {
  cols: number;
  rows: number;
  totalPanels: number;
  totalPowerWp: number;
  effectivePanelWidth: number;
  effectivePanelHeight: number;
};

export function calculateLayout(
  roofWidth: number,
  roofHeight: number,
  panelWidth: number,
  panelLength: number,
  panelPower: number,
  isLandscape: boolean,
  gapX: number,
  gapY: number,
): LayoutResult {
  const effectivePanelWidth = isLandscape ? panelLength : panelWidth;
  const effectivePanelHeight = isLandscape ? panelWidth : panelLength;

  const cols = Math.floor((roofWidth + gapX) / (effectivePanelWidth + gapX));
  const rows = Math.floor((roofHeight + gapY) / (effectivePanelHeight + gapY));

  const validCols = Math.max(0, cols);
  const validRows = Math.max(0, rows);

  const totalPanels = validCols * validRows;
  const totalPowerWp = totalPanels * panelPower;

  return {
    cols: validCols,
    rows: validRows,
    totalPanels,
    totalPowerWp,
    effectivePanelWidth,
    effectivePanelHeight,
  };
}

export default function App() {
  // --- State ---
  const [bgImage, setBgImage] = useState<string | null>(null);

  // Roof dimensions (in cm)
  const [roofWidth, setRoofWidth] = useState<number>(500);
  const [roofHeight, setRoofHeight] = useState<number>(300);

  // Module settings
  const [selectedPreset, setSelectedPreset] = useState<string>('standard');
  const [panelWidth, setPanelWidth] = useState<number>(113);
  const [panelLength, setPanelLength] = useState<number>(172);
  const [panelPower, setPanelPower] = useState<number>(400);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  // Mounting gaps (in cm)
  const [gapX, setGapX] = useState<number>(2);
  const [gapY, setGapY] = useState<number>(2);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Update Preset
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPreset(presetId);
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setPanelWidth(preset.width);
      setPanelLength(preset.length);
      setPanelPower(preset.power);
    }
  };

  // Switch to custom if manual edit
  const handleManualEdit = () => {
    if (selectedPreset !== 'custom') setSelectedPreset('custom');
  };

  // Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Resize Observer for the canvas area
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // --- Calculations ---
  const layout = useMemo(
    () =>
      calculateLayout(
        roofWidth,
        roofHeight,
        panelWidth,
        panelLength,
        panelPower,
        isLandscape,
        gapX,
        gapY,
      ),
    [roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY],
  );

  // Scale factor for the visualization (pixels per cm)
  const scaleFactor = useMemo(() => {
    const availableW = containerSize.width - 40;
    const availableH = containerSize.height - 40;

    if (roofWidth === 0 || roofHeight === 0) return 1;

    const scaleX = availableW / roofWidth;
    const scaleY = availableH / roofHeight;

    return Math.min(scaleX, scaleY);
  }, [containerSize, roofWidth, roofHeight]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800">
      {/* --- Sidebar (Controls) --- */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shadow-sm z-10">
        <div className="p-5 border-b border-slate-200 bg-blue-600 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sun className="w-6 h-6 text-yellow-300" />
            PV Layout Planer
          </h1>
          <p className="text-blue-100 text-sm mt-1">Open Source Solar Tool</p>
        </div>

        <div className="p-5 space-y-6">
          {/* Section: Background & Area */}
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
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Upload background image" />
              </label>
              {bgImage && (
                <button onClick={() => setBgImage(null)} className="text-xs text-red-500 mt-1 hover:underline">
                  Bild entfernen
                </button>
              )}
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Section: Solar Modules */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Solarmodule
            </h2>

            <div className="mb-3">
              <label className="block text-xs text-slate-500 mb-1">Panel-Vorgaben</label>
              <select
                value={selectedPreset}
                onChange={handlePresetChange}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                aria-label="Panel preset"
              >
                {PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Breite (cm)</label>
                <input
                  type="number"
                  value={panelWidth}
                  onChange={e => { setPanelWidth(Number(e.target.value)); handleManualEdit(); }}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Panel width in cm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Länge (cm)</label>
                <input
                  type="number"
                  value={panelLength}
                  onChange={e => { setPanelLength(Number(e.target.value)); handleManualEdit(); }}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Panel length in cm"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1">Leistung pro Modul (Wp)</label>
              <input
                type="number"
                value={panelPower}
                onChange={e => { setPanelPower(Number(e.target.value)); handleManualEdit(); }}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                aria-label="Panel power in Wp"
              />
            </div>

            <button
              onClick={() => setIsLandscape(!isLandscape)}
              className="w-full flex items-center justify-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors text-sm font-medium"
              aria-label={isLandscape ? 'Switch to portrait orientation' : 'Switch to landscape orientation'}
            >
              <RotateCw className={`w-4 h-4 transition-transform ${isLandscape ? 'rotate-90' : ''}`} />
              {isLandscape ? 'Querformat (Landscape)' : 'Hochformat (Portrait)'}
            </button>
          </section>

          <hr className="border-slate-200" />

          {/* Section: Mounting Gaps */}
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
        </div>
      </div>

      {/* --- Main View (Canvas / Grid) --- */}
      <div className="flex-1 flex flex-col relative bg-slate-200">
        {/* Top Info Bar */}
        <div className="bg-white p-4 flex justify-around items-center border-b border-slate-300 shadow-sm z-10 shrink-0 flex-wrap gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase font-semibold">Anzahl Module</p>
            <p className="text-2xl font-bold text-blue-600" data-testid="total-panels">{layout.totalPanels}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase font-semibold">Gesamtleistung</p>
            <p className="text-2xl font-bold text-green-600" data-testid="total-power">{(layout.totalPowerWp / 1000).toFixed(2)} kWp</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-xs text-slate-500 uppercase font-semibold">Anordnung</p>
            <p className="text-lg font-medium text-slate-700" data-testid="layout-grid">{layout.cols} x {layout.rows}</p>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-5" ref={containerRef}>
          <div
            className="relative shadow-xl border-2 border-slate-400 bg-slate-300 overflow-hidden"
            style={{
              width: `${roofWidth * scaleFactor}px`,
              height: `${roofHeight * scaleFactor}px`,
              backgroundImage: bgImage ? `url(${bgImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            data-testid="canvas"
          >
            {/* Grid Rendering */}
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
                      {/* Grid lines inside panel */}
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

            {/* Empty state overlay if no space */}
            {layout.totalPanels === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm p-4 text-center">
                <Info className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-slate-800 font-medium">Fläche zu klein</p>
                <p className="text-sm text-slate-600">Die eingegebenen Maße sind zu klein für diese Modulgröße.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
