/**
 * Generates a unique string ID for a panel or zone using the current timestamp.
 *
 * Not cryptographically secure — only suitable for UI identity within a session.
 * In high-frequency scenarios (many calls within the same millisecond) the ID
 * may not be unique; callers that require guaranteed uniqueness should append a counter.
 */
export function generateId(prefix: 'panel' | 'zone'): string {
  return `${prefix}-${Date.now()}`;
}
