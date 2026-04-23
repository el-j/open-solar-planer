/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type GapState = {
  gapX: number;
  gapY: number;
};

type GapActions = {
  setGapX: (v: number) => void;
  setGapY: (v: number) => void;
};

type GapContextValue = GapState & GapActions;

const GapContext = createContext<GapContextValue | undefined>(undefined);

export function GapProvider({ children }: { children: ReactNode }) {
  const [gapX, setGapX] = useState<number>(2);
  const [gapY, setGapY] = useState<number>(2);

  return (
    <GapContext.Provider value={{ gapX, gapY, setGapX, setGapY }}>
      {children}
    </GapContext.Provider>
  );
}

export function useGapStore(): GapContextValue {
  const ctx = useContext(GapContext);
  if (ctx === undefined) throw new Error('useGapStore must be used within GapProvider');
  return ctx;
}
