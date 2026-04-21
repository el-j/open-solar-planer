import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Settings, Sun, Info, Maximize, RotateCw, GitFork, Move, Square, Trash2 } from 'lucide-react';
import { PRESETS, calculateLayout, panelOverlapsZone } from './layout';
import type { FreePanel, ExclusionZone } from './layout';

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

  // Free placement mode
  const [mode, setMode] = useState<'grid' | 'free'>('grid');
  const [freePanels, setFreePanels] = useState<FreePanel[]>([]);
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw-zone'>('select');

  // Drag state refs (avoids re-renders mid-drag)
  const dragRef = useRef<{
    type: 'panel' | 'zone-draw';
    id?: string;
    startX: number; // canvas px
    startY: number; // canvas px
    origX?: number; // cm
    origY?: number; // cm
    drawZoneId?: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
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

  // --- Free placement helpers ---
  const scaleFactor = useMemo(() => {
    const availableW = containerSize.width - 40;
    const availableH = containerSize.height - 40;
    if (roofWidth === 0 || roofHeight === 0) return 1;
    return Math.min(availableW / roofWidth, availableH / roofHeight);
  }, [containerSize, roofWidth, roofHeight]);

  const pxToCm = useCallback((px: number) => px / scaleFactor, [scaleFactor]);

  const clampPanel = useCallback(
    (x: number, y: number, w: number, h: number) => ({
      x: Math.round(Math.min(Math.max(0, x), Math.max(0, roofWidth - w))),
      y: Math.round(Math.min(Math.max(0, y), Math.max(0, roofHeight - h))),
    }),
    [roofWidth, roofHeight],
  );

  const effectiveDefaultW = isLandscape ? panelLength : panelWidth;
  const effectiveDefaultH = isLandscape ? panelWidth : panelLength;

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'free') return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const pxX = e.clientX - rect.left;
      const pxY = e.clientY - rect.top;

      if (activeTool === 'draw-zone') {
        const id = `zone-${Date.now()}`;
        setExclusionZones(prev => [
          ...prev,
          { id, x: Math.round(pxToCm(pxX)), y: Math.round(pxToCm(pxY)), width: 0, height: 0 },
        ]);
        dragRef.current = { type: 'zone-draw', startX: pxX, startY: pxY, drawZoneId: id };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        return;
      }

      // select tool: click on empty area → place new panel
      setSelectedId(null);
      const cmX = pxToCm(pxX);
      const cmY = pxToCm(pxY);
      const clamped = clampPanel(cmX - effectiveDefaultW / 2, cmY - effectiveDefaultH / 2, effectiveDefaultW, effectiveDefaultH);
      const id = `panel-${Date.now()}`;
      setFreePanels(prev => [
        ...prev,
        { id, x: clamped.x, y: clamped.y, width: effectiveDefaultW, height: effectiveDefaultH, power: panelPower },
      ]);
      setSelectedId(id);
    },
    [mode, activeTool, pxToCm, clampPanel, effectiveDefaultW, effectiveDefaultH, panelPower],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const pxX = e.clientX - rect.left;
      const pxY = e.clientY - rect.top;

      if (dragRef.current.type === 'zone-draw') {
        const startCmX = pxToCm(dragRef.current.startX);
        const startCmY = pxToCm(dragRef.current.startY);
        const curCmX = pxToCm(pxX);
        const curCmY = pxToCm(pxY);
        const zid = dragRef.current.drawZoneId!;
        setExclusionZones(prev =>
          prev.map(z =>
            z.id === zid
              ? {
                  ...z,
                  x: Math.round(Math.min(startCmX, curCmX)),
                  y: Math.round(Math.min(startCmY, curCmY)),
                  width: Math.round(Math.abs(curCmX - startCmX)),
                  height: Math.round(Math.abs(curCmY - startCmY)),
                }
              : z,
          ),
        );
      } else if (dragRef.current.type === 'panel' && dragRef.current.id) {
        const dxCm = pxToCm(pxX - dragRef.current.startX);
        const dyCm = pxToCm(pxY - dragRef.current.startY);
        const id = dragRef.current.id;
        setFreePanels(prev =>
          prev.map(p => {
            if (p.id !== id) return p;
            const clamped = clampPanel(
              (dragRef.current!.origX ?? p.x) + dxCm,
              (dragRef.current!.origY ?? p.y) + dyCm,
              p.width,
              p.height,
            );
            return { ...p, ...clamped };
          }),
        );
      }
    },
    [pxToCm, clampPanel],
  );

  const handleCanvasPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      const zid = dragRef.current.drawZoneId!;
      // Discard zones smaller than 2×2 cm — too small to be meaningful (accidental click without drag)
      setExclusionZones(prev => prev.filter(z => z.id !== zid || (z.width >= 2 && z.height >= 2)));
      setActiveTool('select');
    }
    dragRef.current = null;
  }, []);

  const handlePanelPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => {
      if (mode !== 'free') return;
      e.stopPropagation();
      setSelectedId(panel.id);
      const rect = canvasRef.current!.getBoundingClientRect();
      dragRef.current = {
        type: 'panel',
        id: panel.id,
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        origX: panel.x,
        origY: panel.y,
      };
      (canvasRef.current as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [mode],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    setFreePanels(prev => prev.filter(p => p.id !== selectedId));
    setExclusionZones(prev => prev.filter(z => z.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  // Delete key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) handleDeleteSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, handleDeleteSelected]);

  const selectedPanel = freePanels.find(p => p.id === selectedId) ?? null;
  const selectedZone = exclusionZones.find(z => z.id === selectedId) ?? null;

  const freeTotalPower = freePanels.reduce((sum, p) => sum + p.power, 0);

  // --- Grid Calculations ---
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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800">
      {/* --- Sidebar (Controls) --- */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shadow-sm z-10 shrink-0 order-2 md:order-none">
        <div className="p-5 border-b border-slate-200 bg-blue-600 text-white">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sun className="w-6 h-6 text-yellow-300" />
              PV Layout Planer
            </h1>
            <div className="flex items-center gap-1">
              <a
                href="https://github.com/el-j/open-solar-planer"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-blue-500 transition-colors"
                aria-label="Open GitHub repository"
              >
                <GitFork className="w-4 h-4 text-blue-100" />
              </a>
              <Link
                to="/about"
                className="p-1.5 rounded hover:bg-blue-500 transition-colors"
                aria-label="About this app"
              >
                <Info className="w-4 h-4 text-blue-100" />
              </Link>
            </div>
          </div>
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

          {/* Section: Mounting Gaps (grid only) */}
          {mode === 'grid' && (
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
          )}

          {/* Section: Free mode — selected panel editor */}
          {mode === 'free' && selectedPanel && (
            <section>
              <hr className="border-slate-200 mb-4" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Modul bearbeiten
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Breite (cm)</label>
                  <input
                    type="number"
                    value={selectedPanel.width}
                    onChange={e =>
                      setFreePanels(prev =>
                        prev.map(p => p.id === selectedPanel.id ? { ...p, width: Number(e.target.value) } : p)
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Selected panel width in cm"
                    data-testid="selected-panel-width"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Länge (cm)</label>
                  <input
                    type="number"
                    value={selectedPanel.height}
                    onChange={e =>
                      setFreePanels(prev =>
                        prev.map(p => p.id === selectedPanel.id ? { ...p, height: Number(e.target.value) } : p)
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Selected panel height in cm"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-slate-500 mb-1">Leistung (Wp)</label>
                <input
                  type="number"
                  value={selectedPanel.power}
                  onChange={e =>
                    setFreePanels(prev =>
                      prev.map(p => p.id === selectedPanel.id ? { ...p, power: Number(e.target.value) } : p)
                    )
                  }
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Selected panel power in Wp"
                />
              </div>
              <button
                onClick={handleDeleteSelected}
                className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 rounded transition-colors text-sm font-medium"
                aria-label="Delete selected panel"
                data-testid="selected-panel-delete"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            </section>
          )}

          {/* Section: Free mode — selected zone editor */}
          {mode === 'free' && selectedZone && (
            <section>
              <hr className="border-slate-200 mb-4" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Sperrzone bearbeiten
              </h2>
              <div className="mb-3">
                <label className="block text-xs text-slate-500 mb-1">Bezeichnung</label>
                <input
                  type="text"
                  value={selectedZone.label ?? ''}
                  onChange={e =>
                    setExclusionZones(prev =>
                      prev.map(z => z.id === selectedZone.id ? { ...z, label: e.target.value } : z)
                    )
                  }
                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  aria-label="Exclusion zone label"
                  placeholder="z.B. Kunststoff-Dach"
                />
              </div>
              <button
                onClick={handleDeleteSelected}
                className="w-full flex items-center justify-center gap-2 p-2 bg-red-50 hover:bg-red-100 border border-red-300 text-red-600 rounded transition-colors text-sm font-medium"
                aria-label="Delete selected zone"
              >
                <Trash2 className="w-4 h-4" />
                Zone löschen
              </button>
            </section>
          )}
        </div>
      </div>

      {/* --- Main View (Canvas / Grid) --- */}
      <div className="flex-1 flex flex-col relative bg-slate-200 order-1 md:order-none">
        {/* Top Info Bar */}
        <div className="bg-white p-3 flex justify-around items-center border-b border-slate-300 shadow-sm z-10 shrink-0 flex-wrap gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase font-semibold">Anzahl Module</p>
            <p className="text-2xl font-bold text-blue-600" data-testid="total-panels">
              {mode === 'free' ? freePanels.length : layout.totalPanels}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase font-semibold">Gesamtleistung</p>
            <p className="text-2xl font-bold text-green-600" data-testid="total-power">
              {mode === 'free'
                ? (freeTotalPower / 1000).toFixed(2)
                : (layout.totalPowerWp / 1000).toFixed(2)} kWp
            </p>
          </div>
          {mode === 'grid' && (
            <div className="text-center hidden sm:block">
              <p className="text-xs text-slate-500 uppercase font-semibold">Anordnung</p>
              <p className="text-lg font-medium text-slate-700" data-testid="layout-grid">{layout.cols} x {layout.rows}</p>
            </div>
          )}
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded p-1">
            <button
              onClick={() => setMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${mode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
              aria-label="Switch to grid mode"
              data-testid="mode-toggle"
            >
              <Settings className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setMode('free')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${mode === 'free' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
              aria-label="Switch to free placement mode"
            >
              <Move className="w-3.5 h-3.5" />
              Frei
            </button>
          </div>
          {/* Free mode tools */}
          {mode === 'free' && (
            <button
              onClick={() => setActiveTool(activeTool === 'draw-zone' ? 'select' : 'draw-zone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${activeTool === 'draw-zone' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              aria-label="Draw exclusion zone"
              data-testid="tool-draw-zone"
            >
              <Square className="w-3.5 h-3.5" />
              Sperrzone
            </button>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-5" ref={containerRef}>
          <div
            ref={canvasRef}
            className="relative shadow-xl border-2 border-slate-400 bg-slate-300 overflow-hidden"
            style={{
              width: `${roofWidth * scaleFactor}px`,
              height: `${roofHeight * scaleFactor}px`,
              backgroundImage: bgImage ? `url(${bgImage})` : 'none',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              cursor: mode === 'free'
                ? activeTool === 'draw-zone' ? 'crosshair' : 'cell'
                : 'default',
            }}
            data-testid="canvas"
            onPointerDown={mode === 'free' ? handleCanvasPointerDown : undefined}
            onPointerMove={mode === 'free' ? handleCanvasPointerMove : undefined}
            onPointerUp={mode === 'free' ? handleCanvasPointerUp : undefined}
          >
            {/* Grid Rendering (grid mode only) */}
            {mode === 'grid' && (
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
            )}

            {/* Free Placement Rendering */}
            {mode === 'free' && (
              <>
                {/* Exclusion zones */}
                {exclusionZones.map(zone => (
                  <div
                    key={zone.id}
                    className={`absolute border-2 flex items-center justify-center cursor-pointer transition-colors ${selectedId === zone.id ? 'border-orange-500 bg-orange-300/50' : 'border-orange-400 bg-orange-200/40 hover:bg-orange-200/60'}`}
                    style={{
                      left: `${zone.x * scaleFactor}px`,
                      top: `${zone.y * scaleFactor}px`,
                      width: `${zone.width * scaleFactor}px`,
                      height: `${zone.height * scaleFactor}px`,
                    }}
                    data-testid="exclusion-zone"
                    onPointerDown={e => {
                      e.stopPropagation();
                      setSelectedId(zone.id);
                    }}
                  >
                    {zone.label && zone.height * scaleFactor > 16 && (
                      <span className="text-orange-800 text-xs font-medium px-1 truncate max-w-full">{zone.label}</span>
                    )}
                  </div>
                ))}

                {/* Free panels */}
                {freePanels.map(panel => {
                  const overlapping = exclusionZones.some(z => panelOverlapsZone(panel, z));
                  const isSelected = selectedId === panel.id;
                  return (
                    <div
                      key={panel.id}
                      className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors ${overlapping ? 'bg-red-700/80 border-2 border-red-400' : isSelected ? 'bg-blue-700/90 border-2 border-yellow-300' : 'bg-blue-900/80 border border-blue-400 hover:bg-blue-800/90'}`}
                      style={{
                        left: `${panel.x * scaleFactor}px`,
                        top: `${panel.y * scaleFactor}px`,
                        width: `${panel.width * scaleFactor}px`,
                        height: `${panel.height * scaleFactor}px`,
                      }}
                      data-testid="free-panel"
                      onPointerDown={e => handlePanelPointerDown(e, panel)}
                    >
                      <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                          backgroundSize: `${(panel.width / 6) * scaleFactor}px ${(panel.height / 10) * scaleFactor}px`,
                        }}
                      />
                      {scaleFactor * Math.min(panel.width, panel.height) > 40 && (
                        <span className="text-white text-xs font-semibold z-10 opacity-70">
                          {panel.power}W
                          {overlapping && ' ⚠'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Empty state overlay if no space (grid mode only) */}
            {mode === 'grid' && layout.totalPanels === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm p-4 text-center">
                <Info className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-slate-800 font-medium">Fläche zu klein</p>
                <p className="text-sm text-slate-600">Die eingegebenen Maße sind zu klein für diese Modulgröße.</p>
              </div>
            )}

            {/* Free mode hint */}
            {mode === 'free' && freePanels.length === 0 && exclusionZones.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                <Move className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-slate-600 font-medium">Freie Platzierung</p>
                <p className="text-sm text-slate-500 mt-1">Klicken um ein Modul zu platzieren.</p>
                <p className="text-sm text-slate-500">„Sperrzone" aktivieren um Bereiche auszuschließen.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
