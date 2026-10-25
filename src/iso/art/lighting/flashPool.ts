/** One short-lived light (muzzle flash, explosion). */
export interface Flash {
  x: number;
  y: number;
  color: number;
  radius: number;
  intensity: number;
  startMs: number;
  durationMs: number;
  active: boolean;
}

/** Brightness over a flash's life: instant attack, eased decay. t = 0..1. */
export function flashEnvelope(t: number): number {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  const k = 1 - t;
  return k * k;
}

/**
 * Fixed-size pool of flashes. When every slot is busy the oldest flash
 * is recycled, so the active count never exceeds `size` and callers
 * never need to check for capacity. Pure: Phaser lights are mapped onto
 * slots by LightManager.
 */
export class FlashPool {
  readonly slots: Flash[];

  constructor(readonly size: number) {
    this.slots = Array.from({ length: size }, () => ({
      x: 0,
      y: 0,
      color: 0xffffff,
      radius: 0,
      intensity: 0,
      startMs: 0,
      durationMs: 1,
      active: false,
    }));
  }

  /** Starts a flash; returns the slot index it occupies. */
  spawn(nowMs: number, x: number, y: number, color: number, radius: number, durationMs: number, intensity = 1): number {
    let idx = this.slots.findIndex((s) => !s.active);
    if (idx < 0) {
      idx = 0;
      for (let i = 1; i < this.slots.length; i++) {
        if (this.slots[i]!.startMs < this.slots[idx]!.startMs) idx = i;
      }
    }
    const s = this.slots[idx]!;
    Object.assign(s, { x, y, color, radius, intensity, startMs: nowMs, durationMs: Math.max(1, durationMs), active: true });
    return idx;
  }

  /** Expires finished flashes; returns each slot's current strength (0 when idle). */
  update(nowMs: number): number[] {
    return this.slots.map((s) => {
      if (!s.active) return 0;
      const t = (nowMs - s.startMs) / s.durationMs;
      if (t >= 1) {
        s.active = false;
        return 0;
      }
      return flashEnvelope(t) * s.intensity;
    });
  }

  activeCount(): number {
    return this.slots.filter((s) => s.active).length;
  }
}

/** Light slots left for persistent lights once active flashes are reserved. */
export function persistentBudget(maxLights: number, activeFlashes: number): number {
  return Math.max(0, maxLights - activeFlashes);
}

/**
 * Picks which persistent lights may render this frame: only those whose
 * radius reaches the view, nearest the view centre first, at most
 * `budget`. Returns their indices. Flashes are reserved separately, so
 * a town full of torches can never crowd a muzzle flash out of
 * Phaser's nearest-to-camera light cap.
 */
export function selectPersistentLights(
  lights: ReadonlyArray<{ x: number; y: number; radius: number }>,
  view: { x: number; y: number; right: number; bottom: number },
  budget: number,
): Set<number> {
  const cx = (view.x + view.right) / 2;
  const cy = (view.y + view.bottom) / 2;
  const candidates: Array<[number, number]> = [];
  lights.forEach((l, i) => {
    const nx = Math.max(view.x, Math.min(l.x, view.right));
    const ny = Math.max(view.y, Math.min(l.y, view.bottom));
    if (Math.hypot(l.x - nx, l.y - ny) > l.radius) return;
    candidates.push([i, Math.hypot(l.x - cx, l.y - cy)]);
  });
  candidates.sort((a, b) => a[1] - b[1]);
  return new Set(candidates.slice(0, Math.max(0, budget)).map(([i]) => i));
}
