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
 *
 * A sequential tracker (M18 tutorial) judges objective i only once 0..i−1
 * are done: a later objective met early waits for its turn and is then
 * marked done in the same tick its predecessor completes.
 */
export class ObjectiveTracker {
  private readonly doneSet: Set<number>;

  constructor(
    readonly objectives: readonly Objective[],
    done: Iterable<number> = [],
    readonly sequential = false,
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
    let blocked = false;
    const states = this.objectives.map((objective, index) => {
      if (this.doneSet.has(index)) return this.doneState(objective, index);
      if (blocked) return this.waitingState(objective, index);
      if (this.sequential) blocked = true;
      const progress = objectiveProgress(objective, ctx);
      if (!progressMeets(objective, progress)) return { index, objective, done: false, progress };
      this.doneSet.add(index);
      fresh.push(index);
      blocked = false;
      return this.doneState(objective, index);
    });
    return { fresh, states };
  }

  /** Every objective with its state, without marking anything (done ones show as complete). */
  states(ctx: ObjectiveContext): ObjectiveState[] {
    const current = this.current();
    return this.objectives.map((objective, index) => {
      if (this.doneSet.has(index)) return this.doneState(objective, index);
      if (current !== null && index > current) return this.waitingState(objective, index);
      return { index, objective, done: false, progress: objectiveProgress(objective, ctx) };
    });
  }

  /** A sequential tracker's current objective (the first not done), or null (all done, or not sequential). */
  current(): number | null {
    if (!this.sequential) return null;
    const i = this.objectives.findIndex((_, index) => !this.doneSet.has(index));
    return i < 0 ? null : i;
  }

  /** A sequential objective whose turn has not come: not judged, shown at zero. */
  private waitingState(objective: Objective, index: number): ObjectiveState {
    return { index, objective, done: false, progress: { have: 0, need: objectiveNeed(objective) } };
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
