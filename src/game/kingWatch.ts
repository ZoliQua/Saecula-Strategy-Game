import { KING } from '../config/balance';
import type { EcsWorld } from '../ecs/world';
import { hu } from '../i18n/hu';
import { areAllies, type TeamLookup } from './diplomacy';
import { gameEvents } from './events';
import { livingKings } from './regicide';

/** Shows a HUD notice; 'ok' is good news. */
export type KingNotify = (message: string, tone: 'alert' | 'ok') => void;

/**
 * The Regicide notices (M19): the human's king is losing HP (at most one
 * every KING.alertEveryMs of game time), and a king fell, whoever's (a
 * king sunk with its transport too). Reads the match, never changes it.
 */
export class KingWatch {
  /** The human king's HP at the last update; null until first seen (a load is no attack). */
  private lastHp: number | null = null;
  private alertedAtMs = -Infinity;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly world: EcsWorld,
    teams: TeamLookup,
    private readonly humanId: number | undefined,
    private readonly notify: KingNotify,
  ) {
    this.unsubscribe = gameEvents.on('entityKilled', ({ world: where, unitType, victimOwnerId: id }) => {
      if (where !== world || unitType !== 'king') return;
      if (id === humanId) notify(hu.kings.fellOwn, 'alert');
      else if (humanId !== undefined && areAllies(teams, id, humanId)) notify(hu.kings.fellAlly(id), 'alert');
      else notify(hu.kings.fellEnemy(id), 'ok');
    });
  }

  /** Once a frame after the systems; `nowMs` is game time. */
  update(nowMs: number): void {
    for (const king of livingKings(this.world)) {
      if (king.owner.playerId !== this.humanId || !king.health) continue;
      const hp = king.health.current;
      const hurt = this.lastHp !== null && hp < this.lastHp;
      this.lastHp = hp;
      if (hurt && nowMs - this.alertedAtMs >= KING.alertEveryMs) {
        this.alertedAtMs = nowMs;
        this.notify(hu.kings.attacked, 'alert');
      }
    }
  }

  destroy(): void {
    this.unsubscribe();
  }
}
