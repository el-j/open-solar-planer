/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type RoofState = {
  roofWidth: number;
  roofHeight: number;
};

type RoofActions = {
  setRoofWidth: (v: number) => void;
  setRoofHeight: (v: number) => void;
};

type RoofContextValue = RoofState & RoofActions;

const RoofContext = createContext<RoofContextValue | undefined>(undefined);

export function RoofProvider({ children }: { children: ReactNode }) {
  const [roofWidth, setRoofWidth] = useState<number>(500);
  const [roofHeight, setRoofHeight] = useState<number>(300);

  return (
    <RoofContext.Provider value={{ roofWidth, roofHeight, setRoofWidth, setRoofHeight }}>
      {children}
    </RoofContext.Provider>
  );
}

export function useRoofStore(): RoofContextValue {
  const ctx = useContext(RoofContext);
  if (ctx === undefined) throw new Error('useRoofStore must be used within RoofProvider');
  return ctx;
}
