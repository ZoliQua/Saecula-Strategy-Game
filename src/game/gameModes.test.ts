import { describe, expect, it } from 'vitest';
import { HILL, WONDER_HOLD_MS } from '../config/balance';
import { hu } from '../i18n/hu';
import { generateMap, MAP_TEMPLATES, type MapTemplate } from '../map/generator';
import { isSea } from '../map/TerrainTypes';
import {
  defaultSetupConfig,
  hasHill,
  hasRegicide,
  hasTimeVictory,
  hasWonderVictory,
  HILL_TEMPLATES,
  REGICIDE_TEMPLATES,
  VICTORY_MODES,
  victoryAllowed,
  withSetup,
  wonderHoldFor,
} from './GameSetupConfig';
import { VICTORY_CAUSES } from './VictoryChecker';

describe('game modes (M19)', () => {
  it('two new modes follow the old ones, and each predicate is true for its mode only', () => {
    expect(VICTORY_MODES.slice(-2)).toEqual(['regicide', 'hill']);
    expect(VICTORY_MODES.filter(hasRegicide)).toEqual(['regicide']);
    expect(VICTORY_MODES.filter(hasHill)).toEqual(['hill']);
  });

  it('neither new mode has the Wonder or the time victory', () => {
    for (const mode of ['regicide', 'hill'] as const) {
      expect(hasWonderVictory(mode), mode).toBe(false);
      expect(hasTimeVictory(mode), mode).toBe(false);
    }
  });

  it('the Wonder hold follows the mode (the game, its HUD and the checker share it)', () => {
    for (const mode of VICTORY_MODES) expect(wonderHoldFor(mode), mode).toBe(hasWonderVictory(mode) ? WONDER_HOLD_MS : null);
  });

  it('two new causes follow the old ones', () => {
    expect(VICTORY_CAUSES).toEqual(['conquest', 'wonder', 'time', 'mission', 'regicide', 'hill']);
  });

  it('the hill is a 7×7 zone with at least 33 passable tiles, held 8 minutes', () => {
    expect(HILL).toEqual({ size: 7, minPassable: 33, holdMs: 480_000 });
  });

  it('the hill is on meadow, wilderness and fortress; Regicide on every template without sea', () => {
    expect(HILL_TEMPLATES).toEqual(['meadow', 'wilderness', 'fortress']);
    expect(REGICIDE_TEMPLATES).toEqual(['meadow', 'wilderness', 'islands', 'fortress']);
    for (const template of MAP_TEMPLATES) {
      for (const mode of VICTORY_MODES) {
        const allowed =
          mode === 'hill'
            ? ['meadow', 'wilderness', 'fortress'].includes(template)
            : mode === 'regicide'
              ? ['meadow', 'wilderness', 'islands', 'fortress'].includes(template)
              : true;
        expect(victoryAllowed(mode, template), `${mode} on ${template}`).toBe(allowed);
      }
    }
  });

  it('the Regicide templates never have sea, the others always may (texture budget, 2026-11-23)', () => {
    const seaOn = (template: MapTemplate, size: number, players: number, seed: number) => {
      const { map } = generateMap({ template, width: size, height: size, playerCount: players, seed });
      for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) if (isSea(map.getTile(tx, ty))) return true;
      return false;
    };
    for (const template of MAP_TEMPLATES) {
      const runs = ([[64, 2], [96, 4], [128, 6]] as const).flatMap(([size, players]) => [1, 2, 3].map((seed) => seaOn(template, size, players, seed)));
      expect(runs.some(Boolean), template).toBe(!REGICIDE_TEMPLATES.includes(template));
      if (REGICIDE_TEMPLATES.includes(template)) expect(runs.every((sea) => !sea), template).toBe(true);
    }
  });

  it('withSetup keeps every allowed mode and resets a disallowed one to the default', () => {
    for (const template of MAP_TEMPLATES) {
      for (const victory of VICTORY_MODES) {
        const expected = victoryAllowed(victory, template) ? victory : 'conquest_wonder';
        expect(withSetup(defaultSetupConfig(1), { template, victory }).victory, `${victory} on ${template}`).toBe(expected);
      }
    }
  });

  it('a template change resets the hill, and changing back does not bring it back', () => {
    const hill = withSetup(defaultSetupConfig(1), { template: 'fortress', victory: 'hill' });
    expect(withSetup(hill, { template: 'wilderness' }).victory).toBe('hill');
    const islands = withSetup(hill, { template: 'islands' });
    expect(islands.victory).toBe('conquest_wonder');
    expect(withSetup(islands, { template: 'meadow' }).victory).toBe('conquest_wonder');
  });

  it('an unknown template becomes meadow, where the hill is allowed', () => {
    const bad = { template: 'volcano', victory: 'hill' } as unknown as Parameters<typeof withSetup>[1];
    expect(withSetup(defaultSetupConfig(1), bad)).toMatchObject({ template: 'meadow', victory: 'hill' });
  });

  it('the modes and their causes have Hungarian labels, the hill text with the minutes from the balance', () => {
    expect(hu.setup.victories.regicide).toBe('Királygyilkos');
    expect(hu.setup.victories.hill).toBe('A domb ura');
    expect(hu.gameOver.causes.regicide).toBe('Királygyilkos');
    expect(hu.gameOver.causes.hill).toBe('A domb ura');
    for (const texts of [hu.gameOver.bodies.hill, hu.gameOver.teamBodies.hill]) {
      expect(texts.victory).toContain(`${HILL.holdMs / 60_000} percig`);
      expect(texts.defeat).toContain(`${HILL.holdMs / 60_000} percig`);
    }
  });
});
