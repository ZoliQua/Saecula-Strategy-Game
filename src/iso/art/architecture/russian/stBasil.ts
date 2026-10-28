import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, scaffold } from '../wonderParts';
import { BRICK, centralOctagon, centralSpire, chapelBody, chapelCrown, GOLD, WHITE, type Chapel } from './stBasilParts';

/*
 * The Russian Wonder: St Basil's (the Intercession on the Moat). On a
 * red-brick gallery podium, eight chapels ring the central tower — four
 * tall octagons on the axes and four smaller ones on the diagonals —
 * each under kokoshniki, a drum and an onion striped, spiralled or
 * chevroned in green, gold, red, blue and white; the central octagon
 * rises through two kokoshnik rings to the tall green tent spire.
 * Stages: footings; chapels and the central octagon risen in brick
 * inside scaffolding; chapels crowned with unpainted tin onions while
 * the central tower still waits for its tent. The finished art adds the
 * tent spire and the painted onions.
 */

const Z0 = 10;
const C = 2.0;
const CORE_R = 0.5;
const CORE_TOP = 158;

const CHAPELS: readonly Chapel[] = [
  { u: C, v: C - 1.18, r: 0.38, top: 104, drum: 30, onion: { color: 0x2f7d4f, alt: 0xe8c040, pattern: 'spiral' } },
  { u: C + 1.18, v: C, r: 0.38, top: 104, drum: 30, onion: { color: 0xc23a2e, alt: WHITE, pattern: 'stripes' } },
  { u: C - 1.18, v: C, r: 0.38, top: 104, drum: 30, onion: { color: 0x2e5fa8, alt: WHITE, pattern: 'spiral' } },
  { u: C, v: C + 1.18, r: 0.38, top: 104, drum: 30, onion: { color: GOLD, alt: 0x2f7d4f, pattern: 'chevron' } },
  { u: C - 0.84, v: C - 0.84, r: 0.26, top: 80, drum: 22, onion: { color: 0xe8c040, alt: 0x2f7d4f, pattern: 'stripes' } },
  { u: C + 0.84, v: C - 0.84, r: 0.26, top: 80, drum: 22, onion: { color: 0x2f7d4f, alt: 0xc23a2e, pattern: 'chevron' } },
  { u: C - 0.84, v: C + 0.84, r: 0.26, top: 80, drum: 22, onion: { color: 0xc23a2e, alt: 0xe8c040, pattern: 'spiral' } },
  { u: C + 0.84, v: C + 0.84, r: 0.26, top: 80, drum: 22, onion: { color: 0x2e5fa8, alt: 0xe8c040, pattern: 'stripes' } },
];

/** Podium: brick gallery base with a white coping and arcade of dark arches on its two visible faces. */
function podium(p: IsoPainter): void {
  p.box(0.3, 0.3, 3.7, 3.7, 0, Z0, { color: BRICK, detail: 'brick' }, shade(0xb8a890, 1));
  const arches = (w: number) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(WHITE);
    ctx.fillRect(0, -Z0, w, 2);
    for (let x = 8; x < w - 6; x += 16) {
      ctx.fillStyle = '#2a1e18';
      ctx.fillRect(x, -6, 6, 6);
    }
  };
  p.leftFace(0.3, 3.7, 3.7, 0, arches, Z0);
  p.rightFace(0.3, 3.7, 3.7, 0, arches, Z0);
}

function paintBasil(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const done = stage > WONDER_STAGES;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0xc9bda4);
  podium(p);
  const chapelTop = [0, Z0 + 16, 999, 999][stage] ?? 999;
  const coreTop = [0, Z0 + 22, CORE_TOP - 30, CORE_TOP][stage] ?? CORE_TOP;
  // Back to front: chapels behind the core, the side chapels, the core, then the front ones.
  const depth = (c: Chapel) => c.u + c.v;
  const behind = CHAPELS.filter((c) => depth(c) < 2 * C - 0.01).sort((a, b) => depth(a) - depth(b));
  const sides = CHAPELS.filter((c) => Math.abs(depth(c) - 2 * C) < 0.01);
  const front = CHAPELS.filter((c) => depth(c) > 2 * C + 0.01).sort((a, b) => depth(a) - depth(b));
  const chapel = (c: Chapel) => {
    chapelBody(p, c, Z0, chapelTop, done);
    if (stage >= 2) chapelCrown(p, c, stage === 2 ? null : done);
  };
  behind.forEach(chapel);
  sides.forEach(chapel);
  centralOctagon(p, C, C, CORE_R, Z0, coreTop, stage >= 3, done);
  if (done) centralSpire(p, C, C, CORE_R * 0.78, coreTop + 26, 150);
  else if (stage === 3) scaffold(p, C - 0.4, C - 0.4, C + 0.4, C + 0.4, coreTop + 26, coreTop + 60);
  else scaffold(p, C - CORE_R, C - CORE_R, C + CORE_R, C + CORE_R, coreTop - 40, coreTop);
  front.forEach(chapel);
  if (!done) {
    if (stage < 3) for (const [u, v] of [[3.2, 3.5], [3.45, 3.3], [3.3, 3.1]] as const) p.box(u, v, u + 0.2, v + 0.14, Z0, Z0 + 9, { color: BRICK, detail: 'brick' }, BRICK);
    crane(p, 0.6, 3.3, [0, 120, 170, 220][stage] ?? 220, C, C, coreTop + 30);
    return;
  }
  if (team !== null) {
    p.flag(3.62, 3.62, Z0, 40, team, true);
    p.leftFace(C - 0.3, C + 0.3, 3.7, 0, (w) => crest(p.ctx, s, w / 2, -5, 5, team), Z0);
  }
  lantern(p, 0.5, 3.75, 26, 0.5, 3.9);
  lantern(p, 3.75, 0.5, 26, 3.9, 0.5);
}

/** The Russian Wonder (age-3 style): St Basil's cathedral, finished in the team colour, or a construction stage. */
export function stBasil(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 420,
    paint: (p, team) => paintBasil(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintBasil(p, s, null, stage),
  };
}
