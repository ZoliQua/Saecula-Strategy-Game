import type Phaser from 'phaser';
import type { CivId, UnitType } from '../../../types';
import { ART_SCALE } from '../canvas';
import { lit } from '../lighting/LightManager';
import { readyFrame, unitArt, unitTextureKey, type UnitArt } from './UnitArt';

/**
 * Render proxy pair for one unit: the lit body sprite and, exactly on
 * top of it, the team-mask sprite tinted with the player colour (it
 * shares the body's normal map, so both are lit alike).
 */
export interface UnitSprites {
  readonly type: UnitType;
  readonly civ: CivId;
  /** Albedo texture key (also the cast-shadow caster key). */
  readonly key: string;
  /** Null until the type's textures exist (at most one new type per frame). */
  art: UnitArt | null;
  readonly body: Phaser.GameObjects.Sprite;
  readonly team: Phaser.GameObjects.Sprite;
}

/** Placeholder until the art exists (Phaser's built-in transparent texture). */
const BLANK = '__DEFAULT';

export function createUnitSprites(scene: Phaser.Scene, type: UnitType, civ: CivId, color: number, force = false): UnitSprites {
  const art = unitArt(scene, type, civ, force);
  const body = lit(scene.add.sprite(0, 0, art?.key ?? BLANK, art ? 0 : undefined).setScale(1 / ART_SCALE));
  const team = lit(scene.add.sprite(0, 0, art?.maskKey ?? BLANK, art ? 0 : undefined).setScale(1 / ART_SCALE));
  body.setOrigin(0.5, art?.originY[0] ?? 0.8);
  team.setOrigin(0.5, art?.originY[0] ?? 0.8).setTint(color);
  return { type, civ, key: unitTextureKey(type, civ), art, body, team };
}

/** The pair's art, swapping the placeholder for the real textures once they exist. */
export function ensureUnitArt(s: UnitSprites): UnitArt | null {
  if (s.art) return s.art;
  const art = unitArt(s.body.scene, s.type, s.civ);
  if (!art) return null;
  s.art = art;
  s.body.setTexture(art.key, 0);
  s.team.setTexture(art.maskKey, 0);
  return art;
}

/** Shows sheet frame `k` (or its ready fallback), mirrored when `flip`. */
export function setUnitFrame(s: UnitSprites, k: number, flip: boolean): void {
  const art = ensureUnitArt(s);
  if (!art) return;
  const f = readyFrame(art, k);
  if (String(s.body.frame.name) !== String(f)) {
    // Each animation has its own frame box: keep the feet on the origin.
    const oy = art.originY[f] ?? 0.8;
    s.body.setFrame(f).setOrigin(0.5, oy);
    s.team.setFrame(f).setOrigin(0.5, oy);
  }
  s.body.setFlipX(flip);
  s.team.setFlipX(flip);
}

/** Copies placement and visibility from the body onto the team overlay. */
export function syncTeamSprite(s: UnitSprites): void {
  const { body, team } = s;
  team.setPosition(body.x, body.y);
  team.setDepth(body.depth + 0.0001);
  team.setVisible(body.visible);
  team.setAlpha(body.alpha);
}
