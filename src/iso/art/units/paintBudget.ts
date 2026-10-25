/** Outcome of one lazy-painting step on one item. */
export interface StepResult {
  /** Any progress, including a partially rasterized frame. */
  readonly worked: boolean;
}

/**
 * Spends ONE per-frame budget across pending items: a single deadline
 * is fixed up front, each item gets only what is left of it, and the
 * pass stops after the first item that made any progress (so one game
 * frame never pays N budgets for N pending unit types). Returns the
 * item that worked, if any.
 */
export function spendPaintBudget<T>(
  items: Iterable<T>,
  budgetMs: number,
  step: (item: T, remainingMs: number) => StepResult,
  now: () => number = () => performance.now(),
): T | null {
  const deadline = now() + budgetMs;
  for (const item of items) {
    const remaining = deadline - now();
    if (remaining <= 0) return null;
    if (step(item, remaining).worked) return item;
  }
  return null;
}
