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
