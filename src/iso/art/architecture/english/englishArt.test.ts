import { beforeAll, describe, expect, it } from 'vitest';
import type { BuildingType } from '../../../../types';
import { paintBuilding } from '../../buildings';
import { IsoPainter } from '../../isoPainter';
import { hashPainting, installRecordingCanvas } from '../../testing/recordingCanvas';
import { HUNGARIAN_MEDIEVAL } from '../hungarianStyles';
import { ARCH_FAMILIES } from '../registry';
import type { ArchStyle } from '../style';
import { ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR } from './englishStyles';
import { jettyStorey } from './halfTimber';
import { coneRoof, drumWall, roundhouse } from './roundhouse';

const TEAM = 0x3b6fd6;
const TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range', 'stable', 'blacksmith', 'tower',
];
const STYLES: readonly ArchStyle[] = [ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR];
/** Types with lit windows, doorways or torches (dusk glows). */
const LIT: readonly BuildingType[] = ['town_center', 'house', 'barracks', 'stable', 'blacksmith'];

function paint(s: ArchStyle, type: BuildingType, team = TEAM) {
  const art = ARCH_FAMILIES[s.family](s)[type];
  if (!art) throw new Error(`${s.id} has no ${type}`);
  let painter: IsoPainter | null = null;
  const hash = hashPainting(() => {
    painter = new IsoPainter(art.size, art.size, art.maxHeight, 11);
    painter.windowLook = s.palette.window;
    art.paint(painter, team);
    const r = painter.result(false);
    return { volume: r.volume, glows: r.glows, lights: r.lights, smoke: r.smoke };
  });
  if (!painter) throw new Error('not painted');
  return { hash, result: (painter as IsoPainter).result(false) };
}

function without(s: ArchStyle, ornament: 'chimneys' | 'halfTimber'): ArchStyle {
  return { ...s, ornaments: { ...s.ornaments, [ornament]: false } };
}

type Pt = readonly [number, number];

/** Painter that notes the highest main-roof top (roofs of at least half the largest footprint) and smoke heights. */
class SmokeProbe extends IsoPainter {
  readonly smokeZ: number[] = [];
  private readonly roofs: Array<{ area: number; top: number }> = [];
  override recordRoof(u0: number, v0: number, u1: number, v1: number, eave: number, peaks: Pt[], top: number): void {
    this.roofs.push({ area: (u1 - u0) * (v1 - v0), top });
    super.recordRoof(u0, v0, u1, v1, eave, peaks, top);
  }
  override addSmoke(u: number, v: number, z: number): void {
    this.smokeZ.push(z);
    super.addSmoke(u, v, z);
  }
  get ridge(): number {
    const largest = Math.max(...this.roofs.map((r) => r.area));
    return Math.max(...this.roofs.filter((r) => r.area >= largest / 2).map((r) => r.top));
  }
}

const maxZ = (r: { volume: readonly { z: number }[] }) => Math.max(...r.volume.map((v) => v.z));

describe('English buildings (ages 1-2)', () => {
  beforeAll(() => installRecordingCanvas());

  it('paints every age-1/2 type deterministically, with a shadow volume', () => {
    for (const s of STYLES) {
      for (const type of TYPES) {
        const a = paint(s, type);
        expect(a.hash, `${s.id} ${type}`).toBe(paint(s, type).hash);
        expect(a.result.volume.length, `${s.id} ${type}`).toBeGreaterThan(0);
      }
    }
  });

  it('carries the team colour on every type (banners, flags, crests)', () => {
    for (const s of STYLES) {
      for (const type of TYPES) expect(paint(s, type, 0xc0392b).hash, `${s.id} ${type}`).not.toBe(paint(s, type).hash);
    }
  });

  it('lights windows, doorways or torches at dusk on the dwelling and military types', () => {
    for (const s of STYLES) {
      for (const type of LIT) expect(paint(s, type).result.glows.length, `${s.id} ${type}`).toBeGreaterThan(0);
    }
  });

  it('is not the Hungarian art: English pieces differ through the real paintBuilding path', () => {
    for (const age of [1, 2] as const) {
      for (const type of TYPES.filter((t) => t !== 'tower')) {
        const hu = hashPainting(() => paintBuilding(type, TEAM, age, 'hungarian', false).volume);
        const en = hashPainting(() => paintBuilding(type, TEAM, age, 'english', false).volume);
        expect(en, `${type} age ${age}`).not.toBe(hu);
      }
    }
  });

  it('domestic smoke follows the chimneys ornament; forge smoke always stays', () => {
    for (const s of STYLES) {
      expect(paint(s, 'house').result.smoke.length, s.id).toBeGreaterThan(0);
      expect(paint(without(s, 'chimneys'), 'house').result.smoke.length, s.id).toBe(0);
      expect(paint(without(s, 'chimneys'), 'blacksmith').result.smoke.length, s.id).toBeGreaterThan(0);
    }
  });

  it('smoke anchors clear the highest roof ridge (steep Tudor stacks, roundhouse apex)', () => {
    for (const [st, type] of [[ENGLISH_TUDOR, 'house'], [ENGLISH_TUDOR, 'town_center'], [ENGLISH_TUDOR, 'barracks'], [ENGLISH_TUDOR, 'blacksmith'], [ENGLISH_ROMANO_BRITISH, 'blacksmith']] as const) {
      const art = ARCH_FAMILIES[st.family](st)[type];
      if (!art) throw new Error(type);
      const p = new SmokeProbe(art.size, art.size, art.maxHeight, 1);
      art.paint(p, TEAM);
      expect(p.smokeZ.length, `${st.id} ${type}`).toBeGreaterThan(0);
      for (const z of p.smokeZ) expect(z, `${st.id} ${type}`).toBeGreaterThan(p.ridge);
    }
  });

  it('halfTimber off drops the Tudor framing', () => {
    expect(paint(without(ENGLISH_TUDOR, 'halfTimber'), 'house').hash).not.toBe(paint(ENGLISH_TUDOR, 'house').hash);
  });

  it('roofs are steeper than the Hungarian medieval set', () => {
    expect(maxZ(paint(ENGLISH_TUDOR, 'house').result)).toBeGreaterThan(maxZ(paint(HUNGARIAN_MEDIEVAL, 'house').result));
    expect(ENGLISH_TUDOR.roof.pitch).toBeGreaterThan(1);
    expect(ENGLISH_ROMANO_BRITISH.roof.pitch).toBeGreaterThan(1);
  });
});

describe('English primitives', () => {
  beforeAll(() => installRecordingCanvas());

  it('coneRoof records its rim at the eave and its apex at eave + rise', () => {
    const p = new IsoPainter(2, 2, 200, 1);
    coneRoof(p, 1, 1, 0.6, 30, 70, 0x9c8757, 'thatch');
    const zs = p.result(false).volume.map((v) => v.z);
    expect(zs.filter((z) => z === 30).length).toBe(8);
    expect(Math.max(...zs)).toBe(100);
  });

  it('drumWall records its top ring', () => {
    const p = new IsoPainter(2, 2, 100, 1);
    drumWall(p, 1, 1, 0.5, 0, 32, 0xd8d4c6, 'stone');
    expect(p.result(false).volume.map((v) => v.z)).toEqual(Array(8).fill(32));
  });

  it('roundhouse: apex rises with the pitch, a firelit door glows, hearth smoke at the apex', () => {
    const p = new IsoPainter(2, 2, 200, 1);
    const top = roundhouse(p, ENGLISH_ROMANO_BRITISH, 1, 1, { r: 0.6, wall: 30, rise: 50, door: 1.2, smoke: true });
    expect(top).toBeCloseTo(27 + 50 * ENGLISH_ROMANO_BRITISH.roof.pitch, 6);
    const r = p.result(false);
    expect(r.glows.length).toBe(1);
    expect(r.smoke.length).toBe(1);
  });

  it('jettyStorey overhangs the storey below by the jetty on both visible sides', () => {
    const p = new IsoPainter(2, 2, 100, 1);
    jettyStorey(p, ENGLISH_TUDOR, 0.3, 0.3, 1.3, 1.3, 30, 60, 0.12, 'close');
    const pts = p.result(false).volume;
    const xs = pts.map((v) => v.gx);
    const ref = new IsoPainter(2, 2, 100, 1);
    ref.box(0.3, 0.3, 1.42, 1.42, 30, 60, { color: 0xffffff });
    expect(xs).toEqual(ref.result(false).volume.map((v) => v.gx));
  });
});
