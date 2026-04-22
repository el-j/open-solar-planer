import type { PanelPreset } from '../types';

export const PRESETS: readonly PanelPreset[] = [
  { id: 'standard', name: 'Standard Modul (ca. 400W)', width: 113, length: 172, power: 400 },
  { id: 'xl',       name: 'XL Modul (ca. 500W)',       width: 113, length: 209, power: 500 },
  { id: 'bkw',      name: 'Balkonkraftwerk (Kompakt)', width: 100, length: 165, power: 300 },
  { id: 'custom',   name: 'Benutzerdefiniert...',       width: 100, length: 170, power: 350 },
] as const;
