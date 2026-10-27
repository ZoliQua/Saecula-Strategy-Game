import type { Material } from '../materials';

/**
 * English unit palette (M4 design decision 5): undyed wool, madder-red
 * hose, yew bows, St George's cross (white field, red cross) on
 * surcoats and shields. The cross colours are the registry heraldry
 * (config/civs.ts english: primary white, secondary red).
 */
const ST_GEORGE_WHITE = 0xf2efe6;
const ST_GEORGE_RED = 0xc8202e;

export const ENGLISH_M = {
  wool: { color: 0xcbbd9c } as Material,
  greyWool: { color: 0x8a8174 } as Material,
  madder: { color: 0x9a3328 } as Material,
  yew: { color: 0xb4783e } as Material,
  bearskin: { color: 0x221b17 } as Material,
  /** Team cloth with a white chest panel bearing the red cross; sides, back and skirt stay team-coloured. */
  surcoat: {
    color: 0xffffff,
    team: true,
    charge: { field: ST_GEORGE_WHITE, cross: ST_GEORGE_RED, front: 0.3, panel: 0.4, bar: 0.11, armAt: 0.72, arm: 0.055 },
  } as Material,
  /** Heater shield: white field and red cross inside a team rim. */
  stGeorgeShield: {
    color: 0xffffff,
    team: true,
    charge: { field: ST_GEORGE_WHITE, cross: ST_GEORGE_RED, front: 0.62, panel: 1, bar: 0.17, armAt: 0.62, arm: 0.085 },
  } as Material,
  /** Cast-iron gun barrel (the Hungarian gun is bronze). */
  ironBarrel: { color: 0x4a4d52, metal: 0.55, bands: { count: 4, color: 0x2e3034, width: 0.08 } } as Material,
  chestnut: { color: 0x8c4a24 } as Material,
} as const;
