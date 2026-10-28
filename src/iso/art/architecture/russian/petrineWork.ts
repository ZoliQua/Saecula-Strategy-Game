import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import { railFence } from '../baroqueParts';
import { onionDome } from '../kits/onionDome';
import { octPrism } from '../kits/tentRoof';
import type { ArchStyle } from '../style';
import { baroqueTower } from '../towers';
import type { BuildingArt } from '../types';
import { stog } from './izbaParts';
import { stripField, tentMill } from './izbaProps';

/*
 * Russian age-3 overrides of the baroque farm and tower: a white-rendered
 * windmill under a green iron tent over the strip fields and haystacks;
 * and the baroque watchtower with a white octagonal belfry and gilt
 * onion rising from its back corner.
 */

/** Estate farm: strip fields, haystacks and a white-rendered windmill under a green iron tent. */
export function petrineFarm(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 2,
    maxHeight: 180 + s.headroom,
    paint: (p, team) => {
      p.ground(0.05, 0.05, 1.95, 1.95, 0x6e5a3a);
      stripField(p, 0.08, 1.0, 1.92, 1.92, 4);
      p.footShadow();
      tentMill(p, s, 0.6, 0.55, 0.3, 84, 58, team, { body: c.trim, detail: 'plain', roof: c.roof, material: 'copper' });
      stog(p, 1.4, 0.38, 13, 40);
      stog(p, 1.7, 0.72, 12, 36);
      railFence(p, 0.05, 1.96, 1.96, 1.96, 12);
    },
  };
}

/** Height (art px) of the belfry's octagon above the tower platform. */
const BELFRY_H = 28;

/** The baroque watchtower with an onion-domed octagonal belfry at its back corner. */
export function petrineTower(s: ArchStyle): BuildingArt {
  const base = baroqueTower(s);
  const c = s.palette;
  return {
    size: 1,
    maxHeight: base.maxHeight,
    paint: (p, team) => {
      base.paint(p, team);
      // The belfry stands on the base tower's platform (towers.ts baroqueTower).
      const z = TOWER_PLATFORM_Z[3];
      octPrism(p, 0.22, 0.22, 0.13, z, z + BELFRY_H, c.trim, 'plain', (w, _h, light) => {
        p.ctx.fillStyle = light > 0.9 ? '#2a2420' : '#1e1a16';
        p.ctx.fillRect(w / 2 - 2, -22, 4, 12);
      });
      onionDome(p, 0.22, 0.22, 0.11, z + BELFRY_H, { color: c.metal, drum: { h: 8, color: c.plaster } });
    },
  };
}
