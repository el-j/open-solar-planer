/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { PRESETS } from '../constants';

type PanelState = {
  selectedPreset: string;
  panelWidth: number;
  panelLength: number;
  panelPower: number;
  isLandscape: boolean;
};

type PanelActions = {
  setSelectedPreset: (id: string) => void;
  setPanelWidth: (v: number) => void;
  setPanelLength: (v: number) => void;
  setPanelPower: (v: number) => void;
  toggleOrientation: () => void;
  /** Apply a preset by ID. If 'custom', only updates selectedPreset. */
  applyPreset: (presetId: string) => void;
  /** Mark selectedPreset as 'custom' without changing dimensions. */
  markCustom: () => void;
};

type PanelContextValue = PanelState & PanelActions;

const PanelContext = createContext<PanelContextValue | undefined>(undefined);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [selectedPreset, setSelectedPreset] = useState<string>('standard');
  const [panelWidth, setPanelWidth] = useState<number>(113);
  const [panelLength, setPanelLength] = useState<number>(172);
  const [panelPower, setPanelPower] = useState<number>(400);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  const toggleOrientation = () => setIsLandscape(prev => !prev);

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') return;
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setPanelWidth(preset.width);
      setPanelLength(preset.length);
      setPanelPower(preset.power);
    }
  };

  const markCustom = () => {
    if (selectedPreset !== 'custom') setSelectedPreset('custom');
  };

  return (
    <PanelContext.Provider value={{
      selectedPreset, panelWidth, panelLength, panelPower, isLandscape,
      setSelectedPreset, setPanelWidth, setPanelLength, setPanelPower,
      toggleOrientation, applyPreset, markCustom,
    }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelStore(): PanelContextValue {
  const ctx = useContext(PanelContext);
  if (ctx === undefined) throw new Error('usePanelStore must be used within PanelProvider');
  return ctx;
}
