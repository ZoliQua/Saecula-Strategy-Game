import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSetupConfig, HILL_TEMPLATES, SPEED_CHOICES, TREATY_MINUTES, VICTORY_MODES, withSetup, type VictoryMode } from '../../game/GameSetupConfig';
import { MAP_TEMPLATES } from '../../map/generator';
import { alliesItems, parseChoice, speedItems, startResourceItems, treatyItems, victoryItems, victoryRowView, victoryWasReset } from './modeItems';
import { installDomStub } from '../testing/domStub.testkit';
import { Segmented } from './Segmented';
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

  describe('Segmented.setEnabled', () => {
    afterEach(() => void vi.unstubAllGlobals());

    function victorySeg() {
      const dom = installDomStub();
      const picked: string[] = [];
      const seg: Segmented<VictoryMode> = new Segmented('victory', 'Victory', victoryItems(), 'regicide', (mode) => {
        picked.push(mode);
        seg.set(mode);
      });
      const buttons = dom.node(seg.root).all().filter((n) => n.tag === 'button');
      const at = (mode: VictoryMode) => buttons[VICTORY_MODES.indexOf(mode)]!;
      const press = (from: VictoryMode, key: string) => at(from).fire('keydown', { key });
      for (const mode of victoryRowView('islands', false).disabled) seg.setEnabled(mode, false, 'why');
      return { dom, seg, at, press, picked };
    }

    it('the arrow keys skip the disabled hill both ways', () => {
      const { dom, at, press, picked } = victorySeg();
      const first = VICTORY_MODES[0]!;
      expect(at('hill').disabled).toBe(true);
      expect(press('regicide', 'ArrowRight')).toBe(true);
      expect([picked.at(-1), dom.active]).toEqual([first, at(first)]);
      expect(at(first).getAttribute('aria-checked')).toBe('true');
      expect(press(first, 'ArrowLeft')).toBe(true);
      expect([picked.at(-1), dom.active]).toEqual(['regicide', at('regicide')]);
      expect(press('regicide', 'Enter')).toBe(false);
    });

    it('switched on again, the arrow keys reach it and it needs no reason', () => {
      const { dom, seg, at, press, picked } = victorySeg();
      expect(at('hill').getAttribute('aria-describedby')).toBe('why');
      seg.setEnabled('hill', true, 'why');
      expect(at('hill').disabled).toBe(false);
      expect(at('hill').getAttribute('aria-describedby')).toBeNull();
      press('regicide', 'ArrowDown');
      expect([picked.at(-1), dom.active]).toEqual(['hill', at('hill')]);
    });
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
