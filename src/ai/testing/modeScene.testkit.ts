import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import type { Entity } from '../../ecs/components';
import { createEcsWorld } from '../../ecs/world';
import { HILL } from '../../config/balance';
import { createPlayers } from '../../game/PlayerManager';
import type { TileCoord } from '../../iso/coordinates';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import type { UnitType } from '../../types';
import type { AIContext } from '../AIPlayer';

/* A small open map for the AI of the M19 modes: the AI is player 2, at (4, 4); player 1's town centre is at (40, 40). */

export const SIZE = 48;
export const HOME: TileCoord = { tx: 4, ty: 4 };
export const ENEMY_HOME: TileCoord = { tx: 40, ty: 40 };
export const CENTRE: TileCoord = { tx: 24, ty: 24 };

export function modeScene(options: { allies?: number; lit?: boolean } = {}) {
  const map = new MapData(SIZE, SIZE);
  const world = createEcsWorld();
  const fog = new FogOfWarData(SIZE, SIZE);
  const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, options.allies ?? 0);
  const me = players.get(2)!;
  // Nothing to spend: the economy orders nothing that could get in a test's way.
  me.resources = { food: 0, wood: 0, gold: 0 };
  const tc = createBuilding(world, { type: 'town_center', origin: HOME, playerId: 2, mapData: map });
  const enemyTc = createBuilding(world, { type: 'town_center', origin: ENEMY_HOME, playerId: 1, mapData: map });
  const light = (): void => {
    for (let ty = 0; ty < SIZE; ty++) for (let tx = 0; tx < SIZE; tx++) fog.markVisible(tx, ty);
  };
  if (options.lit !== false) light();
  const unit = (type: UnitType, tx: number, ty: number, playerId = 2): Entity => createUnit(world, { type, tile: { tx, ty }, playerId });
  const base: AIContext = { world, mapData: map, player: me, timeMs: 0, fog, enemyPlayerId: 1, teams: players, isDefeated: (id) => players.get(id)?.defeated === true };
  const regicide = (timeMs = 0): AIContext => ({ ...base, timeMs, regicide: true });
  const hill = (
    state: { heldMs?: Record<number, number>; holderTeam?: number | null; contested?: boolean } = {},
    timeMs = 0,
  ): AIContext => ({
    ...base,
    timeMs,
    hill: {
      centre: CENTRE,
      heldMs: state.heldMs ?? {},
      holderTeam: state.holderTeam ?? null,
      contested: state.contested ?? false,
      standingTeams: new Set(players.all().filter((p) => !p.defeated).map((p) => p.team)),
    },
  });
  return { map, world, fog, players, me, tc, enemyTc, base, regicide, hill, unit, light };
}

/** A little past half of the clock. */
export const PAST_HALF = HILL.holdMs / 2 + 1000;

/** Where a unit is headed: its pending order, else the end of the path it walks. */
export function headed(u: Entity): TileCoord | undefined {
  return u.moveIntent?.target ?? u.movable?.path.at(-1);
}

/** Puts a walking unit on its goal, as if it had arrived. */
export function arrive(world: { removeComponent(e: Entity, c: 'moveIntent'): unknown }, u: Entity): void {
  const to = headed(u);
  if (!to) return;
  u.position = { tx: to.tx, ty: to.ty };
  if (u.movable) u.movable.path = [];
  if (u.moveIntent) world.removeComponent(u, 'moveIntent');
}
