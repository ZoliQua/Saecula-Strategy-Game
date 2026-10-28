import { baroqueBlock, railFence } from '../baroqueParts';
import { baroqueWindow } from '../facade';
import { onionDome } from '../kits/onionDome';
import { octPrism } from '../kits/tentRoof';
import type { ArchStyle } from '../style';
import { styledHip } from '../styledRoofs';
import { baroqueTower } from '../towers';
import type { BuildingArt } from '../types';
import { stog } from './izbaParts';
import { stripField } from './izbaProps';

/*
 * Russian age-3 overrides of the baroque farm and tower: an estate
 * granary in turquoise render with a gilt onion on its hip over the
 * strip fields and haystacks; and the baroque watchtower with a white
 * octagonal belfry and gilt onion rising from its back corner.
 */

/** Estate farm: strip fields, haystacks and a rendered granary crowned by an onion. */
export function petrineFarm(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 2,
    maxHeight: 150 + s.headroom,
    paint: (p, team) => {
      p.ground(0.05, 0.05, 1.95, 1.95, 0x6e5a3a);
      stripField(p, 0.08, 1.0, 1.92, 1.92, 4);
      p.footShadow();
      baroqueBlock(p, s, 0.2, 0.18, 1.05, 0.86, 0, 40, {
        left: (w, h, l) => {
          p.door(w * 0.5 - 7, 14, 24, c.doors.work);
          baroqueWindow(p, s, w * 0.15, -h + 12, 9, 14, l);
        },
      });
      styledHip(p, s, 0.2, 0.18, 1.05, 0.86, 40, 32, c.roof, 0.08);
      onionDome(p, 0.625, 0.52, 0.1, 40 + 32 * s.roof.pitch - 8, { color: c.metal, drum: { h: 16, color: c.trim } });
      stog(p, 1.4, 0.38, 13, 40);
      stog(p, 1.7, 0.72, 12, 36);
      railFence(p, 0.05, 1.96, 1.96, 1.96, 12);
      p.flag(1.96, 1.96, 0, 26, team);
    },
  };
}

/** The baroque watchtower with an onion-domed octagonal belfry at its back corner. */
export function petrineTower(s: ArchStyle): BuildingArt {
  const base = baroqueTower(s);
  const c = s.palette;
  return {
    size: 1,
    maxHeight: base.maxHeight,
    paint: (p, team) => {
      base.paint(p, team);
      octPrism(p, 0.22, 0.22, 0.13, 140, 168, c.trim, 'plain', (w, _h, light) => {
        p.ctx.fillStyle = light > 0.9 ? '#2a2420' : '#1e1a16';
        p.ctx.fillRect(w / 2 - 2, -22, 4, 12);
      });
      onionDome(p, 0.22, 0.22, 0.11, 168, { color: c.metal, drum: { h: 8, color: c.plaster } });
    },
  };
}
