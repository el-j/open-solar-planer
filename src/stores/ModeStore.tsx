/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PlacementMode, ActiveTool, MobileTab } from '../types';

type ModeState = {
  mode: PlacementMode;
  activeTool: ActiveTool;
  mobileTab: MobileTab;
};

type ModeActions = {
  setMode: (m: PlacementMode) => void;
  setActiveTool: (t: ActiveTool) => void;
  toggleActiveTool: () => void;
  setMobileTab: (t: MobileTab) => void;
};

type ModeContextValue = ModeState & ModeActions;

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PlacementMode>('grid');
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');

  const toggleActiveTool = () =>
    setActiveTool(prev => (prev === 'draw-zone' ? 'select' : 'draw-zone'));

  return (
    <ModeContext.Provider value={{ mode, activeTool, mobileTab, setMode, setActiveTool, toggleActiveTool, setMobileTab }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useModeStore(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (ctx === undefined) throw new Error('useModeStore must be used within ModeProvider');
  return ctx;
}
