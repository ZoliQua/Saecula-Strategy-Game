import { describe, expect, it } from 'vitest';
import { HILL } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createHill } from '../ecs/archetypes/hill';
import { createEcsWorld } from '../ecs/world';
import type { TileCoord } from '../iso/coordinates';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import type { UnitType } from '../types';
import { killEntity } from './kill';
import { createPlayers } from './PlayerManager';
import { findHillSite, hillOccupant, hillState, hillTiles, hillWinner, inHillZone, type HillLayout } from './hill';

const CENTRE = { tx: 32, ty: 32 };

function open(map: MapData, x0: number, y0: number, x1: number, y1: number) {
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) map.setTile(tx, ty, TERRAIN.grass);
}

/** A cliff map with `n` open tiles in the central zone, row by row; both villager tiles are in its top row. */
function zoneWith(n: number): HillLayout {
  const map = new MapData(64, 64, TERRAIN.cliff);
  for (let i = 0; i < n; i++) map.setTile(29 + (i % 7), 29 + Math.floor(i / 7), TERRAIN.grass);
  return { map, playerStarts: [{ tx: 30, ty: 26 }, { tx: 34, ty: 26 }], walls: [] };
}

/** A corridor cross with an open 7×7 square centred ten tiles out on each of the given arms. */
function crossWith(squares: readonly TileCoord[]): HillLayout {
  const map = new MapData(64, 64, TERRAIN.cliff);
  open(map, 4, 32, 60, 32);
  open(map, 32, 19, 32, 45);
  for (const s of squares) open(map, s.tx - 3, s.ty - 3, s.tx + 3, s.ty + 3);
  // Villagers stand three below a start: on the long corridor, the town centres beside it.
  return { map, playerStarts: [{ tx: 6, ty: 29 }, { tx: 58, ty: 29 }], walls: [] };
}

const wallsAt = (...tiles: TileCoord[]) => tiles.map((tile) => ({ tile, playerIndex: 0, minStyleAge: 2 as const }));

describe('findHillSite (M19)', () => {
  it('an open map has its hill on the centre tile', () => {
    const map = new MapData(96, 96);
    expect(findHillSite({ map, playerStarts: [{ tx: 10, ty: 10 }, { tx: 85, ty: 85 }], walls: [] })).toEqual({ tx: 48, ty: 48 });
  });

  it('a zone needs minPassable passable tiles', () => {
    expect(findHillSite(zoneWith(HILL.minPassable))).toEqual(CENTRE);
    expect(findHillSite(zoneWith(HILL.minPassable - 1))).toBeNull();
  });

  it('the starting town centres block their tiles', () => {
    const map = new MapData(64, 64, TERRAIN.cliff);
    open(map, 29, 29, 35, 35); // 49 open, 9 under the town centre: 40
    const layout = { map, playerStarts: [{ tx: 32, ty: 31 }] };
    const row = (n: number) => wallsAt(...Array.from({ length: n }, (_, i) => ({ tx: 29 + i, ty: 35 })));
    expect(findHillSite({ ...layout, walls: row(7) })).toEqual(CENTRE); // 33
    expect(findHillSite({ ...layout, walls: [...row(7), ...wallsAt({ tx: 29, ty: 29 })] })).toBeNull(); // 32
  });

  it('the preset walls block their tiles', () => {
    const layout = zoneWith(35);
    expect(findHillSite({ ...layout, walls: wallsAt({ tx: 31, ty: 33 }, { tx: 32, ty: 33 }) })).toEqual(CENTRE);
    expect(findHillSite({ ...layout, walls: wallsAt({ tx: 31, ty: 33 }, { tx: 32, ty: 33 }, { tx: 33, ty: 33 }) })).toBeNull();
  });

  it('only tiles that every start walks to count', () => {
    const cutOff = zoneWith(49);
    for (let tx = 29; tx <= 35; tx++) cutOff.map.setTile(tx, 33, TERRAIN.water);
    expect(findHillSite(cutOff)).toBeNull(); // 28 reachable, 14 more beyond the water
  });

  it('a start that cannot walk there leaves no site', () => {
    const map = new MapData(64, 64);
    for (let ty = 0; ty < 64; ty++) map.setTile(50, ty, TERRAIN.water);
    expect(findHillSite({ map, playerStarts: [{ tx: 8, ty: 8 }, { tx: 20, ty: 40 }], walls: [] })).toEqual(CENTRE);
    expect(findHillSite({ map, playerStarts: [{ tx: 8, ty: 8 }, { tx: 58, ty: 8 }], walls: [] })).toBeNull();
  });

  it('the nearest site wins, ties by ty, then by tx', () => {
    const north = { tx: 32, ty: 22 };
    const south = { tx: 32, ty: 42 };
    const west = { tx: 22, ty: 32 };
    const east = { tx: 42, ty: 32 };
    expect(findHillSite(crossWith([]))).toBeNull();
    // A window two tiles off a square still has 37 open tiles, three off only 31.
    expect(findHillSite(crossWith([south, east, west, north]))).toEqual({ tx: 32, ty: 24 });
    expect(findHillSite(crossWith([south, east, west]))).toEqual({ tx: 24, ty: 32 });
    expect(findHillSite(crossWith([south, east]))).toEqual({ tx: 40, ty: 32 });
    expect(findHillSite(crossWith([south]))).toEqual({ tx: 32, ty: 40 });
  });

  it('nearest is the straight line, not the square ring', () => {
    // Two 33-tile blobs: the best window of the first is (28,28), 4 off the centre in both axes
    // (Chebyshev 4, distance² 32), of the second (32,37), 5 straight down (Chebyshev 5, distance² 25).
    const map = new MapData(64, 64, TERRAIN.cliff);
    const blob = (c: TileCoord) => {
      open(map, c.tx - 3, c.ty - 3, c.tx + 3, c.ty);
      open(map, c.tx - 3, c.ty + 1, c.tx + 1, c.ty + 1);
    };
    blob({ tx: 28, ty: 28 });
    blob({ tx: 32, ty: 39 });
    // Corridors in from the west, ending beside the blobs and far from the centre windows.
    open(map, 4, 32, 10, 32);
    open(map, 10, 28, 10, 36);
    open(map, 10, 28, 24, 28);
    open(map, 10, 36, 28, 36);
    const layout = { map, playerStarts: [{ tx: 6, ty: 29 }, { tx: 8, ty: 29 }], walls: [] };
    expect(findHillSite(layout)).toEqual({ tx: 32, ty: 37 });
  });

  it('the zone lies wholly on the map', () => {
    const map = new MapData(64, 64, TERRAIN.cliff);
    open(map, 0, 0, 4, 20); // five tiles wide: only the windows from the edge hold 33 of them
    const site = findHillSite({ map, playerStarts: [{ tx: 3, ty: 3 }], walls: [] })!;
    expect(site.tx).toBe(3);
    for (const t of hillTiles(site)) {
      expect(t.tx).toBeGreaterThanOrEqual(0);
      expect(t.ty).toBeGreaterThanOrEqual(0);
    }
  });

  it('reads the map and changes nothing', () => {
    const layout = crossWith([{ tx: 32, ty: 22 }]);
    const terrain = [...layout.map.getRawTiles()];
    findHillSite(layout);
    expect([...layout.map.getRawTiles()]).toEqual(terrain);
    expect(layout.map.getRawBlocked().every((b) => b === 0)).toBe(true);
  });
});

describe('the zone', () => {
  it('is size × size tiles round the centre, corners included', () => {
    const tiles = [...hillTiles(CENTRE)];
    expect(tiles).toHaveLength(HILL.size * HILL.size);
    for (const t of tiles) expect(inHillZone(CENTRE, t)).toBe(true);
    for (const d of [[4, 0], [-4, 0], [0, 4], [0, -4], [4, 4]] as const) {
      expect(inHillZone(CENTRE, { tx: 32 + d[0], ty: 32 + d[1] }), String(d)).toBe(false);
    }
    expect(inHillZone(CENTRE, { tx: 29, ty: 35 })).toBe(true);
  });
});

describe('hillOccupant (M19)', () => {
  const players = createPlayers('hungarian', ['english', 'german']);
  players.markDefeated(3);
  const unit = (type: UnitType, playerId = 1) => createUnit(createEcsWorld(), { type, tile: CENTRE, playerId });

  it.each(['scout', 'swordsman', 'archer', 'knight', 'pikeman', 'crossbowman', 'musketeer', 'cannon', 'cavalry', 'hussar', 'sissi'] as const)('%s occupies', (type) => {
    expect(hillOccupant(unit(type), players)).toBe(true);
  });

  it.each(['villager', 'king', 'monk', 'trade_cart', 'fishing_boat', 'transport', 'galley', 'frigate', 'trade_ship'] as const)('%s never occupies', (type) => {
    expect(hillOccupant(unit(type), players)).toBe(false);
  });

  it('nor does a dying unit', () => {
    const world = createEcsWorld();
    const knight = createUnit(world, { type: 'knight', tile: CENTRE, playerId: 1 });
    killEntity(world, knight as typeof knight & Required<Pick<typeof knight, 'health'>>);
    expect(hillOccupant(knight, players)).toBe(false);
  });

  it('nor one without a position', () => {
    const { position: _position, ...aboard } = unit('knight');
    expect(hillOccupant(aboard, players)).toBe(false);
  });

  it("nor a defeated player's, Gaia's, or nobody's", () => {
    expect(hillOccupant(unit('knight', 2), players)).toBe(true);
    expect(hillOccupant(unit('knight', 3), players)).toBe(false);
    expect(hillOccupant(unit('knight', 0), players)).toBe(false);
    expect(hillOccupant(unit('knight', 9), players)).toBe(false);
  });

  it('nor a tower', () => {
    const tower = createBuilding(createEcsWorld(), { type: 'tower', origin: CENTRE, playerId: 1, mapData: new MapData(64, 64) });
    expect(tower.attacker).toBeDefined();
    expect(hillOccupant(tower, players)).toBe(false);
  });
});

describe('hillState and hillWinner', () => {
  it('there is none until the hill is created, then it reads the entity', () => {
    const world = createEcsWorld();
    expect(hillState(world)).toBeNull();
    const hill = createHill(world, new MapData(64, 64), CENTRE);
    expect(hillState(world)).toEqual({ centre: CENTRE, heldMs: {}, holderTeam: null, contested: false });
    hill.hill!.heldMs[2] = 500;
    expect(hillState(world)?.heldMs[2]).toBe(500);
    const state = hillState(world)!;
    // @ts-expect-error the clocks are read-only for everyone but the HillSystem
    state.heldMs[2] = 0;
  });

  it('a full clock wins for its lowest-id standing player', () => {
    const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, 1);
    expect(hillWinner({}, players)).toBeNull();
    expect(hillWinner({ 2: HILL.holdMs - 1 }, players)).toBeNull();
    expect(hillWinner({ 2: HILL.holdMs }, players)).toBe(3);
    players.markDefeated(3);
    expect(hillWinner({ 2: HILL.holdMs }, players)).toBe(4);
    players.markDefeated(4);
    expect(hillWinner({ 2: HILL.holdMs }, players)).toBeNull();
  });
});
