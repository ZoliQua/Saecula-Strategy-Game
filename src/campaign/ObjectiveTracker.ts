import { objectiveNeed, objectiveProgress, progressMeets, type Objective, type ObjectiveContext, type ObjectiveProgress } from './objectives';

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

  /**
   * One pass: judges each objective not yet done (a done one is not
   * judged again, so no world scan for it), marks the newly met ones, and
   * returns them with every objective's state for the HUD.
   */
  tick(ctx: ObjectiveContext): { fresh: number[]; states: ObjectiveState[] } {
    const fresh: number[] = [];
    const states = this.objectives.map((objective, index) => {
      if (this.doneSet.has(index)) return this.doneState(objective, index);
      const progress = objectiveProgress(objective, ctx);
      if (!progressMeets(objective, progress)) return { index, objective, done: false, progress };
      this.doneSet.add(index);
      fresh.push(index);
      return this.doneState(objective, index);
    });
    return { fresh, states };
  }

  /** Every objective with its state, without marking anything (done ones show as complete). */
  states(ctx: ObjectiveContext): ObjectiveState[] {
    return this.objectives.map((objective, index) =>
      this.doneSet.has(index) ? this.doneState(objective, index) : { index, objective, done: false, progress: objectiveProgress(objective, ctx) },
    );
  }

  private doneState(objective: Objective, index: number): ObjectiveState {
    const need = objectiveNeed(objective);
    return { index, objective, done: true, progress: { have: need, need } };
  }

  /** Indices of the objectives done so far, ascending (saved). */
  get done(): number[] {
    return [...this.doneSet].sort((a, b) => a - b);
  }

  complete(): boolean {
    return this.objectives.length > 0 && this.objectives.every((o, i) => o.kind !== 'winMatch' && this.doneSet.has(i));
  }
}
