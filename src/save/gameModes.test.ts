import { beforeAll, describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../ai/testing/headlessMatch';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { CargoUnit, Entity } from '../ecs/components';
import { MAP_TEMPLATES } from '../map/generator';
import type { VictoryMode } from '../game/GameSetupConfig';
import { prepareMatch } from '../scenes/game/MatchStart';
import { parseSave } from './parse';
import { FIXED_DATE, STEP_MS, savableMatch } from './savedMatch.testkit';
import type { SaveData } from './schema';

const HILL_STATE: NonNullable<Entity['hill']> = { heldMs: { 1: 1250, 2: 0 }, holderTeam: 1, contested: false };

/** A save with a king ashore, a king aboard a transport and a hill. */
function savedModeMatch() {
  const match = savableMatch({ victory: 'hill' });
  // One second of play first: the AIs' fogs exist from their first tick.
  match.run(1_000, STEP_MS);
  const king = createUnit(match.world, { type: 'king', tile: { tx: 4, ty: 2 }, playerId: 1 });
  const passenger = createUnit(match.world, { type: 'king', tile: { tx: 5, ty: 2 }, playerId: 2 });
  const ship = createUnit(match.world, { type: 'transport', tile: { tx: 6, ty: 2 }, playerId: 2 });
  match.world.remove(passenger);
  match.world.addComponent(ship, 'cargo', { units: [passenger as CargoUnit] });
  const hill = match.world.entities.find((e) => e.hill)!;
  hill.position = { tx: 32, ty: 32 };
  hill.hill = structuredClone(HILL_STATE);
  return { save: match.snapshot(FIXED_DATE), king, ship, hill };
}

describe('save round trip with a king and a hill (M19)', () => {
  it('both survive a save and load, a king in the cargo too, and play on', () => {
    const { save, king, ship, hill } = savedModeMatch();
    const parsed = parseSave(JSON.stringify(save));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.save).toEqual(save);
    const match = resumeHeadlessMatch(parsed.save);
    const byId = (id: number | undefined) => match.world.entities.find((e) => e.id === id)!;
    expect(byId(king.id).unit).toEqual({ unitType: 'king' });
    expect(byId(king.id).populationCost).toEqual({ amount: 0 });
    expect(byId(ship.id).cargo?.units.map((u) => u.unit?.unitType)).toEqual(['king']);
    expect(byId(hill.id).hill).toEqual(HILL_STATE);
    expect(byId(hill.id).hill?.heldMs[1]).toBe(1250);
    expect(byId(hill.id).position).toEqual({ tx: 32, ty: 32 });
    expect(byId(hill.id).owner).toBeUndefined();
    expect(match.snapshot(FIXED_DATE)).toEqual(save);
    match.run(5_000, STEP_MS);
    expect(parseSave(JSON.stringify(match.snapshot(FIXED_DATE))).ok).toBe(true);
  });

  it.each([
    ['an empty, contested hill', { heldMs: {}, holderTeam: null, contested: true }, true],
    ['a negative clock', { ...HILL_STATE, heldMs: { 1: -1 } }, false],
    ['a clock of no team', { ...HILL_STATE, heldMs: { red: 5 } }, false],
    ['a fractional holder', { ...HILL_STATE, holderTeam: 1.5 }, false],
    ['no holder field', { heldMs: {}, contested: false }, false],
    ['no contested field', { heldMs: {}, holderTeam: null }, false],
    ['an unknown field', { ...HILL_STATE, radius: 3 }, false],
  ])('%s: valid = %s', (_, state, ok) => {
    const { save, hill } = savedModeMatch();
    const entities = save.entities.map((e) => (e.id === hill.id ? { ...e, components: { ...e.components, hill: state } } : e));
    expect(parseSave(JSON.stringify({ ...save, entities })).ok).toBe(ok);
  });
});

describe('what a saved hill may be (M19)', () => {
  let saved: { save: SaveData; id: number; ship: number };
  beforeAll(() => {
    const { save, hill, ship } = savedModeMatch();
    saved = { save, id: hill.id!, ship: ship.id! };
  });

  type Change = (save: SaveData, hill: SaveData['entities'][number]) => void;
  const cases: Array<[string, Change, boolean]> = [
    ['as it was saved', () => {}, true],
    ['a clock of every player without allies', (_, h) => (h.components.hill!.heldMs = { 1: 1, 2: 2, 3: 3 }), true],
    ['the clock of no such team', (_, h) => (h.components.hill!.heldMs = { 4: 5 }), false],
    ['the holder no such team', (_, h) => (h.components.hill!.holderTeam = 4), false],
    ["both teams' clocks with an ally", (s) => (s.setup = { ...s.setup, allies: 1 }), true],
    ['a team only a match without allies has', (s, h) => {
      s.setup = { ...s.setup, allies: 1 };
      h.components.hill!.heldMs = { 3: 5 };
    }, false],
    ['a holder only a match without allies has', (s, h) => {
      s.setup = { ...s.setup, allies: 1 };
      h.components.hill!.holderTeam = 3;
    }, false],
    ['contested without a holder', (_, h) => Object.assign(h.components.hill!, { holderTeam: null, contested: true }), true],
    ['a holder while contested', (_, h) => (h.components.hill!.contested = true), false],
    ['no position', (_, h) => delete h.components.position, false],
    ['an owner', (_, h) => (h.components.owner = { playerId: 1 }), false],
    ['two hills', (s, h) => {
      s.entities.push({ id: s.nextEntityId, components: structuredClone(h.components) });
      s.nextEntityId++;
    }, false],
    ['a second hill in a cargo', (s, h) => {
      s.entities.find((e) => e.id === saved.ship)!.components.cargo!.units.push(structuredClone(h.components));
    }, false],
    ['the hill mode without a hill', (s, h) => (s.entities = s.entities.filter((e) => e !== h)), false],
    ...(['conquest', 'conquest_wonder', 'conquest_time', 'all', 'regicide'] as const).flatMap((victory): Array<[string, Change, boolean]> => [
      [`${victory} with a hill`, (s) => (s.setup = { ...s.setup, victory }), false],
      [`${victory} without a hill`, (s, h) => {
        s.setup = { ...s.setup, victory };
        s.entities = s.entities.filter((e) => e !== h);
      }, true],
    ]),
  ];

  it.each(cases)('%s', (_, change, ok) => {
    const copy = structuredClone(saved.save);
    change(copy, copy.entities.find((e) => e.id === saved.id)!);
    expect(parseSave(JSON.stringify(copy)).ok).toBe(ok);
  });
});

describe('the mode of a loaded save (M19)', () => {
  let save: SaveData;
  beforeAll(() => {
    const match = savableMatch();
    match.run(1_000, STEP_MS);
    save = match.snapshot(FIXED_DATE);
  });

  // Also the hill on a template withSetup would refuse: its reset is for setup input only.
  const cases = MAP_TEMPLATES.flatMap((template) => (['regicide', 'hill'] as const).map((victory): [VictoryMode, typeof template] => [victory, template]));
  it.each(cases)('%s on %s is neither rejected nor reset', (victory, template) => {
    const raw = { ...save, setup: { ...save.setup, victory, template }, meta: { ...save.meta, template } };
    if (victory === 'hill') {
      // A hill save has exactly one hill.
      const components = { position: { tx: 32, ty: 32 }, hill: { heldMs: {}, holderTeam: null, contested: false } };
      raw.entities = [...save.entities, { id: save.nextEntityId, components }];
      raw.nextEntityId = save.nextEntityId + 1;
    }
    const parsed = parseSave(JSON.stringify(raw));
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.save.setup.victory).toBe(victory);
    expect(resumeHeadlessMatch(parsed.save).setup.victory).toBe(victory);
    const prepared = prepareMatch({ load: parsed.save });
    if (!prepared.ok) throw new Error('the save did not restore');
    expect(prepared.match.setup.victory).toBe(victory);
  });
});
