import { playerWallet, uiWallet } from '../../ecs/research';
import type { PlayerManager } from '../../game/PlayerManager';
import type { SlotId } from '../../save/storage';
import { AIThoughtsOverlay, type AIThoughtSource } from '../../ui/dev/AIThoughtsOverlay';

/**
 * Dev builds only (GameScene imports this module behind
 * import.meta.env.DEV, so production bundles never contain it): the AI
 * thoughts overlay (` / F9, or window.__aiThoughts(on)) and a game-speed
 * hook (window.__timeScale(n), 0.25..16) and a resource grant
 * (window.__grant(playerId, amount): `amount` more of each resource)
 * and save hooks (window.__saveNow(slot) / window.__loadSlot(slot), slot
 * 1..5 or 'auto'). Returns the cleanup.
 */
export function mountDevTools(
  sources: () => readonly AIThoughtSource[],
  setTimeScale: (scale: number) => void,
  players: PlayerManager,
  saves: { saveNow(slot: SlotId): Promise<unknown>; loadSlot(slot: SlotId): Promise<unknown> },
): () => void {
  const overlay = new AIThoughtsOverlay(sources);
  const w = window as unknown as {
    __aiThoughts?: (on?: boolean) => void;
    __timeScale?: (n: number) => void;
    __grant?: (playerId: number, amount: number) => void;
    __saveNow?: (slot?: SlotId) => Promise<unknown>;
    __loadSlot?: (slot?: SlotId) => Promise<unknown>;
  };
  w.__aiThoughts = (on) => overlay.toggle(on);
  w.__timeScale = (n) => setTimeScale(Math.min(16, Math.max(0.25, n)));
  w.__grant = (playerId, amount) => {
    const p = players.get(playerId);
    if (!p || !Number.isFinite(amount)) return;
    // The human's stockpile lives in the UI store, an AI's on its Player.
    const wallet = p.isHuman ? uiWallet() : playerWallet(p);
    const r = wallet.get();
    wallet.set({ food: r.food + amount, wood: r.wood + amount, gold: r.gold + amount });
  };
  w.__saveNow = (slot = 1) => saves.saveNow(slot);
  w.__loadSlot = (slot = 1) => saves.loadSlot(slot);
  return () => {
    overlay.destroy();
    setTimeScale(1);
    delete w.__aiThoughts;
    delete w.__timeScale;
    delete w.__grant;
    delete w.__saveNow;
    delete w.__loadSlot;
  };
}
