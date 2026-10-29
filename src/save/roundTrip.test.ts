import { describe, expect, it } from 'vitest';
import { resumeHeadlessMatch } from '../ai/testing/headlessMatch';
import { createBuilding } from '../ecs/archetypes/building';
import { parseSave } from './parse';
import { FIXED_DATE, MIN, STEP_MS, savableMatch } from './savedMatch.testkit';

describe('save round trip', () => {
  it('serialize(restore(s)) equals s, through JSON too; Wonder clock and personality survive', () => {
    const match = savableMatch();
    match.run(6 * MIN, STEP_MS);
    const s1 = match.snapshot(FIXED_DATE);
    expect(s1.schemaVersion).toBe(2);
    // Six minutes: six timeline samples, and the AIs have gathered.
    expect(s1.stats.timeline.map((t) => t.tMs)).toEqual([1, 2, 3, 4, 5, 6].map((m) => m * MIN));
    expect(s1.stats.players['2']!.gathered).toBeGreaterThan(0);
    expect(s1.entities.length).toBeGreaterThan(50);
    expect(Object.keys(s1.ai)).toEqual(['2', '3']);
    expect(s1.setup).toMatchObject({ seed: 3, aiCount: 2, mapSize: 'small', difficulty: 'medium', victory: 'conquest_wonder' });

    // (a) Restored and snapshotted again without a step: identical.
    expect(resumeHeadlessMatch(s1).snapshot(FIXED_DATE)).toEqual(s1);

    // (b) Through a JSON string and the parser: identical.
    const parsed = parseSave(JSON.stringify(s1));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.save).toEqual(s1);

    // (d) No sprite, nothing selected.
    for (const e of s1.entities) {
      expect('sprite' in e.components).toBe(false);
      if (e.components.selectable) expect(e.components.selectable.selected).toBe(false);
    }

    // (c) A finished Wonder with 123 s on its clock, and a personality.
    const again = resumeHeadlessMatch(s1);
    const wonder = createBuilding(again.world, { type: 'wonder', origin: { tx: 1, ty: 1 }, playerId: 2, mapData: again.map });
    again.world.addComponent(wonder, 'wonder', { heldMs: 123_000 });
    const ai = again.players.get(2);
    if (!ai) throw new Error('no player 2');
    ai.personality = 'turtle';
    const selected = again.world.entities.find((e) => e.selectable && e.unit);
    if (selected?.selectable) selected.selectable.selected = true;
    const s2 = again.snapshot(FIXED_DATE);
    const s2Back = parseSave(JSON.stringify(s2));
    expect(s2Back.ok).toBe(true);
    if (!s2Back.ok) return;
    const saved = s2Back.save.entities.find((e) => e.id === wonder.id);
    expect(saved?.components.wonder).toEqual({ heldMs: 123_000 });
    expect(saved?.components.building?.type).toBe('wonder');
    expect(s2Back.save.players.find((p) => p.id === 2)?.personality).toBe('turtle');
    const restored = resumeHeadlessMatch(s2Back.save);
    expect(restored.world.entities.find((e) => e.id === wonder.id)?.wonder).toEqual({ heldMs: 123_000 });
    expect(restored.players.get(2)?.personality).toBe('turtle');
    expect(restored.snapshot(FIXED_DATE)).toEqual(s2);
    // The selection is never saved.
    expect(s2.entities.find((e) => e.id === selected?.id)?.components.selectable?.selected).toBe(false);
  }, 120_000);

  it('a 128×128, 6-player save after 6 minutes stays under 1.5 MB of JSON and parses', () => {
    const match = savableMatch({ size: 128, aiCount: 5 });
    match.run(6 * MIN, STEP_MS);
    const json = JSON.stringify(match.snapshot(FIXED_DATE));
    // Measured at M6 Task 4: about 0.5 MB (two thirds of it entities, mostly resource nodes).
    expect(json.length).toBeLessThan(1.5 * 1024 * 1024);
    expect(parseSave(json).ok).toBe(true);
  }, 120_000);
});
