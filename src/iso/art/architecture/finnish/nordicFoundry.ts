import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { chimney, forgeLight, forgeMouth } from '../parts';
import type { ArchStyle } from '../style';
import { towerLine } from '../towerParts';
import type { BuildingArt } from '../types';
import { footing, mainRoof, nDoor, wallBlock, type Block } from './nordicParts';
import { stoneFurnace, waterWheel } from './nordicProps';

/*
 * Finnish cannon foundry: an ironworks (bruk). A granite blast furnace
 * with its charging bridge carries a tall brick stack; its bellows run
 * off a water wheel; in front, the falu-red casting house under a
 * shingled gambrel opens its glowing casting floor onto a row of
 * finished barrels.
 */

function paintFoundry(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x7a7266);
  p.ground(2.25, 0.1, 2.75, 2.9, 0x4a6676);
  const top = stoneFurnace(p, s, [1.15, 0.3, 2.05, 1.2], 92);
  chimney(p, 1.45, 0.6, 1.75, 0.9, top, top + 82, { color: c.brick, detail: 'brick' });
  waterWheel(p, s, 2.5, 1.45, 36, 0.3, 0.7);
  const house: Block = [0.3, 1.35, 1.95, 2.35];
  const z0 = footing(p, s, house, 5);
  wallBlock(p, s, house, z0, z0 + 40, (w, h) => {
    forgeMouth(p, w * 0.42, 22, 26);
    nDoor(p, s, w * 0.12, 14, 26, c.doors.work, 1);
    crest(p.ctx, s, w * 0.8, -h * 0.6, 8, team);
  }, (w, h) => {
    p.ctx.fillStyle = '#1e1610';
    p.ctx.fillRect(w / 2 - 5, -h + 10, 10, 10);
  });
  mainRoof(p, s, house, z0 + 40, 'u');
  forgeLight(p, 1.2, 2.6);
  // Finished barrels on skids.
  for (const v of [2.55, 2.7, 2.85]) {
    towerLine(p, p.p(0.4, v, 4), p.p(1.4, v, 4), 0x2e2c2a, 6);
    const [x, y] = p.p(1.4, v, 4);
    p.ctx.fillStyle = css(shade(0x2e2c2a, 0.6));
    p.ctx.beginPath();
    p.ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    p.ctx.fill();
  }
  p.addVolumePoint(0.9, 2.7, 8);
  p.flag(2.85, 2.85, 0, 36, team, true);
}

/** The Finnish foundry (age 3 only). */
export function nordicFoundry(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 230, paint: (p, team) => paintFoundry(p, s, team) };
}
