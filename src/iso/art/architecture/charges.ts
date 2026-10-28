import type { Ctx } from '../canvas';
import { ENGLISH_CHARGES } from './english/englishCharge';
import { FRENCH_CHARGES } from './french/frenchCharge';
import { GERMAN_CHARGES } from './german/germanCharge';
import { ITALIAN_CHARGES } from './italian/italianCharge';
import { SPANISH_CHARGES } from './spanish/spanishCharge';

/*
 * Heraldic charges by id (facade.ts crest): what a style's crests and
 * shields bear (ArchStyle.charge). A civ adds its charge with one spread
 * from architecture/<civ>/<civ>Charge.ts; facade.ts only looks ids up.
 */

/** Paints a charge on a crest of size `s` centred at (x, y). */
export type ChargePainter = (ctx: Ctx, x: number, y: number, s: number) => void;

/** The base (Hungarian) charge: the double cross (kettőskereszt) in white. */
export const BASE_CHARGES = {
  double_cross: (ctx, x, y, s) => {
    ctx.fillStyle = 'rgba(250,244,230,.92)';
    ctx.fillRect(x - s * 0.1, y - s * 0.8, s * 0.2, s * 1.5);
    ctx.fillRect(x - s * 0.42, y - s * 0.5, s * 0.84, s * 0.16);
    ctx.fillRect(x - s * 0.3, y - s * 0.15, s * 0.6, s * 0.16);
  },
} satisfies Record<string, ChargePainter>;

export const CHARGES = { ...BASE_CHARGES, ...ENGLISH_CHARGES, ...GERMAN_CHARGES, ...FRENCH_CHARGES, ...SPANISH_CHARGES, ...ITALIAN_CHARGES } satisfies Record<string, ChargePainter>;

/** Heraldic charge on crests and shields. */
export type CrestCharge = keyof typeof CHARGES;
