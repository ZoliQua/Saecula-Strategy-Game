/** Radiogroup keyboard navigation (WAI-ARIA radio pattern): arrows move between enabled options and wrap. */

/** +1 for ArrowRight/ArrowDown, -1 for ArrowLeft/ArrowUp, 0 for any other key. */
export function arrowStep(key: string): 1 | -1 | 0 {
  if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
  return 0;
}

/** Index of the next enabled option from `from` in direction `dir`, wrapping; -1 if none is enabled. */
export function nextEnabled(enabled: readonly boolean[], from: number, dir: 1 | -1): number {
  const n = enabled.length;
  for (let step = 1; step <= n; step++) {
    const j = (((from + dir * step) % n) + n) % n;
    if (enabled[j]) return j;
  }
  return -1;
}
