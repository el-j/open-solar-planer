let _counter = 0;

/**
 * Generates a unique string ID for a panel or zone.
 * Uses timestamp + monotonic counter to guarantee uniqueness even within the same millisecond.
 */
export function generateId(prefix: 'panel' | 'zone'): string {
  return `${prefix}-${Date.now()}-${_counter++}`;
}
