import { describe, expect, it } from 'vitest';
import { SPEED_CHOICES, TREATY_MINUTES } from '../../game/GameSetupConfig';
import { alliesItems, parseChoice, speedItems, startResourceItems, treatyItems } from './modeItems';

describe('setup card mode rows (M16)', () => {
  it('allies offer 0..aiCount - 1', () => {
    expect(alliesItems(1).map((i) => i.value)).toEqual(['0']);
    expect(alliesItems(4).map((i) => i.label)).toEqual(['0', '1', '2', '3']);
  });

  it('treaty, starting resources and speed carry the Hungarian labels', () => {
    expect(treatyItems().map((i) => i.label)).toEqual(['Nincs', '10 perc', '20 perc']);
    expect(startResourceItems().map((i) => [i.value, i.label])).toEqual([
      ['normal', 'Normál'],
      ['high', 'Magas'],
      ['deathmatch', 'Halálmeccs'],
    ]);
    expect(speedItems().map((i) => i.label)).toEqual(['1×', '1,5×', '2×']);
  });

  it('item values parse back to the setup numbers', () => {
    expect(speedItems().map((i) => parseChoice(i.value, SPEED_CHOICES))).toEqual([1, 1.5, 2]);
    expect(treatyItems().map((i) => parseChoice(i.value, TREATY_MINUTES))).toEqual([0, 10, 20]);
    expect(parseChoice('3', SPEED_CHOICES)).toBeUndefined();
  });
});
