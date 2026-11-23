import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../ai/testing/headlessMatch';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { parseSave } from './parse';
import { SCHEMA_VERSION } from './schema';
import { FIXED_DATE, STEP_MS, savableMatch } from './savedMatch.testkit';

describe('save round trip with trade (M17)', () => {
  it("a trade cart's home and route survive a save and load, and it plays on", () => {
    const match = savableMatch();
    // One second of play first: the AIs' fogs exist from their first tick.
    match.run(1_000, STEP_MS);
    const a = createBuilding(match.world, { type: 'market', origin: { tx: 1, ty: 1 }, playerId: 2, mapData: match.map });
    const b = createBuilding(match.world, { type: 'market', origin: { tx: 1, ty: 40 }, playerId: 2, mapData: match.map });
    const cart = createUnit(match.world, { type: 'trade_cart', tile: { tx: 4, ty: 2 }, playerId: 2 });
    match.world.addComponent(cart, 'tradeHome', { buildingId: a.id! });
    match.world.addComponent(cart, 'tradeRoute', { homeId: a.id!, targetId: b.id!, toTarget: true });
    const ship = createUnit(match.world, { type: 'trade_ship', tile: { tx: 6, ty: 2 }, playerId: 2 });
    const s1 = match.snapshot(FIXED_DATE);
    expect(s1.schemaVersion).toBe(SCHEMA_VERSION);
    const parsed = parseSave(JSON.stringify(s1));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.save).toEqual(s1);
    const restored = resumeHeadlessMatch(parsed.save);
    const back = restored.world.entities.find((e) => e.id === cart.id);
    expect(back?.tradeHome).toEqual({ buildingId: a.id });
    expect(back?.tradeRoute).toEqual({ homeId: a.id, targetId: b.id, toTarget: true });
    expect(restored.world.entities.find((e) => e.id === ship.id)?.renderable?.textureKey).toBe('unit_transport');
    expect(restored.snapshot(FIXED_DATE)).toEqual(s1);
    restored.run(5_000, STEP_MS);
    expect(restored.world.entities.includes(back!)).toBe(true);
  });

  it('a malformed route is a corrupt save', () => {
    const match = savableMatch();
    const cart = createUnit(match.world, { type: 'trade_cart', tile: { tx: 4, ty: 2 }, playerId: 2 });
    const s = match.snapshot(FIXED_DATE);
    const e = s.entities.find((x) => x.id === cart.id)!;
    (e.components as Record<string, unknown>).tradeRoute = { homeId: 1, targetId: 'x', toTarget: true };
    expect(parseSave(JSON.stringify(s)).ok).toBe(false);
  });
});
