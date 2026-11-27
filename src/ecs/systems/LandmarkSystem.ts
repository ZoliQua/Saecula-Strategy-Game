import { isNavalType, LANDMARK } from '../../config/balance';
import { landmarkOf } from '../../config/civs';
import { creditGathered } from '../../game/credit';
import { distanceToFootprint, fortAttacker, isActiveLandmark } from '../../game/landmarks';
import type { PlayerManager } from '../../game/PlayerManager';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { applyHeal, carryStep, woundedOwnUnits } from './heal';

type Landmark = Entity & Required<Pick<Entity, 'building' | 'owner' | 'position'>>;

/**
 * Landmarks (M17), run first each tick so every later system sees this
 * tick's state:
 *  - refreshes each player's `landmarkActive` (finished, standing
 *    landmark), the flag the modifier landmarks hang on;
 *  - gives a finished fort landmark its attacker (TowerCombatSystem then
 *    aims it like a tower);
 *  - the mint credits LANDMARK.mintGoldPerMin as gathered gold;
 *  - the sauna heals every own wounded land unit within LANDMARK.sauna.range.
 * Mint gold and sauna HP accumulate in the owner's saved `landmarkCarry`
 * until whole.
 */
export class LandmarkSystem {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager | null,
  ) {
    // A loaded match sees its landmarks' modifiers before the first tick (HUD prices).
    this.refresh();
  }

  update(deltaMs: number): void {
    for (const lm of this.refresh()) {
      const player = this.players?.get(lm.owner.playerId);
      if (!player || player.defeated) continue;
      const effect = landmarkOf(player.civ);
      if (effect.kind === 'fort' && !lm.attacker) this.world.addComponent(lm, 'attacker', fortAttacker());
      if (effect.kind === 'mint') {
        const step = carryStep(player.landmarkCarry, LANDMARK.mintGoldPerMin / 60, deltaMs);
        player.landmarkCarry = step.carry;
        creditGathered(this.world, this.players, player.id, 'gold', step.whole);
      }
      if (effect.kind === 'sauna') this.sauna(lm, player, deltaMs);
    }
  }

  /** Sets every player's landmarkActive; returns the active landmarks. */
  private refresh(): Landmark[] {
    const active: Landmark[] = [];
    for (const e of this.world.with('building', 'owner', 'position')) if (isActiveLandmark(e)) active.push(e);
    for (const p of this.players?.all() ?? []) p.landmarkActive = active.some((lm) => lm.owner.playerId === p.id);
    return active;
  }

  private sauna(lm: Landmark, player: { id: number; landmarkCarry: number }, deltaMs: number): void {
    const { range, healPerSec } = LANDMARK.sauna;
    const near = (at: { tx: number; ty: number }) => distanceToFootprint(at, lm.position, lm.building.footprint) <= range;
    const wounded = woundedOwnUnits(this.world, player.id, near, (u) => !!u.unit && !isNavalType(u.unit.unitType));
    if (wounded.length === 0) {
      player.landmarkCarry = 0;
      return;
    }
    const step = carryStep(player.landmarkCarry, healPerSec, deltaMs);
    player.landmarkCarry = step.carry;
    if (step.whole > 0) for (const u of wounded) if (u.health) applyHeal(u.health, step.whole);
  }
}
