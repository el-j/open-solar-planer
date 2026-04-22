import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Settings, Sun, Info, Maximize, RotateCw, GitFork, Move, Square, Trash2, MousePointer } from 'lucide-react';
import { PRESETS, calculateLayout, panelOverlapsZone, clampZoneToBounds } from './layout';
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

  // Mobile tab navigation
  const [mobileTab, setMobileTab] = useState<'canvas' | 'settings'>('canvas');

  // Free placement mode
  const [mode, setMode] = useState<'grid' | 'free'>('grid');
  const [freePanels, setFreePanels] = useState<FreePanel[]>([]);
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw-zone'>('select');

  // Zoom state for pinch-to-zoom
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Drag state refs (avoids re-renders mid-drag)
  const dragRef = useRef<{
    type: 'panel' | 'zone-draw' | 'zone-move';
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

  // Per-pointer tracking for pinch-to-zoom (two-finger gesture)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);

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

  const pxToCm = useCallback((px: number) => px / (scaleFactor * zoomScale), [scaleFactor, zoomScale]);

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

      // Track all active pointer positions for pinch detection
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Two-finger touch → start pinch zoom; cancel any ongoing single-pointer drag
      if (e.pointerType === 'touch' && activePointers.current.size >= 2) {
        const pts = Array.from(activePointers.current.values()).slice(0, 2);
        lastPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (dragRef.current) {
          if (dragRef.current.type === 'zone-draw') {
            const zid = dragRef.current.drawZoneId!;
            setExclusionZones(prev => prev.filter(z => z.id !== zid));
            setActiveTool('select');
          }
          dragRef.current = null;
        }
        return;
      }

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      // Clamp pointer position to canvas bounds to prevent out-of-bounds zones on mobile
      const pxX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
      const pxY = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

      if (activeTool === 'draw-zone') {
        const cmX = pxToCm(pxX);
        const cmY = pxToCm(pxY);
        const id = `zone-${Date.now()}`;
        setExclusionZones(prev => [
          ...prev,
          { id, x: Math.round(cmX), y: Math.round(cmY), width: 0, height: 0 },
        ]);
        dragRef.current = { type: 'zone-draw', startX: pxX, startY: pxY, drawZoneId: id };
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
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
      // Keep pointer position up to date for pinch calculation
      if (activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Pinch zoom: two touch pointers active
      if (e.pointerType === 'touch' && activePointers.current.size >= 2 && lastPinchDist.current !== null) {
        const pts = Array.from(activePointers.current.values()).slice(0, 2);
        const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const ratio = newDist / lastPinchDist.current;
        setZoomScale(prev => Math.min(4, Math.max(0.5, prev * ratio)));
        lastPinchDist.current = newDist;
        return;
      }

      if (!dragRef.current) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      // Clamp pointer to canvas bounds so zone edges never escape the roof area
      const pxX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
      const pxY = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

      if (dragRef.current.type === 'zone-draw') {
        const startCmX = pxToCm(dragRef.current.startX);
        const startCmY = pxToCm(dragRef.current.startY);
        const curCmX = pxToCm(pxX);
        const curCmY = pxToCm(pxY);
        const zid = dragRef.current.drawZoneId!;
        const clamped = clampZoneToBounds(
          Math.min(startCmX, curCmX),
          Math.min(startCmY, curCmY),
          Math.abs(curCmX - startCmX),
          Math.abs(curCmY - startCmY),
          roofWidth,
          roofHeight,
        );
        setExclusionZones(prev =>
          prev.map(z => (z.id === zid ? { ...z, ...clamped } : z)),
        );
      } else if (dragRef.current.type === 'zone-move' && dragRef.current.id) {
        const dxCm = pxToCm(pxX - dragRef.current.startX);
        const dyCm = pxToCm(pxY - dragRef.current.startY);
        const id = dragRef.current.id;
        setExclusionZones(prev =>
          prev.map(z => {
            if (z.id !== id) return z;
            const c = clampPanel(
              (dragRef.current!.origX ?? z.x) + dxCm,
              (dragRef.current!.origY ?? z.y) + dyCm,
              z.width,
              z.height,
            );
            return { ...z, ...c };
          }),
        );
      } else if (dragRef.current.type === 'panel' && dragRef.current.id) {
        const dxCm = pxToCm(pxX - dragRef.current.startX);
        const dyCm = pxToCm(pxY - dragRef.current.startY);
        const id = dragRef.current.id;
        setFreePanels(prev =>
          prev.map(p => {
            if (p.id !== id) return p;
            const c = clampPanel(
              (dragRef.current!.origX ?? p.x) + dxCm,
              (dragRef.current!.origY ?? p.y) + dyCm,
              p.width,
              p.height,
            );
            return { ...p, ...c };
          }),
        );
      }
    },
    [pxToCm, clampPanel, roofWidth, roofHeight],
  );

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = null;
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      const zid = dragRef.current.drawZoneId!;
      // Discard zones smaller than 2×2 cm — too small to be meaningful (accidental click without drag)
      setExclusionZones(prev => prev.filter(z => z.id !== zid || (z.width >= 2 && z.height >= 2)));
      setActiveTool('select');
      // Auto-select the newly drawn zone so the user can immediately see and adjust its properties
      setSelectedId(zid);
    }
    dragRef.current = null;
  }, []);

  // Cancel handler: browser took over the pointer (e.g. scroll gesture on mobile).
  // Discard any in-progress zone draw, reset the active tool, and clear drag state.
  const handleCanvasPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) lastPinchDist.current = null;
    if (!dragRef.current) return;
    if (dragRef.current.type === 'zone-draw') {
      const zid = dragRef.current.drawZoneId!;
      setExclusionZones(prev => prev.filter(z => z.id !== zid));
      setActiveTool('select');
    }
    dragRef.current = null;
  }, []);

  const handlePanelPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, panel: FreePanel) => {
      if (mode !== 'free') return;
      e.stopPropagation();
      // Ignore a second pointer while already dragging (prevents ghost panels on multi-touch)
      if (dragRef.current) return;
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
      (canvasRef.current as HTMLDivElement).setPointerCapture?.(e.pointerId);
    },
    [mode],
  );

  const handleZonePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, zone: ExclusionZone) => {
      if (mode !== 'free') return;
      e.stopPropagation();
      if (dragRef.current) return;
      setSelectedId(zone.id);
      const rect = canvasRef.current!.getBoundingClientRect();
      dragRef.current = {
        type: 'zone-move',
        id: zone.id,
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        origX: zone.x,
        origY: zone.y,
      };
      (canvasRef.current as HTMLDivElement).setPointerCapture?.(e.pointerId);
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
      {/* --- Mobile-only stats bar (visible on settings tab only) --- */}
      {mobileTab === 'settings' && (
      <div
        className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex justify-around items-center shrink-0 shadow-sm z-10"
        aria-label="Summary stats"
      >
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase font-semibold">Anzahl Module</p>
          <p className="text-xl font-bold text-blue-600">
            {mode === 'free' ? freePanels.length : layout.totalPanels}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase font-semibold">Gesamtleistung</p>
          <p className="text-xl font-bold text-green-600">
            {mode === 'free'
              ? (freeTotalPower / 1000).toFixed(2)
              : (layout.totalPowerWp / 1000).toFixed(2)} kWp
          </p>
        </div>
      </div>
      )}

      {/* --- Sidebar (Controls) --- */}
      <div className={`w-full md:w-80 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shadow-sm z-10 shrink-0 ${mobileTab !== 'settings' ? 'hidden md:flex' : ''}`}>
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
                  <label className="block text-xs text-slate-500 mb-1">X-Position (cm)</label>
                  <input
                    type="number"
                    value={selectedPanel.x}
                    onChange={e =>
                      setFreePanels(prev =>
                        prev.map(p => {
                          if (p.id !== selectedPanel.id) return p;
                          const c = clampPanel(Number(e.target.value), p.y, p.width, p.height);
                          return { ...p, x: c.x };
                        })
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Selected panel X position in cm"
                    data-testid="selected-panel-x"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Y-Position (cm)</label>
                  <input
                    type="number"
                    value={selectedPanel.y}
                    onChange={e =>
                      setFreePanels(prev =>
                        prev.map(p => {
                          if (p.id !== selectedPanel.id) return p;
                          const c = clampPanel(p.x, Number(e.target.value), p.width, p.height);
                          return { ...p, y: c.y };
                        })
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Selected panel Y position in cm"
                    data-testid="selected-panel-y"
                  />
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">X-Position (cm)</label>
                  <input
                    type="number"
                    value={selectedZone.x}
                    onChange={e =>
                      setExclusionZones(prev =>
                        prev.map(z => {
                          if (z.id !== selectedZone.id) return z;
                          const c = clampPanel(Number(e.target.value), z.y, z.width, z.height);
                          return { ...z, x: c.x };
                        })
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Exclusion zone X position in cm"
                    data-testid="selected-zone-x"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Y-Position (cm)</label>
                  <input
                    type="number"
                    value={selectedZone.y}
                    onChange={e =>
                      setExclusionZones(prev =>
                        prev.map(z => {
                          if (z.id !== selectedZone.id) return z;
                          const c = clampPanel(z.x, Number(e.target.value), z.width, z.height);
                          return { ...z, y: c.y };
                        })
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Exclusion zone Y position in cm"
                    data-testid="selected-zone-y"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Breite (cm)</label>
                  <input
                    type="number"
                    value={selectedZone.width}
                    onChange={e =>
                      setExclusionZones(prev =>
                        prev.map(z => z.id === selectedZone.id ? { ...z, width: Math.max(0, Number(e.target.value)) } : z)
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Exclusion zone width in cm"
                    data-testid="selected-zone-width"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Höhe (cm)</label>
                  <input
                    type="number"
                    value={selectedZone.height}
                    onChange={e =>
                      setExclusionZones(prev =>
                        prev.map(z => z.id === selectedZone.id ? { ...z, height: Math.max(0, Number(e.target.value)) } : z)
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    aria-label="Exclusion zone height in cm"
                    data-testid="selected-zone-height"
                  />
                </div>
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
      <div className={`flex-1 flex flex-col relative bg-slate-200 ${mobileTab !== 'canvas' ? 'hidden md:flex' : ''}`}>
        {/* Top Info Bar — compact single-row HUD */}
        <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-slate-300 shadow-sm z-10 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase font-semibold leading-none">Module</p>
              <p className="text-xl font-bold text-blue-600" data-testid="total-panels">
                {mode === 'free' ? freePanels.length : layout.totalPanels}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 uppercase font-semibold leading-none">Leistung</p>
              <p className="text-xl font-bold text-green-600" data-testid="total-power">
                {mode === 'free'
                  ? (freeTotalPower / 1000).toFixed(2)
                  : (layout.totalPowerWp / 1000).toFixed(2)} kWp
              </p>
            </div>
            {mode === 'grid' && (
              <div className="text-center hidden sm:block">
                <p className="text-xs text-slate-500 uppercase font-semibold leading-none">Anordnung</p>
                <p className="text-base font-medium text-slate-700" data-testid="layout-grid">{layout.cols} x {layout.rows}</p>
              </div>
            )}
          </div>
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
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-5 touch-none" ref={containerRef} style={{ overscrollBehavior: 'none' }}>
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
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
            }}
            data-testid="canvas"
            onPointerDown={mode === 'free' ? handleCanvasPointerDown : undefined}
            onPointerMove={mode === 'free' ? handleCanvasPointerMove : undefined}
            onPointerUp={mode === 'free' ? handleCanvasPointerUp : undefined}
            onPointerCancel={mode === 'free' ? handleCanvasPointerCancel : undefined}
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
                    className={`absolute border-2 flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors ${selectedId === zone.id ? 'border-orange-500 bg-orange-300/50' : 'border-orange-400 bg-orange-200/40 hover:bg-orange-200/60'}`}
                    style={{
                      left: `${zone.x * scaleFactor}px`,
                      top: `${zone.y * scaleFactor}px`,
                      width: `${zone.width * scaleFactor}px`,
                      height: `${zone.height * scaleFactor}px`,
                    }}
                    data-testid="exclusion-zone"
                    onPointerDown={e => handleZonePointerDown(e, zone)}
                  >
                    {zone.label && zone.height * scaleFactor > 16 && (
                      <span className="text-orange-800 text-xs font-medium px-1 truncate max-w-full">{zone.label}</span>
                    )}
                    {/* Inline delete handle for selected zone (mobile-friendly touch target) */}
                    {selectedId === zone.id && (
                      <button
                        className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center z-20 shadow-md hover:bg-red-600 transition-colors"
                        style={{ pointerEvents: 'auto' }}
                        onClick={e => { e.stopPropagation(); handleDeleteSelected(); }}
                        onPointerDown={e => e.stopPropagation()}
                        aria-label="Delete exclusion zone"
                        data-testid="inline-zone-delete"
                      >
                        <span className="text-sm font-bold leading-none">×</span>
                      </button>
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
                      {/* Inline delete handle for selected panel (mobile-friendly touch target) */}
                      {isSelected && (
                        <button
                          className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center z-20 shadow-md hover:bg-red-600 transition-colors"
                          style={{ pointerEvents: 'auto' }}
                          onClick={e => { e.stopPropagation(); handleDeleteSelected(); }}
                          onPointerDown={e => e.stopPropagation()}
                          aria-label="Delete panel"
                          data-testid="inline-panel-delete"
                        >
                          <span className="text-sm font-bold leading-none">×</span>
                        </button>
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

          {/* Floating toolbar — visible in free mode only (FAB-style, z-index above zones) */}
          {mode === 'free' && (
            <div
              className="absolute bottom-4 right-4 z-30 flex flex-col gap-2"
              aria-label="Canvas tools"
              data-testid="floating-toolbar"
            >
              <button
                onClick={() => setActiveTool('select')}
                className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${activeTool === 'select' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                aria-label="Select tool"
                data-testid="fab-select"
              >
                <MousePointer className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'draw-zone' ? 'select' : 'draw-zone')}
                className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${activeTool === 'draw-zone' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                aria-label="Draw exclusion zone"
                data-testid="tool-draw-zone"
              >
                <Square className="w-5 h-5" />
              </button>
              {selectedId && (
                <button
                  onClick={handleDeleteSelected}
                  className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
                  aria-label="Delete selected"
                  data-testid="fab-delete-selected"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Bottom HUD — position & size controls for selected item in free mode */}
          {mode === 'free' && (selectedPanel !== null || selectedZone !== null) && (
            <div
              className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-300 shadow-lg"
              data-testid="selection-hud"
            >
              <div className="flex items-center gap-x-3 gap-y-1 px-3 py-2 pr-16 flex-wrap text-xs">
                <span className="font-semibold text-slate-500 uppercase shrink-0">
                  {selectedPanel ? 'Modul' : 'Sperrzone'}
                </span>
                <label className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-500 font-medium">X</span>
                  <input
                    type="number"
                    className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                    value={selectedPanel ? selectedPanel.x : selectedZone!.x}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (selectedPanel) {
                        setFreePanels(prev => prev.map(p => {
                          if (p.id !== selectedPanel.id) return p;
                          return { ...p, x: clampPanel(val, p.y, p.width, p.height).x };
                        }));
                      } else {
                        setExclusionZones(prev => prev.map(z => {
                          if (z.id !== selectedZone!.id) return z;
                          return { ...z, x: clampPanel(val, z.y, z.width, z.height).x };
                        }));
                      }
                    }}
                    aria-label="Selected item X position in cm"
                    data-testid="hud-x"
                  />
                </label>
                <label className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-500 font-medium">Y</span>
                  <input
                    type="number"
                    className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                    value={selectedPanel ? selectedPanel.y : selectedZone!.y}
                    onChange={e => {
                      const val = Number(e.target.value);
                      if (selectedPanel) {
                        setFreePanels(prev => prev.map(p => {
                          if (p.id !== selectedPanel.id) return p;
                          return { ...p, y: clampPanel(p.x, val, p.width, p.height).y };
                        }));
                      } else {
                        setExclusionZones(prev => prev.map(z => {
                          if (z.id !== selectedZone!.id) return z;
                          return { ...z, y: clampPanel(z.x, val, z.width, z.height).y };
                        }));
                      }
                    }}
                    aria-label="Selected item Y position in cm"
                    data-testid="hud-y"
                  />
                </label>
                <label className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-500 font-medium">B</span>
                  <input
                    type="number"
                    className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                    value={selectedPanel ? selectedPanel.width : selectedZone!.width}
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value));
                      if (selectedPanel) {
                        setFreePanels(prev => prev.map(p => p.id === selectedPanel.id ? { ...p, width: val } : p));
                      } else {
                        setExclusionZones(prev => prev.map(z => z.id === selectedZone!.id ? { ...z, width: val } : z));
                      }
                    }}
                    aria-label="Selected item width in cm"
                    data-testid="hud-width"
                  />
                </label>
                <label className="flex items-center gap-1 shrink-0">
                  <span className="text-slate-500 font-medium">H</span>
                  <input
                    type="number"
                    className="w-16 px-1.5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                    value={selectedPanel ? selectedPanel.height : selectedZone!.height}
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value));
                      if (selectedPanel) {
                        setFreePanels(prev => prev.map(p => p.id === selectedPanel.id ? { ...p, height: val } : p));
                      } else {
                        setExclusionZones(prev => prev.map(z => z.id === selectedZone!.id ? { ...z, height: val } : z));
                      }
                    }}
                    aria-label="Selected item height in cm"
                    data-testid="hud-height"
                  />
                </label>
                <span className="text-slate-400 shrink-0">cm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Mobile bottom tab navigation --- */}
      <div className="md:hidden flex border-t border-slate-200 bg-white shrink-0" role="tablist" aria-label="Mobile navigation">
        <button
          role="tab"
          aria-selected={mobileTab === 'canvas'}
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium gap-1 transition-colors ${mobileTab === 'canvas' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'}`}
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
          className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium gap-1 transition-colors ${mobileTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700'}`}
          aria-label="Show settings"
          data-testid="mobile-tab-settings"
        >
          <Settings className="w-5 h-5" />
          Einstellungen
        </button>
      </div>
    </div>
  );
}
