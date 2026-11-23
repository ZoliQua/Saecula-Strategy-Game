import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../../ai/testing/headlessMatch';
import { MARKET } from '../../config/balance';
import { marketBuy } from '../../game/market';
import { playerWallet } from '../../ecs/research';
import { parseSave } from '../parse';
import { SCHEMA_VERSION } from '../schema';
import { FIXED_DATE, MIN, STEP_MS } from '../savedMatch.testkit';
import v10Save from './fixtures/v10-m16.json';
import { migrate } from './index';
import { v10ToV11 } from './v10ToV11';

/* fixtures/v10-m16.json: a real M16 (schema v10) save (the default save sim after one minute), made before the bump. */

describe('v10 → v11 migration', () => {
  it('gives every player the starting market prices and keeps everything else', () => {
    const data = { schemaVersion: 10, players: [{ id: 1, civ: 'hungarian' }, { id: 2 }], gameTimeMs: 5 };
    const start = { food: 100, wood: 100 };
    const expected = { ...data, players: [{ id: 1, civ: 'hungarian', marketPrices: start }, { id: 2, marketPrices: start }] };
    expect(v10ToV11(data)).toEqual(expected);
    expect(data.players[0]).toEqual({ id: 1, civ: 'hungarian' });
    expect(migrate(data, 11)).toEqual({ ok: true, data: { ...expected, schemaVersion: 11 } });
    expect(SCHEMA_VERSION).toBe(11);
  });

  it('leaves players that are not a list or not objects for the schema to reject', () => {
    expect(v10ToV11({ players: 'x' })).toEqual({ players: 'x' });
    expect(v10ToV11({ players: [3] })).toEqual({ players: [3] });
  });

  it('the v10 fixture migrates with starting prices, parses and plays on', () => {
    expect(v10Save.schemaVersion).toBe(10);
    expect(v10Save.players[0]).not.toHaveProperty('marketPrices');
    const parsed = parseSave(JSON.stringify(v10Save));
    if (!parsed.ok) throw new Error(`fixture did not parse: ${parsed.reason}`);
    expect(parsed.save.schemaVersion).toBe(SCHEMA_VERSION);
    for (const p of parsed.save.players) expect(p.marketPrices).toEqual(MARKET.startPrice);
    const match = resumeHeadlessMatch(parsed.save);
    match.run(MIN, STEP_MS);
    const again = match.snapshot(FIXED_DATE);
    expect(again.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parseSave(JSON.stringify(again)).ok).toBe(true);
  });

  it('market prices round-trip through a save; a price outside the bounds is corrupt', () => {
    const parsed = parseSave(JSON.stringify(v10Save));
    if (!parsed.ok) throw new Error(parsed.reason);
    const match = resumeHeadlessMatch(parsed.save);
    const ai = match.players.get(2);
    if (!ai) throw new Error('no AI');
    ai.resources.gold = 10_000;
    for (let i = 0; i < 5; i++) marketBuy(ai, playerWallet(ai), 'wood');
    const saved = match.snapshot(FIXED_DATE);
    const prices = saved.players.find((p) => p.id === 2)?.marketPrices;
    expect(prices?.wood).toBeCloseTo(100 * 1.03 ** 5);
    const back = parseSave(JSON.stringify(saved));
    if (!back.ok) throw new Error(back.reason);
    expect(resumeHeadlessMatch(back.save).players.get(2)?.marketPrices).toEqual(prices);
    const bad = { ...saved, players: saved.players.map((p) => ({ ...p, marketPrices: { food: MARKET.maxPrice + 1, wood: 100 } })) };
    expect(parseSave(JSON.stringify(bad)).ok).toBe(false);
    const missing = { ...saved, players: saved.players.map(({ marketPrices: _m, ...p }) => p) };
    expect(parseSave(JSON.stringify(missing)).ok).toBe(false);
  });
});
