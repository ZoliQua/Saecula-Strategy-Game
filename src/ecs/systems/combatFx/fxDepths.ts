/** Draw depths of combat effects (Phaser-free, so pure modules and tests can use them). */

/** Depth band for combat effects drawn on the ground (under shadows, over terrain). */
export const GROUND_FX_DEPTH = -995;
/** Shot shadows: just over the cast shadows. */
export const SHOT_SHADOW_DEPTH = -988;
/** Tile-depth offset of effects standing on a tile (units sit at +0.3). */
export const STANDING_FX_DEPTH = 0.6;
