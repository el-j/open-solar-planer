import { useEffect } from 'react';
import { useFreePlacementStore } from '../stores/FreePlacementStore';

/**
 * Listens for the Delete key on `window` and calls `deleteSelected()`
 * when a panel or zone is selected.
 * Only active when `selectedId` is non-null.
 */
export function useKeyboardDelete(): void {
  const { selectedId, deleteSelected } = useFreePlacementStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId) deleteSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteSelected]);
}
