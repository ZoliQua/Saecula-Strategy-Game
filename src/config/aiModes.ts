/* The AI in the M19 modes: Regicide (ai/KingPlay.ts) and King of the Hill (ai/HillPlay.ts). */

/** How an AI minds its king. Distances in tiles; "clear" of a threat = the distance beyond its range. */
export interface KingTuning {
  /** The king stays this close to its town centre's footprint. */
  readonly homeRadius: number;
  /** It steps away once a seen threat leaves it this little clear, or less. */
  readonly alarm: number;
  /** No refuge is better than this much clear. */
  readonly safe: number;
  /** It moves only for a tile this much clearer than where it stands (or heads): no jitter between two tiles. */
  readonly margin: number;
  /** A seen villager is a threat only this close. */
  readonly villagerRadius: number;
  /** A refuge has at least this many steps out: never a dead end. */
  readonly minExits: number;
  /** A refuge is at most this far from the town centre's footprint or from one of the king's defenders. */
  readonly rallyRadius: number;
  /** Seen enemy units this close to the king (any armed one, scouts too) are fought by the home army. */
  readonly guardRadius: number;
  /** Villagers sent per attacker not matched by an own soldier near the king. */
  readonly guardsPerFoe: number;
  /** At most this many villagers defend the king at once. */
  readonly maxGuards: number;
  /** A king the pathfinder could not bring home is ordered home again no sooner than this (ms). */
  readonly homeRetryMs: number;
}

/** When an AI sends units to the hill beyond its usual waves. */
export interface HillTuning {
  /** An enemy clock past AI_HILL.urgentShare sends whatever is free from this size, at once. */
  readonly urgentArmy: number;
  /** A wave that is out gets this many fresh units as they gather, unless the base is under attack. */
  readonly reinforce: number;
}

/**
 * Medium's, Hard's and Mesteri's king. A swordsman is noticed 5 tiles off and left 8 behind (a
 * villager's town centre sees 4, the king 6); a margin of 2 makes a step back impossible while the
 * threats stand still.
 */
export const AI_KING: KingTuning = { homeRadius: 7, alarm: 4, safe: 7, margin: 2, villagerRadius: 2, minExits: 3, rallyRadius: 2, guardRadius: 8, guardsPerFoe: 2, maxGuards: 6, homeRetryMs: 5000 };

/** How every AI holds a hill. Distances in tiles from the zone's centre unless said otherwise. */
export const AI_HILL = {
  /** An urgent launch: an enemy team's clock past this share of HILL.holdMs. */
  urgentShare: 0.5,
  /** Enemies this close are fought (a longer weapon: from where it reaches into the zone). */
  guard: 6,
  /** A target is let go only this much further out, so nothing flaps at the edge and nobody is led away. */
  slack: 3,
  /** A wave spreads over this many tiles of the zone. */
  spots: 8,
  /** An idle unit off the zone tries again, and one on a contested zone looks round, this often (ms). */
  retryMs: 2000,
} as const;
