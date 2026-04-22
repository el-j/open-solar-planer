/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type CanvasState = {
  bgImage: string | null;
  containerSize: { width: number; height: number };
  zoomScale: number;
};

type CanvasActions = {
  setBgImage: (dataUrl: string | null) => void;
  setContainerSize: (size: { width: number; height: number }) => void;
  setZoomScale: (scale: number) => void;
};

type CanvasContextValue = CanvasState & CanvasActions;

const CanvasContext = createContext<CanvasContextValue | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoomScale, setZoomScale] = useState<number>(1);

  return (
    <CanvasContext.Provider value={{ bgImage, containerSize, zoomScale, setBgImage, setContainerSize, setZoomScale }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasStore(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (ctx === undefined) throw new Error('useCanvasStore must be used within CanvasProvider');
  return ctx;
}
