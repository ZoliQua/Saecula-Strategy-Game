import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('../../iso/art/lighting/LightManager', () => ({ lit: <T>(go: T): T => go }));

import { UNIT_BALANCE } from '../../config/balance';
import { CIV_DEFS } from '../../config/civs';
import { HILL_MARK } from '../../config/visual';
import { inHillZone, hillTiles } from '../../game/hill';
import { CB_PLAYER_COLORS, playerColor, setTeamPalette } from '../../game/Player';
import { createPlayers } from '../../game/PlayerManager';
import { ART_SCALE } from '../../iso/art/canvas';
import { HILL_ART, HILL_ART_FRAMES } from '../../iso/art/hillArt';
import { installRecordingCanvas } from '../../iso/art/testing/recordingCanvas.testkit';
import { frameBox, frameRect, sheetGeometry } from '../../iso/art/units/sheet';
import { FX_KEYS } from '../../iso/textures';
import { screenToTile, tileToScreen } from '../../iso/coordinates';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { CivId, UnitType } from '../../types';
import { createHill } from '../archetypes/hill';
import { moveLayerOfType } from '../navLayer';
import { createEcsWorld } from '../world';
import { HillMarkerSystem } from './HillMarkerSystem';
import { renderDepth, renderScreenPos, type Renderable } from './renderPlacement';

const CENTRE = { tx: 16, ty: 16 };

interface Drawn {
  kind: 'graphics' | 'image';
  key: string;
  frame: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  flipX: boolean;
  scale: number;
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
    const d: Drawn = { kind, key, frame: 0, x: 0, y: 0, originX: 0.5, originY: 0.5, flipX: false, scale: 1, depth: 0, alpha: 1, tint: null, visible: true, destroyed: false, colors: [], strokes: 0, clears: 0 };
    all.push(d);
    const same = () => obj;
    const obj = {
      beginPath: same, moveTo: same, lineTo: same, closePath: same, fillPath: same,
      setScale: (v: number) => ((d.scale = v), obj),
      setOrigin: (x: number, y = x) => ((d.originX = x), (d.originY = y), obj),
      setFlipX: (v: boolean) => ((d.flipX = v), obj),
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
    /** Every shown piece of a standard. */
    parts: () => live().filter((d) => d.kind === 'image' && d.visible),
    poles: () => live().filter((d) => d.key === FX_KEYS.hillPole),
    cloths: () => live().filter((d) => d.kind === 'image' && d.key !== FX_KEYS.hillPole && d.key !== FX_KEYS.hillSwords),
    swords: () => live().filter((d) => d.key === FX_KEYS.hillSwords && d.visible),
  };
}

function seeAll(fog: FogOfWarData): void {
  for (let ty = 0; ty < fog.height; ty++) for (let tx = 0; tx < fog.width; tx++) fog.markVisible(tx, ty);
}

function setup({ allies = 0, seen = 'all', waiting = () => false, map = new MapData(32, 32) }: { allies?: number; seen?: 'all' | 'none'; waiting?: () => boolean; map?: MapData } = {}) {
  const world = createEcsWorld();
  const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, allies);
  const hill = createHill(world, map, CENTRE).hill!;
  const fog = new FogOfWarData(32, 32);
  if (seen === 'all') seeAll(fog);
  const fake = fakeScene();
  const marker = new HillMarkerSystem(fake.scene, world, players, fog, waiting);
  return { world, players, hill, fog, marker, map, ...fake };
}

const STATES = ['empty', 'held', 'contested'] as const;
const STATE = {
  empty: { holderTeam: null, contested: false },
  held: { holderTeam: 1, contested: false },
  contested: { holderTeam: null, contested: true },
} as const;

function tileOf({ x, y }: Drawn) {
  return screenToTile({ sx: x, sy: y });
}

const PAINT_OF: Readonly<Record<string, keyof typeof HILL_ART>> = {
  [FX_KEYS.hillPole]: 'pole',
  [FX_KEYS.hillFlag]: 'flag',
  [FX_KEYS.hillTorn]: 'torn',
  [FX_KEYS.hillFurled]: 'furled',
  [FX_KEYS.hillSwords]: 'swords',
};
const artSize = new Map<string, { width: number; height: number }>();

/** A part's drawn box (world px) from its real texture; every frame of a waving cloth fills the same box. */
function partBox(part: Drawn) {
  let size = artSize.get(part.key);
  if (!size) {
    const name = PAINT_OF[part.key]!;
    const { width, height } = HILL_ART[name]();
    const frames = name === 'flag' || name === 'torn' ? HILL_ART_FRAMES : 1;
    artSize.set(part.key, (size = { width: width / frames, height }));
  }
  const w = size.width * part.scale;
  const h = size.height * part.scale;
  const left = part.x - part.originX * w;
  const top = part.y - part.originY * h;
  return { left, top, right: left + w, bottom: top + h };
}

/**
 * How far any land unit reaches from its feet (world px), from the real
 * sheets: every civ, animation, frame and heading (mirrored ones too). The
 * riders are the widest, with their lances; the pikes reach a little higher.
 */
function unitReach() {
  let side = 0;
  let up = 0;
  let down = 0;
  for (const type of (Object.keys(UNIT_BALANCE) as UnitType[]).filter((t) => moveLayerOfType(t) === 'land')) {
    for (const civ of Object.keys(CIV_DEFS) as CivId[]) {
      const g = sheetGeometry(type, civ);
      for (let k = 0; k < g.layout.frameCount; k++) {
        const r = frameRect(g, k);
        const b = frameBox(g, k);
        side = Math.max(side, b.w / 2 - r.ox, r.ox + r.w - b.w / 2);
        up = Math.max(up, b.feetY - r.oy);
        down = Math.max(down, r.oy + r.h - b.feetY);
      }
    }
  }
  return { side: side / ART_SCALE, up: up / ART_SCALE, down: down / ART_SCALE };
}

beforeAll(() => installRecordingCanvas());
afterEach(() => void setTeamPalette('default'));

describe('HillMarkerSystem (M19)', () => {
  it('draws nothing in a match without a hill', () => {
    const fake = fakeScene();
    new HillMarkerSystem(fake.scene, createEcsWorld(), createPlayers('hungarian', ['english']), new FogOfWarData(8, 8), () => false).update(0);
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

  it('three banners stand just past the back and side corners, under the units on their tile and under the fog', () => {
    const { marker, poles, live } = setup();
    marker.update(0);
    const at = poles().map(tileOf);
    expect(at).toHaveLength(3);
    for (const [dx, dy] of [[-4, -4], [-4, 4], [4, -4]] as const) expect(at).toContainEqual({ tx: CENTRE.tx + dx, ty: CENTRE.ty + dy });
    for (const p of poles()) {
      const { tx, ty } = tileOf(p);
      expect(inHillZone(CENTRE, { tx, ty })).toBe(false);
      expect(p.depth).toBeGreaterThan(tx + ty + 0.1); // the tile's decor and trees
      expect(p.depth).toBeLessThan(tx + ty + 0.3); // its units
    }
    for (const d of live()) expect(d.depth).toBeLessThan(10_000);
  });

  it('the banners stand where they stood after felling, and after a load', () => {
    const map = new MapData(32, 32, TERRAIN.forest);
    const first = setup({ map });
    first.marker.update(0);
    const spots = () => first.poles().map(tileOf);
    const before = spots();
    expect(before).toContainEqual({ tx: CENTRE.tx - 4, ty: CENTRE.ty - 4 });
    for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx += 1 + (ty % 2)) map.setTile(tx, ty, TERRAIN.grass);
    first.marker.update(16);
    expect(spots()).toEqual(before);

    const loaded = setup({ map: MapData.fromRaw(map.width, map.height, map.getRawTiles(), map.getRawBlocked()) });
    loaded.marker.update(0);
    expect(loaded.poles().map(tileOf)).toEqual(before);
  });

  it.each(STATES)('%s: no part of a standard covers a unit standing on or crossing any of the 49 tiles', (status) => {
    const { marker, hill, parts } = setup();
    Object.assign(hill, STATE[status]);
    const { side, up, down } = unitReach();
    const tiles = [...hillTiles(CENTRE)];
    expect(tiles).toHaveLength(49);
    const spots = [...tiles];
    // A walker's sprite and depth go linearly between tiles: the whole square, finely.
    for (let x = -60; x <= 60; x++) for (let y = -60; y <= 60; y++) spots.push({ tx: CENTRE.tx + x / 20, ty: CENTRE.ty + y / 20 });

    const covered = new Set<string>();
    for (let frame = 0; frame < HILL_ART_FRAMES; frame++) {
      marker.update(frame * HILL_MARK.flag.frameMs);
      for (const part of parts()) {
        const box = partBox(part);
        for (const spot of spots) {
          const unit = { position: spot } as Renderable;
          if (part.depth <= renderDepth(unit)) continue;
          const { sx, sy } = renderScreenPos(unit);
          if (box.left < sx + side && box.right > sx - side && box.top < sy + down && box.bottom > sy - up) {
            covered.add(`${part.key} covers ${spot.tx - CENTRE.tx},${spot.ty - CENTRE.ty}`);
          }
        }
      }
    }
    expect([...covered].slice(0, 12)).toEqual([]);
  });

  it.each(STATES)('%s: the side standards mirror each other, their cloths flying away from the zone', (status) => {
    const { marker, hill, parts } = setup();
    Object.assign(hill, STATE[status]);
    marker.update(0);
    const middle = tileToScreen(CENTRE).sx;
    const round = (part: Drawn, sign: 1 | -1) => {
      const { left, right, top, bottom } = partBox(part);
      const xs = [(left - middle) * sign, (right - middle) * sign].sort((a, b) => a - b);
      return [part.key, ...[...xs, top, bottom].map((v) => v.toFixed(2))].join();
    };
    const rightSide = parts().filter((d) => d.x > middle + 64);
    const leftSide = parts().filter((d) => d.x < middle - 64);
    expect(rightSide.length).toBeGreaterThan(1);
    expect(leftSide.map((d) => round(d, -1)).sort()).toEqual(rightSide.map((d) => round(d, 1)).sort());
    if (status === 'empty') return;
    const cloth = (side: Drawn[]) => side.find((d) => d.key === FX_KEYS.hillFlag || d.key === FX_KEYS.hillTorn)!;
    expect(cloth(leftSide).flipX).toBe(true);
    expect(cloth(rightSide).flipX).toBe(false);
    expect(partBox(cloth(leftSide)).right).toBeLessThanOrEqual(cloth(leftSide).x);
    expect(partBox(cloth(rightSide)).left).toBeGreaterThanOrEqual(cloth(rightSide).x);
  });

  it('empty: furled neutral cloths and no player colour', () => {
    const { marker, cloths, swords, ground } = setup();
    marker.update(0);
    expect(cloths().map((c) => c.key)).toEqual(Array(3).fill(FX_KEYS.hillFurled));
    expect(cloths().every((c) => c.tint === null)).toBe(true);
    expect(swords()).toEqual([]);
    for (const g of ground()) for (const id of [1, 2, 3, 4]) expect(g.colors).not.toContain(playerColor(id));
  });

  it('held: flying flags and a ring in the holder colour', () => {
    const { marker, hill, cloths, ground } = setup();
    hill.holderTeam = 3;
    marker.update(0);
    expect(cloths().map((c) => [c.key, c.tint])).toEqual(Array(3).fill([FX_KEYS.hillFlag, playerColor(3)]));
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
    expect(cloths().map((c) => [c.key, c.tint])).toEqual(Array(3).fill([FX_KEYS.hillTorn, null]));
    expect(swords()).toHaveLength(3);
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
    seeAll(fog);
    fog.dimVisibleToExplored();
    marker.update(16);
    expect(live().filter((d) => d.kind === 'image' && d.visible)).toHaveLength(9);
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

  it.each(['empty', 'contested'] as const)('%s: the glow is still, as the clocks are', (status) => {
    const { marker, hill, ground } = setup();
    Object.assign(hill, STATE[status]);
    const alphas = (time: number) => (marker.update(time), ground().map((g) => g.alpha));
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
