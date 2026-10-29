import { beforeAll, describe, expect, it } from 'vitest';
import { encodeBytes } from './base64';
import { parseSave } from './parse';
import type { SaveData } from './schema';
import { FIXED_DATE, STEP_MS, savableMatch } from './savedMatch.testkit';

/** A small real save (20 s of play) as a plain JSON object, edited per case. */
let base: Record<string, unknown>;
const copy = (): Record<string, unknown> & SaveData => JSON.parse(JSON.stringify(base)) as Record<string, unknown> & SaveData;

beforeAll(() => {
  const match = savableMatch();
  match.run(20_000, STEP_MS);
  base = JSON.parse(JSON.stringify(match.snapshot(FIXED_DATE))) as Record<string, unknown>;
});

function expectReason(raw: unknown, reason: 'corrupt' | 'newer'): void {
  let result: ReturnType<typeof parseSave> | undefined;
  expect(() => (result = parseSave(raw))).not.toThrow();
  expect(result).toEqual({ ok: false, reason });
}

describe('parseSave (Review Focus 2)', () => {
  it('accepts the untouched save, as a string and as an object', () => {
    expect(parseSave(JSON.stringify(base)).ok).toBe(true);
    expect(parseSave(copy()).ok).toBe(true);
  });

  it('no human player → corrupt', () => {
    const save = copy();
    for (const p of save.players) (p as { isHuman: boolean }).isHuman = false;
    expectReason(save, 'corrupt');
  });

  it('more than one human player → corrupt', () => {
    const save = copy();
    for (const p of save.players) (p as { isHuman: boolean }).isHuman = true;
    // AI keys would now name human players (corrupt for another reason): drop them so only the human count is wrong.
    save.ai = {};
    expectReason(save, 'corrupt');
  });

  it('truncated JSON → corrupt', () => expectReason('{"schemaVersion":1', 'corrupt'));

  it('null → corrupt', () => expectReason(null, 'corrupt'));

  it('an entity with an unknown component key → corrupt', () => {
    const save = copy();
    const first = save.entities[0];
    if (!first) throw new Error('no entity');
    (first.components as Record<string, unknown>)['laser'] = { power: 9000 };
    expectReason(save, 'corrupt');
  });

  it('fog base64 of the wrong length → corrupt', () => {
    const save = copy();
    const key = Object.keys(save.fogOfWar)[0];
    if (!key) throw new Error('no fog');
    save.fogOfWar[key] = encodeBytes(new Uint8Array(10));
    expectReason(save, 'corrupt');
  });

  it('terrain or blocked mask of the wrong length → corrupt', () => {
    const terrain = copy();
    terrain.map.terrain = encodeBytes(new Uint8Array(3));
    expectReason(terrain, 'corrupt');
    const blocked = copy();
    blocked.map.blocked = 'not base64!';
    expectReason(blocked, 'corrupt');
  });

  it('schemaVersion: 2 → newer', () => {
    const save = copy();
    (save as Record<string, unknown>)['schemaVersion'] = 2;
    expectReason(save, 'newer');
  });

  it('a players[].civ outside CIV_IDS → corrupt', () => {
    const save = copy();
    const p = save.players[0];
    if (!p) throw new Error('no player');
    (p as Record<string, unknown>)['civ'] = 'atlantean';
    expectReason(save, 'corrupt');
  });

  it('wrong shapes → corrupt', () => {
    expectReason({ ...copy(), players: 'nobody' }, 'corrupt');
    expectReason({ ...copy(), gameTimeMs: -1 }, 'corrupt');
    const color = copy();
    (color.players[0] as Record<string, unknown>)['color'] = 'red';
    expectReason(color, 'corrupt');
    const ai = copy();
    (ai.ai['2'] as Record<string, unknown>)['rngState'] = 'x';
    expectReason(ai, 'corrupt');
    const kind = copy();
    (kind.ai['2'] as Record<string, unknown>)['strategy'] = { kind: 'genius' };
    expectReason(kind, 'corrupt');
  });

  it('duplicate entity ids or a next id not past them → corrupt', () => {
    const dup = copy();
    const [a, b] = dup.entities;
    if (!a || !b) throw new Error('too few entities');
    (b as { id: number }).id = a.id;
    expectReason(dup, 'corrupt');
    const next = copy();
    (next as Record<string, unknown>)['nextEntityId'] = 1;
    expectReason(next, 'corrupt');
  });

  it('an older schema without a migration → corrupt', () => {
    const save = copy();
    (save as Record<string, unknown>)['schemaVersion'] = 0;
    expectReason(save, 'corrupt');
  });

  it('non-JSON input never throws', () => {
    for (const raw of ['', 'undefined', '[]', '42', '{}', 42, undefined, [], () => 1]) expect(parseSave(raw).ok).toBe(false);
  });
  describe('positions off the map → corrupt (final review Minor 1)', () => {
    const find = (save: SaveData, has: (c: SaveData['entities'][number]['components']) => boolean): SaveData['entities'][number]['components'] => {
      const e = save.entities.find((x) => has(x.components));
      if (!e) throw new Error('no such entity');
      return e.components;
    };

    it('a unit far outside the map', () => {
      const save = copy();
      find(save, (c) => c.unit !== undefined).position = { tx: 5000, ty: -40 };
      expectReason(save, 'corrupt');
    });

    it('a unit just past the last tile', () => {
      const save = copy();
      find(save, (c) => c.unit !== undefined).position = { tx: save.map.width - 0.5, ty: 0 };
      expectReason(save, 'corrupt');
    });

    it('a unit with an off-map move target or path tile', () => {
      const target = copy();
      find(target, (c) => c.unit !== undefined).moveIntent = { target: { tx: -1, ty: 3 } };
      expectReason(target, 'corrupt');
      const path = copy();
      const movable = find(path, (c) => c.movable !== undefined).movable;
      if (!movable) throw new Error('no movable');
      movable.path = [{ tx: 1, ty: 1 }, { tx: 1, ty: path.map.height }];
      expectReason(path, 'corrupt');
    });

    it('a town centre whose anchor is far outside the map', () => {
      const save = copy();
      find(save, (c) => c.building?.type === 'town_center').position = { tx: 9999, ty: 9999 };
      expectReason(save, 'corrupt');
    });

    it('a building whose footprint runs past the map edge', () => {
      const save = copy();
      const c = find(save, (x) => x.building?.type === 'town_center');
      const w = c.building?.footprint.width ?? 3;
      c.position = { tx: save.map.width - w + 1, ty: 0 };
      expectReason(save, 'corrupt');
      const fits = copy();
      find(fits, (x) => x.building?.type === 'town_center').position = { tx: fits.map.width - w, ty: 0 };
      expect(parseSave(fits).ok).toBe(true);
    });

    it('a resource node outside the map', () => {
      const save = copy();
      find(save, (c) => c.resourceNode !== undefined).position = { tx: 3, ty: save.map.height + 7 };
      expectReason(save, 'corrupt');
    });

    it('accepts a camera far off the map (view state only; Phaser clamps it on load)', () => {
      // A view wider than twice the camera bounds puts the clamped centre outside them (ultrawide at zoom 0.5).
      const save = copy();
      save.camera = { tx: -500, ty: 30, zoom: 0.5 };
      expect(parseSave(save).ok).toBe(true);
    });

    it('an AI memory tile outside the map', () => {
      const save = copy();
      const ai = save.ai['2'];
      if (!ai || ai.strategy.kind === 'null') throw new Error('no AI strategy');
      ai.strategy.army.exploreGoal = { tx: 3, ty: -10 };
      expectReason(save, 'corrupt');
    });
  });
});
