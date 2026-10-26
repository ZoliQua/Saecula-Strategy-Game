import { AIThoughtsOverlay, type AIThoughtSource } from '../../ui/dev/AIThoughtsOverlay';

/**
 * Dev builds only (GameScene imports this module behind
 * import.meta.env.DEV, so production bundles never contain it): the AI
 * thoughts overlay (` / F9, or window.__aiThoughts(on)) and a game-speed
 * hook (window.__timeScale(n), 0.25..16). Returns the cleanup.
 */
export function mountDevTools(
  sources: () => readonly AIThoughtSource[],
  setTimeScale: (scale: number) => void,
): () => void {
  const overlay = new AIThoughtsOverlay(sources);
  const w = window as unknown as { __aiThoughts?: (on?: boolean) => void; __timeScale?: (n: number) => void };
  w.__aiThoughts = (on) => overlay.toggle(on);
  w.__timeScale = (n) => setTimeScale(Math.min(16, Math.max(0.25, n)));
  return () => {
    overlay.destroy();
    setTimeScale(1);
    delete w.__aiThoughts;
    delete w.__timeScale;
  };
}
