import type { CivId } from '../types';
import type { Player } from './Player';
import { createPlayer } from './Player';

export class PlayerManager {
  private readonly playersById = new Map<number, Player>();

  constructor(players: Iterable<Player> = []) {
    for (const p of players) this.playersById.set(p.id, p);
  }

  add(player: Player): void {
    this.playersById.set(player.id, player);
  }

  get(id: number): Player | undefined {
    return this.playersById.get(id);
  }

  all(): Player[] {
    return Array.from(this.playersById.values()).sort((a, b) => a.id - b.id);
  }

  human(): Player | undefined {
    return this.all().find((p) => p.isHuman);
  }

  ais(): Player[] {
    return this.all().filter((p) => !p.isHuman);
  }

  activeOpponents(viewer: Player): Player[] {
    return this.all().filter((p) => p.id !== viewer.id && !p.defeated);
  }

  markDefeated(playerId: number): void {
    const p = this.playersById.get(playerId);
    if (p) p.defeated = true;
  }
}

/** Human (id 1) plus `aiCount` AI players (ids 2..aiCount + 1), each with its own colour. */
export function createPlayers(humanCiv: CivId, aiCount: number): PlayerManager {
  const players = [createPlayer({ id: 1, isHuman: true, civ: humanCiv })];
  for (let i = 0; i < aiCount; i++) {
    players.push(createPlayer({ id: i + 2, isHuman: false, civ: 'english' }));
  }
  return new PlayerManager(players);
}

export function createDefaultPlayers(): PlayerManager {
  return createPlayers('hungarian', 1);
}
