import { HILL } from '../../config/balance';
import { hillOccupant, hillWinner, inHillZone } from '../../game/hill';
import type { PlayerManager } from '../../game/PlayerManager';
import { NO_TREATY, type TreatyGate } from '../../game/treaty';
import type { EcsWorld } from '../world';

/**
 * The hill's clocks (M19). Runs after movement, combat and death marking:
 * whoever occupies the zone then owns the whole step. One team alone adds
 * the step to its clock, up to HILL.holdMs; an empty or contested hill,
 * and the treaty (M16), stop every clock, and so does a full clock of a
 * team still standing (the first there has won). VictoryChecker reads the
 * clocks; without a hill entity there is nothing to do.
 */
export class HillSystem {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    private readonly treaty: TreatyGate = NO_TREATY,
  ) {}

  update(deltaMs: number): void {
    for (const { hill, position } of this.world.with('hill', 'position')) {
      const teams = new Set<number>();
      for (const u of this.world.with('unit', 'owner', 'position')) {
        if (inHillZone(position, u.position) && hillOccupant(u, this.players)) teams.add(this.players.teamOf(u.owner.playerId));
      }
      const [first] = teams;
      const holder = teams.size === 1 && first !== undefined ? first : null;
      hill.holderTeam = holder;
      hill.contested = teams.size > 1;
      if (holder === null || this.treaty() || hillWinner(hill.heldMs, this.players) !== null) continue;
      hill.heldMs[holder] = Math.min(HILL.holdMs, (hill.heldMs[holder] ?? 0) + deltaMs);
    }
  }
}
