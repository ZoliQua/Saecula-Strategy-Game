import type { TechId } from '../../types';

/**
 * First technology in `priority` that can be started now: available
 * (age / prerequisites / not done), not running anywhere, its building
 * owned and free, and affordable.
 */
export function pickResearch(
  priority: readonly TechId[],
  ready: (id: TechId) => boolean,
): TechId | null {
  for (const id of priority) if (ready(id)) return id;
  return null;
}
