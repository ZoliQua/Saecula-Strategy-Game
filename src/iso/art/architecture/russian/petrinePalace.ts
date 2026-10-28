import type { IsoPainter } from '../../isoPainter';
import { baroqueBlock, pediment } from '../baroqueParts';
import { baroqueWindow, cornice } from '../facade';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import { styledHip } from '../styledRoofs';
import type { BuildingArt } from '../types';
import { fiveDomes } from './soborParts';

/*
 * Russian age-3 town centre: a Petrine-Elizabethan palace of turquoise
 * render, white pilasters and green iron hips, low in front of its court
 * church — a white-ordered cube under a low hip carrying five gilt onions
 * on tall drums (after Smolny) over the palace roof — and parterre beds.
 */

const PALACE = [0.25, 1.78, 2.75, 2.72] as const;
const CHURCH = [1.05, 0.32, 2.2, 1.47] as const;

/** Two storeys of windows per bay on a face; `lit` bays glow, the rest are shuttered dark. */
function storeys(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, bays: number, lit: (i: number) => boolean): void {
  cornice(p.ctx, w, 32, s.palette.trim, light, 4);
  for (let i = 0; i < bays; i++) {
    const x = (w / bays) * (i + 0.5);
    if (lit(i)) {
      p.window(x - 4.5, -26, 9, 15, true);
      baroqueWindow(p, s, x - 5.5, -h + 14, 11, 20, light);
    } else {
      p.ctx.fillStyle = 'rgba(30,48,44,0.85)';
      p.ctx.fillRect(x - 4, -26, 8, 14);
      p.ctx.fillRect(x - 4.5, -h + 15, 9, 18);
    }
  }
}

function paintPalace(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xc8bfa8);
  // Parterre beds either side of the church.
  for (const [u, v] of [[0.3, 0.4], [0.3, 1.0], [2.4, 0.4], [2.4, 1.0]] as const) p.ground(u, v, u + 0.4, v + 0.44, 0x6f8f4a, 1);
  const [a0, b0, a1, b1] = CHURCH;
  baroqueBlock(p, s, a0, b0, a1, b1, 0, 92, {
    bays: 3,
    // The palace hides most of the church's left face: its windows stay dark.
    left: (w, h) => {
      p.ctx.fillStyle = 'rgba(30,48,44,0.9)';
      for (const x of [0.17, 0.83]) p.ctx.fillRect(w * x - 5, -h + 19, 10, 24);
    },
    right: (w, h, l) => baroqueWindow(p, s, w / 2 - 6, -h + 18, 12, 26, l),
  });
  styledHip(p, s, a0, b0, a1, b1, 92, 20, c.roof, 0.06);
  fiveDomes(p, s, [a0, b0, a1, b1], 92 + 20 * s.roof.pitch - 10, { centre: 0.21, corner: 0.12, drum: 44, onion: { color: c.metal } });
  const [u0, v0, u1, v1] = PALACE;
  baroqueBlock(p, s, u0, v0, u1, v1, 0, 66, {
    bays: 8,
    left: (w, h, l) => storeys(p, s, w, h, l, 8, (i) => i === 1 || i === 6),
    right: (w, h, l) => storeys(p, s, w, h, l, 2, (i) => i === 0),
  });
  styledHip(p, s, u0, v0, u1, v1, 66, 30, c.roof, 0.08);
  pediment(p, s, 1.15, 1.85, v1, 66, 28, team);
  p.leftFace(u0, u1, v1, 0, (w) => p.door(w / 2 - 8, 16, 28, c.doors.main), 66);
  p.flag(0.4, 2.2, 66 + 30 * s.roof.pitch * 0.4, 30, team, true);
  for (const u of [0.35, 2.65]) lantern(p, u, 2.85, 30, u, 2.97);
}

/** The Russian age-3 town centre: a turquoise palace and its five-domed church. */
export function petrinePalace(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 290 + s.headroom, paint: (p, team) => paintPalace(p, s, team) };
}
