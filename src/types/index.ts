// Central type specification for Open Solar Planer.
// All shared domain types live here. Import from this file, not from layout.ts or App.tsx.

/** A solar panel placed freely on the roof canvas (free-placement mode). */
export type FreePanel = {
  id: string;
  x: number;      // cm from roof left edge
  y: number;      // cm from roof top edge
  width: number;  // cm
  height: number; // cm
  power: number;  // Wp
};

/** A rectangular zone where no panels may be placed. */
export type ExclusionZone = {
  id: string;
  x: number;      // cm from roof left edge
  y: number;      // cm from roof top edge
  width: number;  // cm
  height: number; // cm
  label?: string;
};

/** A named panel preset (from the dropdown selector). */
export type PanelPreset = {
  id: string;
  name: string;
  width: number;  // cm (shorter dimension, portrait)
  length: number; // cm (longer dimension, portrait)
  power: number;  // Wp
};

/** Result returned by calculateLayout(). */
export type LayoutResult = {
  cols: number;
  rows: number;
  totalPanels: number;
  totalPowerWp: number;
  effectivePanelWidth: number;  // cm — accounts for landscape rotation
  effectivePanelHeight: number; // cm — accounts for landscape rotation
};

/** Active placement mode. */
export type PlacementMode = 'grid' | 'free';

/** Active drawing tool in free-placement mode. */
export type ActiveTool = 'select' | 'draw-zone';

/** Active mobile tab. */
export type MobileTab = 'canvas' | 'settings';

/**
 * Internal drag state stored in a ref to avoid re-renders mid-drag.
 * Discriminated union: panel drag | zone-draw | zone-move.
 */
export type DragState =
  | {
      type: 'panel';
      id: string;
      startX: number; // canvas px
      startY: number; // canvas px
      origX: number;  // original panel x in cm
      origY: number;  // original panel y in cm
    }
  | {
      type: 'zone-draw';
      drawZoneId: string;
      startX: number; // canvas px
      startY: number; // canvas px
    }
  | {
      type: 'zone-move';
      id: string;
      startX: number; // canvas px
      startY: number; // canvas px
      origX: number;  // original zone x in cm
      origY: number;  // original zone y in cm
      zoneWidth: number;  // zone width in cm (for clamping)
      zoneHeight: number; // zone height in cm (for clamping)
    };

/** Effective panel dimensions after applying landscape rotation. */
export type EffectivePanelSize = {
  effectiveWidth: number;  // cm — the dimension along the X axis
  effectiveHeight: number; // cm — the dimension along the Y axis
};

/** Clamped panel position after applying roof boundary constraints. */
export type ClampedPosition = {
  x: number; // cm
  y: number; // cm
};

/** Clamped zone bounds after applying roof boundary constraints. */
export type ZoneBounds = {
  x: number;      // cm
  y: number;      // cm
  width: number;  // cm
  height: number; // cm
};
