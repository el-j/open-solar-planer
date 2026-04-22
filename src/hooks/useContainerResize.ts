import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useCanvasStore } from '../stores/CanvasStore';

/**
 * Observes the given container element and updates CanvasStore containerSize
 * whenever its dimensions change.
 */
export function useContainerResize(containerRef: RefObject<HTMLDivElement | null>): void {
  const { setContainerSize } = useCanvasStore();

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, setContainerSize]);
}
