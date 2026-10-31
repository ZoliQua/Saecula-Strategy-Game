import { CIV_DEFS } from '../../config/civs';
import { UNIT_BALANCE } from '../../config/balance';
import { hu } from '../../i18n/hu';
import type { CivId } from '../../types';

export interface CivCaption {
  readonly desc: string;
  /** "Egyedi egység: X (a Y helyett)". */
  readonly uniqueLine: string;
  readonly bonusLine: string;
  /** All three lines, for assistive tech. */
  readonly srText: string;
}

/** The setup card's text for a civ: architecture line, unique unit and permanent bonus. */
export function civCaption(civ: CivId): CivCaption {
  const unique = CIV_DEFS[civ].uniqueUnit;
  const replaced = UNIT_BALANCE[unique].replaces;
  if (!replaced) throw new Error(`civCaption: ${unique} replaces nothing`);
  const desc = hu.setup.civDesc[civ];
  const uniqueLine = hu.setup.uniqueUnit(hu.units[unique], hu.units[replaced]);
  const bonusLine = hu.setup.civBonus[civ];
  return { desc, uniqueLine, bonusLine, srText: `${desc}. ${uniqueLine}. ${bonusLine}.` };
}
