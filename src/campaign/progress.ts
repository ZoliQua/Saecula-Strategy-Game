import { z } from 'zod';
import { MISSION_IDS, TUTORIAL_ID, type MissionId, type ScenarioId } from './missions';

/** The localStorage key of the campaign progress (CLAUDE.md §7.6: internal keys keep the isorts prefix). */
export const CAMPAIGN_KEY = 'isorts.campaign.v1';

/** `tutorialDone` (M18) is optional: progress stored before it reads as not done. */
const ProgressSchema = z.object({ completed: z.array(z.enum(MISSION_IDS)), tutorialDone: z.boolean().optional() }).strict();
type StoredProgress = z.infer<typeof ProgressSchema>;

export type MissionStatus = 'locked' | 'available' | 'completed';

/** The part of Storage the progress uses (injectable for tests). */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): ProgressStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Which missions are done (M13), kept in localStorage. Missions unlock in
 * order; a completed one can be replayed. Missing, unreadable or corrupt
 * data reads as no progress; a failing write is ignored (the game goes on).
 */
export class CampaignProgress {
  constructor(private readonly storage: ProgressStorage | null = browserStorage()) {}

  private read(): StoredProgress {
    try {
      const raw = this.storage?.getItem(CAMPAIGN_KEY);
      if (!raw) return { completed: [] };
      const parsed = ProgressSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : { completed: [] };
    } catch {
      return { completed: [] };
    }
  }

  private write(p: StoredProgress): void {
    try {
      this.storage?.setItem(CAMPAIGN_KEY, JSON.stringify(p));
    } catch {
      /* storage full or blocked: the progress is simply not kept */
    }
  }

  completed(): Set<MissionId> {
    return new Set(this.read().completed);
  }

  /** Whether the tutorial was completed (M18; it never locks or unlocks a mission). */
  tutorialDone(): boolean {
    return this.read().tutorialDone === true;
  }

  /** The tutorial is always available; missions unlock in order. */
  status(id: ScenarioId): MissionStatus {
    if (id === TUTORIAL_ID) return this.tutorialDone() ? 'completed' : 'available';
    const done = this.completed();
    if (done.has(id)) return 'completed';
    const i = MISSION_IDS.indexOf(id);
    return i === 0 || done.has(MISSION_IDS[i - 1] as MissionId) ? 'available' : 'locked';
  }

  markCompleted(id: ScenarioId): void {
    const p = this.read();
    if (id === TUTORIAL_ID) {
      if (!p.tutorialDone) this.write({ completed: p.completed, tutorialDone: true });
      return;
    }
    const done = new Set(p.completed);
    if (done.has(id)) return;
    done.add(id);
    this.write({ completed: MISSION_IDS.filter((m) => done.has(m)), ...(p.tutorialDone ? { tutorialDone: true } : {}) });
  }
}
