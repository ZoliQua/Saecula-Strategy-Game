/** Where an option of a segmented control stands when the options wrap. */
export interface SegPlace {
  readonly row: number;
  readonly rows: number;
  /** Its place in its row, and how many share that row. */
  readonly col: number;
  readonly inRow: number;
  /** Grid columns it spans, of `cells` in all: every row fills the width. */
  readonly span: number;
  readonly cells: number;
}

/** Option `index` of `count` with at most `perRow` in a row; a shorter last row stretches. */
export function segPlace(index: number, count: number, perRow: number): SegPlace {
  const rows = Math.ceil(count / perRow);
  const row = Math.floor(index / perRow);
  const last = count - (rows - 1) * perRow;
  const inRow = row === rows - 1 ? last : perRow;
  const cells = rows === 1 ? count : perRow * last;
  return { row, rows, col: index - row * perRow, inRow, span: cells / inRow, cells };
}
