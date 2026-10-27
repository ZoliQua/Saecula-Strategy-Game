import { beforeAll, describe, expect, it } from 'vitest';
import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { BuildingType } from '../../../../types';
import { paintBuilding, paintWonderStage } from '../../buildings';
import { IsoPainter } from '../../isoPainter';
import { NormalLayer } from '../../lighting/normalLayer';
import { hashPainting, installRecordingCanvas, type RecordedCanvas } from '../../testing/recordingCanvas';
import { ARCH_FAMILIES } from '../registry';
import type { ArchStyle } from '../style';
import { WONDER_STAGES } from '../wonder';
import { dummy } from './englishParts';
import { ENGLISH_GEORGIAN, ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR } from './englishStyles';

const TEAM = 0x3b6fd6;
const TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range', 'stable', 'blacksmith', 'tower', 'foundry', 'wonder',
];
/** Types with lit windows, doorways, forges or torches (dusk glows). */
const LIT: readonly BuildingType[] = ['town_center', 'house', 'barracks', 'stable', 'blacksmith', 'archery_range', 'mining_camp', 'tower', 'foundry', 'wonder'];

function painter(s: ArchStyle, type: BuildingType) {
  const art = ARCH_FAMILIES[s.family](s)[type];
  if (!art) throw new Error(`${s.id} has no ${type}`);
  const p = new IsoPainter(art.size, art.size, art.maxHeight, 11);
  p.windowLook = s.palette.window;
  return { art, p };
}

function paint(s: ArchStyle, type: BuildingType, team = TEAM) {
  let out: ReturnType<IsoPainter['result']> | null = null;
  const hash = hashPainting(() => {
    const { art, p } = painter(s, type);
    art.paint(p, team);
    out = p.result(false);
    return { volume: out.volume, glows: out.glows, lights: out.lights, smoke: out.smoke };
  });
  if (!out) throw new Error('not painted');
  return { hash, result: out as ReturnType<IsoPainter['result']> };
}

function topZ(volume: ReadonlyArray<{ z: number }>): number {
  return Math.max(...volume.map((v) => v.z));
}

describe('English Georgian set (age 3), towers, foundry and Wonder', () => {
  beforeAll(() => installRecordingCanvas());

  it('paints every age-3 type deterministically, with a shadow volume', () => {
    for (const type of TYPES) {
      const a = paint(ENGLISH_GEORGIAN, type);
      expect(a.hash, type).toBe(paint(ENGLISH_GEORGIAN, type).hash);
      expect(a.result.volume.length, type).toBeGreaterThan(0);
    }
  });

  it('carries the team colour on every type', () => {
    for (const type of TYPES) expect(paint(ENGLISH_GEORGIAN, type, 0xc0392b).hash, type).not.toBe(paint(ENGLISH_GEORGIAN, type).hash);
  });

  it('lights windows, fanlights, forges or braziers at dusk', () => {
    for (const type of LIT) expect(paint(ENGLISH_GEORGIAN, type).result.glows.length, type).toBeGreaterThan(0);
  });

  it('is not the Hungarian art: every age-3 type, the foundry and the Wonder differ through paintBuilding', () => {
    for (const type of TYPES) {
      const hu = hashPainting(() => paintBuilding(type, TEAM, 3, 'hungarian', false).volume);
      const en = hashPainting(() => paintBuilding(type, TEAM, 3, 'english', false).volume);
      expect(en, type).not.toBe(hu);
    }
  });

  it('gives the English tower its own silhouette in every age', () => {
    for (const age of [1, 2, 3] as const) {
      const hu = hashPainting(() => paintBuilding('tower', TEAM, age, 'hungarian', false).volume);
      const en = hashPainting(() => paintBuilding('tower', TEAM, age, 'english', false).volume);
      expect(en, `age ${age}`).not.toBe(hu);
    }
  });

  it('keeps every tower fighting platform at TOWER_PLATFORM_Z (arrows leave from there) under the canvas top', () => {
    for (const [s, age] of [[ENGLISH_ROMANO_BRITISH, 1], [ENGLISH_TUDOR, 2], [ENGLISH_GEORGIAN, 3]] as const) {
      const { art } = painter(s, 'tower');
      const top = topZ(paint(s, 'tower').result.volume);
      expect(top, s.id).toBeGreaterThan(TOWER_PLATFORM_Z[age]);
      expect(top, s.id).toBeLessThanOrEqual(art.maxHeight);
    }
  });

  it('domestic smoke follows the chimneys ornament; forge and foundry smoke always stays', () => {
    const off: ArchStyle = { ...ENGLISH_GEORGIAN, ornaments: { ...ENGLISH_GEORGIAN.ornaments, chimneys: false } };
    expect(paint(ENGLISH_GEORGIAN, 'house').result.smoke.length).toBeGreaterThan(0);
    expect(paint(off, 'house').result.smoke.length).toBe(0);
    expect(paint(off, 'town_center').result.smoke.length).toBe(0);
    expect(paint(off, 'blacksmith').result.smoke.length).toBeGreaterThan(0);
    expect(paint(off, 'foundry').result.smoke.length).toBeGreaterThan(0);
  });

  it('Wonder stages rise from foundations to the finished cathedral; only the finished spire reaches the top', () => {
    const tops = [1, 2, 3].map((stage) => topZ(paintWonderStage(stage, 'english').volume));
    const done = topZ(paintBuilding('wonder', TEAM, 3, 'english', false).volume);
    expect(tops[0]).toBeLessThan(tops[1]!);
    expect(tops[1]).toBeLessThan(tops[2]!);
    expect(tops[2]).toBeLessThan(done);
    const hashes = new Set([1, 2, 3].map((stage) => hashPainting(() => paintWonderStage(stage, 'english').volume)));
    expect(hashes.size).toBe(WONDER_STAGES);
  });

  it('the finished cathedral glows through the rose and the lancets; the open shell of stage 2 does not', () => {
    expect(paintBuilding('wonder', TEAM, 3, 'english', false).glows.length).toBeGreaterThan(20);
    expect(paintWonderStage(2, 'english').glows.length).toBe(0);
  });
});

describe('Prop normals stay inside the prop (N1)', () => {
  beforeAll(() => installRecordingCanvas());

  it('cylinderStroke strokes the polylines instead of filling their bounding rectangle', () => {
    const layer = new NormalLayer(100, 100);
    layer.cylinderStroke([[[10, 90], [50, 10]]], 3, 10, 40);
    const log = (layer.canvas as unknown as RecordedCanvas).log;
    expect(log.some((l) => l.startsWith('stroke('))).toBe(true);
    expect(log.some((l) => l.startsWith('fillRect('))).toBe(false);
  });

  it('the training dummy no longer paints its 18×34 bounding box of normals', () => {
    const p = new IsoPainter(1, 1, 60, 1);
    dummy(p, 0.5, 0.5);
    const log = (p.normals.canvas as unknown as RecordedCanvas).log;
    expect(log.filter((l) => l.startsWith('fillRect(')).length).toBe(0);
  });
});
