import type { Entity } from '../ecs/components';
import type { AgeId, BuildingType, UnitType } from '../types';

/**
 * A mission objective (M13). Objectives latch: once met they stay met
 * (ObjectiveTracker), so a monk that later dies does not undo "train 2 monks".
 *  - reachAge: the human is in `age` or later;
 *  - ownBuildings: the human owns `count` finished buildings of `building`;
 *  - ownUnits: the human owns `count` living units of `unit`;
 *  - survive: the match clock reaches `ms` with the human still standing;
 *  - winMatch: the match is won (conquest or Wonder); never met by the tracker,
 *    the regular victory ends such a mission.
 */
export type Objective =
  | { readonly kind: 'reachAge'; readonly age: AgeId }
  | { readonly kind: 'ownBuildings'; readonly building: BuildingType; readonly count: number }
  | { readonly kind: 'ownUnits'; readonly unit: UnitType; readonly count: number }
  | { readonly kind: 'survive'; readonly ms: number }
  | { readonly kind: 'winMatch' };

/** What an objective is judged on (the live game and the headless match both provide it). */
export interface ObjectiveContext {
  readonly entities: Iterable<Entity>;
  readonly humanId: number;
  readonly humanAge: AgeId;
  readonly humanDefeated: boolean;
  readonly timeMs: number;
}

/** How far an objective is: `have` of `need` (a survive objective counts whole minutes). */
export interface ObjectiveProgress {
  readonly have: number;
  readonly need: number;
}

const MIN = 60_000;

/** The objective's progress in `ctx` (met when have ≥ need; winMatch is never met here). */
export function objectiveProgress(o: Objective, ctx: ObjectiveContext): ObjectiveProgress {
  switch (o.kind) {
    case 'reachAge':
      return { have: Math.min(ctx.humanAge, o.age), need: objectiveNeed(o) };
    case 'ownBuildings': {
      let have = 0;
      for (const e of ctx.entities) {
        if (e.building?.type === o.building && e.owner?.playerId === ctx.humanId && !e.underConstruction && !e.dying) have++;
      }
      return { have: Math.min(have, o.count), need: objectiveNeed(o) };
    }
    case 'ownUnits': {
      let have = 0;
      for (const e of ctx.entities) if (e.unit?.unitType === o.unit && e.owner?.playerId === ctx.humanId && !e.dying) have++;
      return { have: Math.min(have, o.count), need: objectiveNeed(o) };
    }
    case 'survive': {
      // Whole minutes held; full only once the clock reaches `ms` (a partial last minute does not count).
      const need = objectiveNeed(o);
      if (ctx.humanDefeated) return { have: 0, need };
      return { have: ctx.timeMs >= o.ms ? need : Math.min(need - 1, Math.floor(ctx.timeMs / MIN)), need };
    }
    case 'winMatch':
      return { have: 0, need: objectiveNeed(o) };
  }
}

/** What an objective counts up to (known from its definition, no world scan). */
export function objectiveNeed(o: Objective): number {
  switch (o.kind) {
    case 'reachAge':
      return o.age;
    case 'ownBuildings':
    case 'ownUnits':
      return o.count;
    case 'survive':
      return Math.round(o.ms / MIN);
    case 'winMatch':
      return 1;
  }
}

/** Whether `progress` meets `o` (a winMatch objective is never met by progress: the regular victory ends it). */
export function progressMeets(o: Objective, progress: ObjectiveProgress): boolean {
  return o.kind !== 'winMatch' && progress.have >= progress.need;
}
