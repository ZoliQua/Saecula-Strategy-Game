import { afterEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('../../iso/art/lighting/LightManager', () => ({ lit: <T>(go: T): T => go }));

import { HILL_MARK } from '../../config/visual';
import { inHillZone, hillTiles } from '../../game/hill';
import { CB_PLAYER_COLORS, playerColor, setTeamPalette } from '../../game/Player';
import { createPlayers } from '../../game/PlayerManager';
import { FX_KEYS } from '../../iso/textures';
import { tileToScreen } from '../../iso/coordinates';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createHill } from '../archetypes/hill';
import { createEcsWorld } from '../world';
import { HillMarkerSystem } from './HillMarkerSystem';

const CENTRE = { tx: 16, ty: 16 };

interface Drawn {
  kind: 'graphics' | 'image';
  key: string;
  frame: number;
  x: number;
  y: number;
  depth: number;
  alpha: number;
  tint: number | null;
  visible: boolean;
  destroyed: boolean;
  /** Colours of the strokes and fills since the last clear. */
  colors: number[];
  strokes: number;
  clears: number;
}

function fakeScene() {
  const all: Drawn[] = [];
  const make = (kind: Drawn['kind'], key = '') => {
    const d: Drawn = { kind, key, frame: 0, x: 0, y: 0, depth: 0, alpha: 1, tint: null, visible: true, destroyed: false, colors: [], strokes: 0, clears: 0 };
    all.push(d);
    const same = () => obj;
    const obj = {
      setScale: same, setOrigin: same, beginPath: same, moveTo: same, lineTo: same, closePath: same, fillPath: same,
      setPosition: (x: number, y: number) => ((d.x = x), (d.y = y), obj),
      setDepth: (v: number) => ((d.depth = v), obj),
      setAlpha: (v: number) => ((d.alpha = v), obj),
      setVisible: (v: boolean) => ((d.visible = v), obj),
      setTint: (v: number) => ((d.tint = v), obj),
      clearTint: () => ((d.tint = null), obj),
      setFrame: (v: number) => ((d.frame = v), obj),
      setTexture: (v: string, f = 0) => ((d.key = v), (d.frame = f), obj),
      clear: () => ((d.colors = []), (d.strokes = 0), d.clears++, obj),
      lineStyle: (_w: number, c: number) => (d.colors.push(c), obj),
      fillStyle: (c: number) => (d.colors.push(c), obj),
      strokePath: () => (d.strokes++, obj),
      destroy: () => void (d.destroyed = true),
    };
    return obj;
  };
  const scene = { add: { graphics: () => make('graphics'), image: (_x: number, _y: number, key: string) => make('image', key) } };
  const live = () => all.filter((d) => !d.destroyed);
  return {
    scene: scene as unknown as Phaser.Scene,
    live,
    ground: () => live().filter((d) => d.kind === 'graphics'),
    poles: () => live().filter((d) => d.key === FX_KEYS.hillPole),
    cloths: () => live().filter((d) => d.kind === 'image' && d.key !== FX_KEYS.hillPole && d.key !== FX_KEYS.hillSwords),
    swords: () => live().filter((d) => d.key === FX_KEYS.hillSwords && d.visible),
  };
}

function setup({ allies = 0, seen = 'all', waiting = () => false, map = new MapData(32, 32) }: { allies?: number; seen?: 'all' | 'none'; waiting?: () => boolean; map?: MapData } = {}) {
  const world = createEcsWorld();
  const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, allies);
  const hill = createHill(world, map, CENTRE).hill!;
  const fog = new FogOfWarData(32, 32);
  if (seen === 'all') for (const t of hillTiles(CENTRE)) fog.markVisible(t.tx, t.ty);
  const fake = fakeScene();
  const marker = new HillMarkerSystem(fake.scene, world, map, players, fog, waiting);
  return { world, players, hill, fog, marker, map, ...fake };
}

afterEach(() => void setTeamPalette('default'));

describe('HillMarkerSystem (M19)', () => {
  it('draws nothing in a match without a hill', () => {
    const fake = fakeScene();
    new HillMarkerSystem(fake.scene, createEcsWorld(), new MapData(8, 8), createPlayers('hungarian', ['english']), new FogOfWarData(8, 8), () => false).update(0);
    expect(fake.live()).toEqual([]);
  });

  it('the ring lies on the ground: over the terrain, under shadows and every unit', () => {
    const { marker, ground } = setup();
    marker.update(0);
    expect(ground().length).toBeGreaterThan(0);
    for (const g of ground()) {
      expect(g.depth).toBeGreaterThan(-995); // the terrain surface and ground decals
      expect(g.depth).toBeLessThan(-990); // the cast shadows
    }
  });

  it('four banners stand in the zone, under the units on their tile and under the fog', () => {
    const { marker, poles, live } = setup();
    marker.update(0);
    expect(poles()).toHaveLength(4);
    for (const p of poles()) {
      const tx = (p.x / 32 + p.y / 16) / 2;
      const ty = (p.y / 16 - p.x / 32) / 2;
      expect(inHillZone(CENTRE, { tx, ty })).toBe(true);
      expect({ tx, ty }).not.toEqual(CENTRE);
      expect(p.depth).toBeGreaterThan(tx + ty + 0.1); // the tile's decor and trees
      expect(p.depth).toBeLessThan(tx + ty + 0.3); // its units
    }
    for (const d of live()) expect(d.depth).toBeLessThan(10_000);
  });

  it('a banner takes open ground near its corner when the corner and the centre are blocked', () => {
    const map = new MapData(32, 32);
    map.setTile(16, 16, TERRAIN.forest);
    map.setTile(13, 13, TERRAIN.forest);
    const { marker, poles } = setup({ map });
    marker.update(0);
    const at = poles().map((p) => ({ x: p.x, y: p.y }));
    const screen = (tx: number, ty: number) => ({ x: tileToScreen({ tx, ty }).sx, y: tileToScreen({ tx, ty }).sy });
    expect(at).not.toContainEqual(screen(13, 13));
    expect(at).toContainEqual(screen(14, 13));
    expect(at).toContainEqual(screen(19, 19));
    expect(at).not.toContainEqual(screen(16, 16));
  });

  it('a zone full of forest still gets its four banners, at the corners', () => {
    const map = new MapData(32, 32);
    for (const t of hillTiles(CENTRE)) map.setTile(t.tx, t.ty, TERRAIN.forest);
    const { marker, poles } = setup({ map });
    marker.update(0);
    expect(new Set(poles().map((p) => `${p.x},${p.y}`)).size).toBe(4);
  });

  it('empty: furled neutral cloths and no player colour', () => {
    const { marker, cloths, swords, ground } = setup();
    marker.update(0);
    expect(cloths().map((c) => c.key)).toEqual(Array(4).fill(FX_KEYS.hillFurled));
    expect(cloths().every((c) => c.tint === null)).toBe(true);
    expect(swords()).toEqual([]);
    for (const g of ground()) for (const id of [1, 2, 3, 4]) expect(g.colors).not.toContain(playerColor(id));
  });

  it('held: flying flags and a ring in the holder colour', () => {
    const { marker, hill, cloths, ground } = setup();
    hill.holderTeam = 3;
    marker.update(0);
    expect(cloths().map((c) => [c.key, c.tint])).toEqual(Array(4).fill([FX_KEYS.hillFlag, playerColor(3)]));
    expect(ground().some((g) => g.colors.includes(playerColor(3)))).toBe(true);
  });

  it('a team flies its lowest-id standing player, in the active palette', () => {
    setTeamPalette('colorblind');
    const { marker, hill, players, cloths } = setup({ allies: 1 });
    hill.holderTeam = 2;
    players.markDefeated(3);
    marker.update(0);
    expect(cloths()[0]?.tint).toBe(CB_PLAYER_COLORS[3]);
  });

  it('contested differs in shape: torn cloths, crossed swords and a broken ring', () => {
    const { marker, hill, cloths, swords, ground } = setup();
    hill.holderTeam = 2;
    marker.update(0);
    const solid = ground().reduce((n, g) => n + g.strokes, 0);
    Object.assign(hill, { holderTeam: null, contested: true });
    marker.update(16);
    expect(cloths().map((c) => [c.key, c.tint])).toEqual(Array(4).fill([FX_KEYS.hillTorn, null]));
    expect(swords()).toHaveLength(4);
    expect(ground().reduce((n, g) => n + g.strokes, 0)).toBeGreaterThan(solid * 3);
    hill.contested = false;
    marker.update(32);
    expect(swords()).toEqual([]);
  });

  it('redraws the ring only when the state changes', () => {
    const { marker, hill, ground } = setup();
    marker.update(0);
    const clears = () => ground().reduce((n, g) => n + g.clears, 0);
    const first = clears();
    marker.update(16);
    marker.update(32);
    expect(clears()).toBe(first);
    hill.holderTeam = 1;
    marker.update(48);
    expect(clears()).toBeGreaterThan(first);
  });

  it('does not stand out of unexplored land, and shows once explored', () => {
    const { marker, hill, fog, live } = setup({ seen: 'none' });
    hill.contested = true;
    marker.update(0);
    expect(live().filter((d) => d.kind === 'image' && d.visible)).toEqual([]);
    for (const t of hillTiles(CENTRE)) fog.markVisible(t.tx, t.ty);
    fog.dimVisibleToExplored();
    marker.update(16);
    expect(live().filter((d) => d.kind === 'image' && d.visible)).toHaveLength(12);
  });

  it('breathes while the clocks run and is still while they wait', () => {
    let waiting = false;
    const { marker, hill, ground } = setup({ waiting: () => waiting });
    hill.holderTeam = 1;
    const alphas = (time: number) => (marker.update(time), ground().map((g) => g.alpha));
    expect(alphas(0)).not.toEqual(alphas(HILL_MARK.breatheMs / 4));
    waiting = true;
    expect(alphas(0)).toEqual(alphas(HILL_MARK.breatheMs / 4));
  });

  it('the flags fly through their frames', () => {
    const { marker, hill, cloths } = setup();
    hill.holderTeam = 1;
    marker.update(0);
    const before = cloths().map((c) => c.frame);
    marker.update(HILL_MARK.flag.frameMs);
    expect(cloths().map((c) => c.frame)).not.toEqual(before);
    for (const c of cloths()) expect(c.frame).toBeLessThan(HILL_MARK.flag.frames);
  });

  it('goes with the match', () => {
    const { marker, live } = setup();
    marker.update(0);
    marker.destroy();
    expect(live()).toEqual([]);
  });
});
