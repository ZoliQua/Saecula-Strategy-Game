import type { CivId, Resources } from '../types';
import { START_RESOURCES } from '../config/balance';
import { DEFAULT_CIV } from '../config/civs';
import type { Player } from './Player';
import { createPlayer } from './Player';
import { teamFor, type TeamLookup } from './diplomacy';

export class PlayerManager implements TeamLookup {
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

  /** Player `id`'s team (M16); an unknown id (Gaia) is its own team. */
  teamOf(id: number): number {
    return this.playersById.get(id)?.team ?? id;
  }

  /** Sets every player's team from the setup's `allies` (new matches and restored saves: teams are not saved). */
  assignTeams(allies: number): void {
    for (const p of this.playersById.values()) p.team = teamFor(p.id, allies);
  }

  markDefeated(playerId: number): void {
    const p = this.playersById.get(playerId);
    if (p) p.defeated = true;
  }
}

/**
 * Human (id 1) plus one AI per entry of `aiCivs` (ids 2..), each with its
 * own colour and the civ given for it (GameSetupConfig matchCivs). Every
 * player starts with its own copy of `resources` (the setup's preset,
 * startResourcesFor; default the normal one). Teams follow `allies` (teamFor;
 * 0 = everyone on its own team).
 */
export function createPlayers(
  humanCiv: CivId,
  aiCivs: readonly CivId[],
  resources: Readonly<Resources> = START_RESOURCES.normal,
  allies = 0,
): PlayerManager {
  const players = [createPlayer({ id: 1, isHuman: true, civ: humanCiv, resources: { ...resources } })];
  aiCivs.forEach((civ, i) => players.push(createPlayer({ id: i + 2, isHuman: false, civ, resources: { ...resources } })));
  const manager = new PlayerManager(players);
  manager.assignTeams(allies);
  return manager;
}

export function createDefaultPlayers(): PlayerManager {
  return createPlayers(DEFAULT_CIV, [DEFAULT_CIV]);
}
