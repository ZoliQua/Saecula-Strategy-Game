import { describe, expect, it, vi } from 'vitest';
import { defaultSetupConfig } from '../../game/GameSetupConfig';
import { MapGenerationError } from '../../map/generator';

let failure: Error | null = null;
vi.mock('../../map/generator', async (original) => {
  const real = await original<typeof import('../../map/generator')>();
  return {
    ...real,
    generateMap: (...args: Parameters<typeof real.generateMap>) => {
      if (failure) throw failure;
      return real.generateMap(...args);
    },
  };
});

const { tryGenerateGameMap } = await import('./GameBootstrap');

describe('tryGenerateGameMap', () => {
  it('returns the map when generation succeeds', () => {
    failure = null;
    expect(tryGenerateGameMap(defaultSetupConfig(3))?.starts.length).toBe(4);
  });

  it('returns null when no valid map exists for the seed (the scene then goes back to setup)', () => {
    failure = new MapGenerationError({ template: 'islands', width: 64, height: 64, seed: 1, playerCount: 6 }, ['unreachable start']);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(tryGenerateGameMap(defaultSetupConfig(3))).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('does not swallow other errors', () => {
    failure = new TypeError('bug');
    expect(() => tryGenerateGameMap(defaultSetupConfig(3))).toThrow(TypeError);
  });
});
