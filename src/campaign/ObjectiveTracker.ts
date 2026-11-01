import { objectiveProgress, type Objective, type ObjectiveContext, type ObjectiveProgress } from './objectives';

/** One objective's state for the HUD. */
export interface ObjectiveState {
  readonly index: number;
  readonly objective: Objective;
  readonly done: boolean;
  readonly progress: ObjectiveProgress;
}

/**
 * A mission's objectives with latching completion (M13): `update` marks
 * every newly met objective done for good; `done` (objective indices) is
 * what a save keeps. The mission is complete when every objective is done
 * and none is a winMatch (a winMatch mission ends on the regular victory).
 */
export class ObjectiveTracker {
  private readonly doneSet: Set<number>;

  constructor(
    readonly objectives: readonly Objective[],
    done: Iterable<number> = [],
  ) {
    this.doneSet = new Set([...done].filter((i) => Number.isInteger(i) && i >= 0 && i < objectives.length));
  }

  /** Marks the newly met objectives done; returns their indices. */
  update(ctx: ObjectiveContext): number[] {
    return this.tick(ctx).fresh;
  }

  /** update and states in one pass over the objectives (each judged once). */
  tick(ctx: ObjectiveContext): { fresh: number[]; states: ObjectiveState[] } {
    const fresh: number[] = [];
    const states = this.objectives.map((objective, index) => {
      const progress = objectiveProgress(objective, ctx);
      if (!this.doneSet.has(index) && objective.kind !== 'winMatch' && progress.have >= progress.need) {
        this.doneSet.add(index);
        fresh.push(index);
      }
      const done = this.doneSet.has(index);
      return { index, objective, done, progress: done ? { have: progress.need, need: progress.need } : progress };
    });
    return { fresh, states };
  }

  /** Every objective with its state (done ones show as complete whatever the world now holds). */
  states(ctx: ObjectiveContext): ObjectiveState[] {
    return this.objectives.map((objective, index) => {
      const done = this.doneSet.has(index);
      const progress = objectiveProgress(objective, ctx);
      return { index, objective, done, progress: done ? { have: progress.need, need: progress.need } : progress };
    });
  }

  /** Indices of the objectives done so far, ascending (saved). */
  get done(): number[] {
    return [...this.doneSet].sort((a, b) => a - b);
  }

  complete(): boolean {
    return this.objectives.length > 0 && this.objectives.every((o, i) => o.kind !== 'winMatch' && this.doneSet.has(i));
  }
}
