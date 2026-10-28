import type Phaser from 'phaser';
import { defaultSetupConfig, matchCivs, withSetup, type GameSetupConfig } from '../../game/GameSetupConfig';
import { createPlayers, type PlayerManager } from '../../game/PlayerManager';
import { hu } from '../../i18n/hu';
import type { RestoredMatch } from '../../save/deserializer';
import type { SaveStorage, SlotId } from '../../save/storage';
import type { AgeId, CivId } from '../../types';
import { showHudNotice } from '../../ui/HUD';
import type { SetupReturn } from '../GameSetupScene';
import { type GeneratedGame, tryGenerateGameMap } from './GameBootstrap';
import { reachedAges, readErrorText, tryRestoreMatch, type LoadRequest } from './MatchRestore';
import type { SystemRunner, SystemRunnerOptions } from './SystemRunner';

/** What a match starts from: a freshly generated map, or a loaded save. */
export type MatchStart = { kind: 'new'; generated: GeneratedGame } | { kind: 'load'; restored: RestoredMatch };

export interface PreparedMatch {
  readonly setup: GameSetupConfig;
  readonly players: PlayerManager;
  readonly start: MatchStart;
  /** A loaded save: each civ's highest age, whose art is painted while loading. */
  readonly reached?: ReadonlyMap<CivId, AgeId>;
}

/** The menu start data when a match cannot start (no map for the seed, or a save that cannot be rebuilt). */
export type MenuReturn = SetupReturn | { readonly notice: string };

/**
 * GameScene's start data turned into a match to load: a new match (setup
 * config, its players and generated map) or a saved one (setup, players,
 * map and world from the save). On failure, where the menu goes instead.
 */
export function prepareMatch(data: Partial<GameSetupConfig> | LoadRequest | undefined): { ok: true; match: PreparedMatch } | { ok: false; back: MenuReturn } {
  if (data && 'load' in data) {
    const restored = tryRestoreMatch(data.load);
    if (!restored) return { ok: false, back: { notice: hu.save.errors.loadFailed } };
    const players = restored.players;
    return { ok: true, match: { setup: restored.setup, players, start: { kind: 'load', restored }, reached: reachedAges(players) } };
  }
  const setup = withSetup(defaultSetupConfig(), data ?? {});
  const civs = matchCivs(setup);
  const generated = tryGenerateGameMap(setup);
  // No valid map for this seed: back to the setup card, with the choices kept and a message.
  if (!generated) return { ok: false, back: { config: setup, notice: hu.setup.mapFailed } };
  return { ok: true, match: { setup, players: createPlayers(civs.human, civs.ais), start: { kind: 'new', generated } } };
}

/**
 * Replaces the running match with the save in `slot` (GameScene restarts
 * on it). A slot that cannot be used shows why on the HUD and keeps the
 * match. Resolves whether the load started.
 */
export async function startFromSlot(scene: Phaser.Scene, storage: SaveStorage, slot: SlotId): Promise<boolean> {
  const result = await storage.read(slot);
  // The player may have left the match (menu, game over) while the slot was read.
  if (!scene.scene.isActive() && !scene.scene.isPaused()) return false;
  if (!result.ok) {
    showHudNotice(readErrorText(result.reason));
    return false;
  }
  // The new match launches its own HUD; the old one must not sit over the loading card.
  scene.scene.stop('HUDScene');
  scene.scene.start('GameScene', { load: result.save } satisfies LoadRequest);
  return true;
}

/**
 * The match's SystemRunner, built by `make` with the setup's options and,
 * for a save, its fogs and AI states. Null when a save's AI state does not
 * fit its strategy (the load fails); a new match's errors propagate.
 */
export function runnerFor(start: MatchStart, setup: GameSetupConfig, make: (options: SystemRunnerOptions) => SystemRunner): SystemRunner | null {
  const options: SystemRunnerOptions = { difficulty: setup.difficulty, wonderVictory: setup.victory === 'conquest_wonder', seed: setup.seed };
  if (start.kind === 'new') return make(options);
  try {
    return make({ ...options, restore: { fogs: start.restored.fogs, ais: start.restored.aiStates } });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('restoring the AIs failed', err);
    return null;
  }
}
