import { describe, expect, it } from 'vitest';
import { defaultSetupConfig, HILL_TEMPLATES, SPEED_CHOICES, TREATY_MINUTES, VICTORY_MODES, withSetup } from '../../game/GameSetupConfig';
import { MAP_TEMPLATES } from '../../map/generator';
import { alliesItems, parseChoice, speedItems, startResourceItems, treatyItems, victoryItems, victoryRowView, victoryWasReset } from './modeItems';
import { nextEnabled } from './radioNav';
import { segPlace } from './segLayout';

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

describe('victory row (M19)', () => {
  it('offers every mode, with six labels', () => {
    expect(victoryItems().map((i) => i.value)).toEqual(VICTORY_MODES);
    expect(victoryItems().map((i) => i.label).slice(-2)).toEqual(['Királygyilkos', 'A domb ura']);
  });

  it('disables the hill on the templates without one and says why', () => {
    for (const template of MAP_TEMPLATES) {
      const view = victoryRowView(template, false);
      if (HILL_TEMPLATES.includes(template)) {
        expect(view, template).toEqual({ disabled: [], hint: '', warn: false });
      } else {
        expect(view.disabled, template).toEqual(['hill']);
        expect(view.warn, template).toBe(false);
        expect(view.hint, template).toBe('A domb ura csak Mezőség, Vadon és Erődítmény térképen játszható.');
      }
    }
  });

  it('a reset is named with the mode it went back to', () => {
    const view = victoryRowView('islands', true);
    expect(view.warn).toBe(true);
    expect(view.hint).toContain('A domb ura');
    expect(view.hint).toContain('visszaállt: Hódítás vagy Csoda');
  });

  it('a template switch that drops the hill is noticed until a mode is picked or a hill map is back', () => {
    const hill = withSetup(defaultSetupConfig(1), { victory: 'hill' });
    const islands = withSetup(hill, { template: 'islands' });
    expect(islands.victory).toBe('conquest_wonder');
    expect(victoryWasReset(false, hill, { template: 'islands' }, islands)).toBe(true);
    const random = withSetup(islands, { template: 'random' });
    expect(victoryWasReset(true, islands, { template: 'random' }, random)).toBe(true);
    expect(victoryWasReset(true, islands, { seed: 9 }, withSetup(islands, { seed: 9 }))).toBe(true);
    expect(victoryWasReset(true, islands, { victory: 'all' }, withSetup(islands, { victory: 'all' }))).toBe(false);
    expect(victoryWasReset(true, islands, { template: 'meadow' }, withSetup(islands, { template: 'meadow' }))).toBe(false);
  });

  it('no notice when nothing was lost', () => {
    const base = defaultSetupConfig(1);
    expect(victoryWasReset(false, base, { template: 'islands' }, withSetup(base, { template: 'islands' }))).toBe(false);
    const hill = withSetup(base, { victory: 'hill' });
    expect(victoryWasReset(false, hill, { template: 'fortress' }, withSetup(hill, { template: 'fortress' }))).toBe(false);
  });

  it('the arrow keys skip the disabled hill both ways', () => {
    const enabled = VICTORY_MODES.map((m) => !victoryRowView('islands', false).disabled.includes(m));
    expect(nextEnabled(enabled, VICTORY_MODES.indexOf('regicide'), 1)).toBe(0);
    expect(nextEnabled(enabled, 0, -1)).toBe(VICTORY_MODES.indexOf('regicide'));
  });
});

describe('segmented rows (M19)', () => {
  it('six options wrap into four and two, each row filling the width', () => {
    const places = [0, 1, 2, 3, 4, 5].map((i) => segPlace(i, 6, 4));
    expect(places.map((p) => [p.row, p.col, p.inRow])).toEqual([[0, 0, 4], [0, 1, 4], [0, 2, 4], [0, 3, 4], [1, 0, 2], [1, 1, 2]]);
    for (const p of places) {
      expect(p.span * p.inRow).toBe(p.cells);
      expect(p.rows).toBe(2);
    }
  });

  it('options that fit one row keep one equal column each', () => {
    expect(segPlace(2, 4, 4)).toEqual({ row: 0, rows: 1, col: 2, inRow: 4, span: 1, cells: 4 });
  });
});
