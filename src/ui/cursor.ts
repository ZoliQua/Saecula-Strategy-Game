import type { ResourceType } from '../types';

/** The canvas cursor: what a command on the hovered tile would do. */
export type CursorKind = 'default' | 'move' | 'gatherWood' | 'gatherGold' | 'gatherFood' | 'build' | 'attack' | 'convert' | 'forbidden';
export const CURSOR_KINDS: readonly CursorKind[] = ['default', 'move', 'gatherWood', 'gatherGold', 'gatherFood', 'build', 'attack', 'convert', 'forbidden'];

/** One selected own unit, by what it can do with a target. */
export interface CursorUnit {
  readonly attacks: boolean;
  /** It may work the hovered resource (a villager on land, a fishing boat on a fish school, M14). */
  readonly gathers: boolean;
  /** It builds (villagers); absent: same as `gathers` (older callers). */
  readonly builds?: boolean;
  /** A monk that may convert now (not recharging, M11). */
  readonly converts?: boolean;
}

export interface CursorContext {
  /** A building is being placed. */
  readonly placing: boolean;
  /** The selected own units (selected buildings never change the cursor). */
  readonly units: readonly CursorUnit[];
  /** The hovered tile's target under OrderIssuer's rule (resolveOrderTarget). */
  readonly target: { readonly kind: 'enemy' | 'ownSite' | 'resource' | 'none'; readonly resource?: ResourceType; readonly convertible?: boolean };
  /** Whether the hovered tile is passable; null when the pointer is off the map. */
  readonly passable: boolean | null;
}

const GATHER: Readonly<Record<ResourceType, CursorKind>> = { wood: 'gatherWood', gold: 'gatherGold', food: 'gatherFood' };

/**
 * The cursor for a command on the hovered tile, matching what
 * OrderIssuer would order: an enemy → attack if any selected unit
 * attacks, else convert if a ready monk is selected and the enemy is a
 * convertible unit (M11); an own unfinished building → build if a villager is
 * selected; a resource node → that resource's gather kind for
 * villagers. Otherwise the units would just move there: forbidden on
 * an impassable tile, else move. No own unit, placement mode or off the
 * map: the default cursor.
 */
export function cursorFor(ctx: CursorContext): CursorKind {
  if (ctx.placing || ctx.units.length === 0 || ctx.passable === null) return 'default';
  const gatherers = ctx.units.some((u) => u.gathers);
  const builders = ctx.units.some((u) => u.builds ?? u.gathers);
  const { kind, resource } = ctx.target;
  if (kind === 'enemy' && ctx.units.some((u) => u.attacks)) return 'attack';
  if (kind === 'enemy' && ctx.target.convertible && ctx.units.some((u) => u.converts)) return 'convert';
  if (kind === 'ownSite' && builders) return 'build';
  if (kind === 'resource' && gatherers && resource) return GATHER[resource];
  return ctx.passable ? 'move' : 'forbidden';
}
