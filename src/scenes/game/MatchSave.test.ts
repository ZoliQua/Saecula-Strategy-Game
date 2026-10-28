import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createEcsWorld } from '../../ecs/world';
import { hu } from '../../i18n/hu';
import { STEP_MS, savableMatch } from '../../save/savedMatch.testkit';
import type { MatchState } from '../../save/serializer';
import { SaveStorage, type KeyValueStore } from '../../save/storage';
import { MatchSave } from './MatchSave';

const notices: string[] = [];
const tones: Array<string | undefined> = [];
vi.mock('../../ui/HUD', () => ({
  showHudNotice: (m: string, tone?: string) => {
    notices.push(m);
    tones.push(tone);
  },
}));

/** A live-like MatchState from a short headless match (the human's fog is not needed here). */
let state: MatchState;

beforeAll(() => {
  const match = savableMatch();
  match.run(5_000, STEP_MS);
  state = {
    setup: match.setup,
    world: match.world,
    players: match.players,
    mapData: match.map,
    fogs: new Map(),
    ais: match.ais,
    gameTimeMs: match.timeMs(),
    camera: { tx: 10, ty: 10, zoom: 1 },
    lightPhase: 0.3,
  };
});

function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve(value);
    },
  };
}

describe('MatchSave', () => {
  it('saves to the slot and shows the saved notice', async () => {
    notices.length = 0;
    tones.length = 0;
    const store = memoryStore();
    const result = await new MatchSave(() => state, new SaveStorage(store)).saveTo(2);
    expect(result).toEqual({ ok: true });
    expect(typeof store.data.get('save:2')).toBe('string');
    expect(notices).toEqual([hu.save.saved]);
    // A stored save is a success: the amber toast, not the red alert.
    expect(tones).toEqual(['ok']);
  });

  it('serializeMatch throws → the slot keeps its previous content, { ok: false, reason: failed }', async () => {
    notices.length = 0;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = memoryStore();
    store.data.set('save:3', 'previous');
    // An entity without an id cannot be saved (serializeMatch throws).
    const world = createEcsWorld();
    world.add({ position: { tx: 1, ty: 1 } });
    const broken = (): MatchState => ({ ...state, world });
    const result = await new MatchSave(broken, new SaveStorage(store)).saveTo(3);
    expect(result).toEqual({ ok: false, reason: 'failed' });
    expect(store.data.get('save:3')).toBe('previous');
    expect(notices).toEqual([hu.save.errors.saveFailed]);
    warn.mockRestore();
  });

  it('a quiet save (the pause card shows its own line) writes the slot without a HUD notice', async () => {
    notices.length = 0;
    const store = memoryStore();
    const quiet = new MatchSave(() => state, new SaveStorage(store));
    expect(await quiet.saveTo(4, { quiet: true })).toEqual({ ok: true });
    expect(await new MatchSave(() => state, new SaveStorage(null)).saveTo(4, { quiet: true })).toEqual({ ok: false, reason: 'unavailable' });
    expect(typeof store.data.get('save:4')).toBe('string');
    expect(notices).toEqual([]);
  });

  it('an unavailable store → { ok: false, reason: unavailable } and its notice', async () => {
    notices.length = 0;
    const result = await new MatchSave(() => state, new SaveStorage(null)).saveTo(1);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
    expect(notices).toEqual([hu.save.errors.unavailable]);
    expect(tones.at(-1)).toBeUndefined();
  });

  it('autosaves to the auto slot on absolute 5-minute marks of game time', async () => {
    notices.length = 0;
    const store = memoryStore();
    const saves = new MatchSave(() => state, new SaveStorage(store), 290_000);
    saves.update(9_000);
    expect(store.data.has('save:auto')).toBe(false);
    saves.update(1_000);
    await vi.waitFor(() => expect(notices).toEqual([hu.save.autosaved]));
    expect(store.data.has('save:auto')).toBe(true);
  });
});
