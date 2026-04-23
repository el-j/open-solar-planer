/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { FreePanel, ExclusionZone } from '../types';

type FreePlacementState = {
  freePanels: FreePanel[];
  exclusionZones: ExclusionZone[];
  selectedId: string | null;
};

type FreePlacementActions = {
  addPanel: (panel: FreePanel) => void;
  updatePanel: (id: string, patch: Partial<Omit<FreePanel, 'id'>>) => void;
  removePanel: (id: string) => void;
  addZone: (zone: ExclusionZone) => void;
  updateZone: (id: string, patch: Partial<Omit<ExclusionZone, 'id'>>) => void;
  removeZone: (id: string) => void;
  /** Remove a zone only if its dimensions are smaller than the given thresholds. */
  removeTinyZone: (id: string, minW: number, minH: number) => void;
  setSelectedId: (id: string | null) => void;
  /** Delete whichever of panel or zone has the current selectedId. */
  deleteSelected: () => void;
};

type FreePlacementContextValue = FreePlacementState & FreePlacementActions;

const FreePlacementContext = createContext<FreePlacementContextValue | undefined>(undefined);

export function FreePlacementProvider({ children }: { children: ReactNode }) {
  const [freePanels, setFreePanels] = useState<FreePanel[]>([]);
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addPanel = (panel: FreePanel) => setFreePanels(prev => [...prev, panel]);
  const updatePanel = (id: string, patch: Partial<Omit<FreePanel, 'id'>>) =>
    setFreePanels(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const removePanel = (id: string) => setFreePanels(prev => prev.filter(p => p.id !== id));

  const addZone = (zone: ExclusionZone) => setExclusionZones(prev => [...prev, zone]);
  const updateZone = (id: string, patch: Partial<Omit<ExclusionZone, 'id'>>) =>
    setExclusionZones(prev => prev.map(z => (z.id === id ? { ...z, ...patch } : z)));
  const removeZone = (id: string) => setExclusionZones(prev => prev.filter(z => z.id !== id));
  const removeTinyZone = (id: string, minW: number, minH: number) =>
    setExclusionZones(prev =>
      prev.filter(z => z.id !== id || (z.width >= minW && z.height >= minH)),
    );

  const deleteSelected = () => {
    if (!selectedId) return;
    setFreePanels(prev => prev.filter(p => p.id !== selectedId));
    setExclusionZones(prev => prev.filter(z => z.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <FreePlacementContext.Provider value={{
      freePanels, exclusionZones, selectedId,
      addPanel, updatePanel, removePanel,
      addZone, updateZone, removeZone, removeTinyZone,
      setSelectedId, deleteSelected,
    }}>
      {children}
    </FreePlacementContext.Provider>
  );
}

export function useFreePlacementStore(): FreePlacementContextValue {
  const ctx = useContext(FreePlacementContext);
  if (ctx === undefined) throw new Error('useFreePlacementStore must be used within FreePlacementProvider');
  return ctx;
}
