import { z } from 'zod';
import { MISSION_IDS, type MissionId } from './missions';

/** The localStorage key of the campaign progress (CLAUDE.md §7.6: internal keys keep the isorts prefix). */
export const CAMPAIGN_KEY = 'isorts.campaign.v1';

const ProgressSchema = z.object({ completed: z.array(z.enum(MISSION_IDS)) }).strict();

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

  completed(): Set<MissionId> {
    try {
      const raw = this.storage?.getItem(CAMPAIGN_KEY);
      if (!raw) return new Set();
      const parsed = ProgressSchema.safeParse(JSON.parse(raw));
      return new Set(parsed.success ? parsed.data.completed : []);
    } catch {
      return new Set();
    }
  }

  status(id: MissionId): MissionStatus {
    const done = this.completed();
    if (done.has(id)) return 'completed';
    const i = MISSION_IDS.indexOf(id);
    return i === 0 || done.has(MISSION_IDS[i - 1] as MissionId) ? 'available' : 'locked';
  }

  markCompleted(id: MissionId): void {
    const done = this.completed();
    if (done.has(id)) return;
    done.add(id);
    try {
      this.storage?.setItem(CAMPAIGN_KEY, JSON.stringify({ completed: MISSION_IDS.filter((m) => done.has(m)) }));
    } catch {
      /* storage full or blocked: the progress is simply not kept */
    }
  }
}
