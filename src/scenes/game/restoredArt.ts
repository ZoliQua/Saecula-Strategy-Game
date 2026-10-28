import type { Entity } from '../../ecs/components';
import { styleAge } from '../../ecs/systems/renderPlacement';
import { wonderStage } from '../../iso/art/architecture/wonder';
import type { AgeId, BuildingType, CivId } from '../../types';

/** A texture a restored building shows: its owner's age style in the owner's colour, or a Wonder's scaffolding stage. */
export type RestoredBuildingArt =
  | { readonly kind: 'building'; readonly type: BuildingType; readonly age: AgeId; readonly owner: number; readonly civ: CivId }
  | { readonly kind: 'wonderStage'; readonly stage: number; readonly civ: CivId };

/**
 * The building textures a loaded save's world shows on its first frames,
 * once each, in world order: what RenderSystem.buildingKey picks for each
 * standing building or site (walls excluded: the wall plan paints them;
 * dying buildings excluded). Painted behind the loading card, the first
 * game frames then hit the texture cache.
 */
export function restoredBuildingArt(
  entities: Iterable<Entity>,
  ageOf: (playerId: number) => AgeId,
  civOf: (playerId: number) => CivId,
): RestoredBuildingArt[] {
  const out: RestoredBuildingArt[] = [];
  const seen = new Set<string>();
  const add = (id: string, art: RestoredBuildingArt) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(art);
  };
  for (const e of entities) {
    const b = e.building;
    if (!b || b.type === 'wall' || e.dying) continue;
    const owner = e.owner?.playerId ?? 1;
    const civ = civOf(owner);
    const uc = e.underConstruction;
    if (b.type === 'wonder' && uc) {
      const stage = wonderStage(uc.elapsed / uc.totalTime);
      add(`s:${stage}:${civ}`, { kind: 'wonderStage', stage, civ });
      continue;
    }
    const age = styleAge(ageOf(owner), b.minStyleAge);
    add(`b:${b.type}:${age}:${owner}:${civ}`, { kind: 'building', type: b.type, age, owner, civ });
  }
  return out;
}
