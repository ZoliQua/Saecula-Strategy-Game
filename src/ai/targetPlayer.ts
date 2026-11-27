import type { EcsWorld } from '../ecs/world';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import { areAllies, areEnemies } from '../game/diplomacy';
import type { PlayerManager } from '../game/PlayerManager';

/**
 * Whom AI player `me` attacks (M16, CLAUDE.md §9 "AI csapatban"),
 * re-evaluated at every AI decision:
 *
 * - no teams (setup allies 0): the human, always (the pre-M16 rule, kept
 *   byte-identical: no world scan, defeat ignored);
 * - an enemy of the human: the human while standing, else the nearest
 *   standing player of the human's team;
 * - the human or its ally: the nearest standing enemy-team player.
 *
 * Standing = not marked defeated and owning a live (non-dying) town centre
 * (the conquest rule, VictoryChecker). "Nearest" is the Chebyshev distance
 * between town centres (each side's closest pair); ties go to the smaller
 * player id. Undefined when no candidate is standing.
 */
export function chooseEnemyPlayer(players: PlayerManager, me: number, world: EcsWorld): number | undefined {
  const human = players.human();
  if (!players.hasTeams() || !human) return human?.id;
  const tcs = townCentres(world);
  const standing = (id: number) => players.get(id)?.defeated !== true && (tcs.get(id)?.length ?? 0) > 0;
  const humanSide = me === human.id || areAllies(players, me, human.id);
  if (!humanSide && standing(human.id)) return human.id;
  const candidates = players
    .all()
    .filter((p) => (humanSide ? areEnemies(players, me, p.id) : p.id === human.id || areAllies(players, p.id, human.id)))
    .map((p) => p.id)
    .filter(standing);
  const mine = tcs.get(me) ?? [];
  if (mine.length === 0) return candidates[0];
  let best: number | undefined;
  let bestDist = Infinity;
  for (const id of candidates) {
    const d = closest(mine, tcs.get(id) ?? []);
    if (d < bestDist) {
      best = id;
      bestDist = d;
    }
  }
  return best;
}

/** Live town-centre positions by owner. */
function townCentres(world: EcsWorld): Map<number, TileCoord[]> {
  const out = new Map<number, TileCoord[]>();
  for (const e of world.with('building', 'owner', 'position')) {
    if (e.building.type !== 'town_center' || e.dying) continue;
    const list = out.get(e.owner.playerId) ?? [];
    list.push(e.position);
    out.set(e.owner.playerId, list);
  }
  return out;
}

function closest(a: readonly TileCoord[], b: readonly TileCoord[]): number {
  let d = Infinity;
  for (const p of a) for (const q of b) d = Math.min(d, chebyshev(p, q));
  return d;
}
