import { CHAPTERS, MISSION_IDS, SHORT_IDS, TUTORIAL_ID, isShort, type MissionId, type ScenarioId } from '../../campaign/missions';
import { missionText } from '../../campaign/objectiveText';
import type { MissionStatus } from '../../campaign/progress';
import { hu } from '../../i18n/hu';

/** One row of the campaign list (CampaignScreen). */
export interface CampaignRow {
  readonly id: ScenarioId;
  /** The tutorial's badge, the chain mission's number (1–6), or the short scenario's badge (M20). */
  readonly badge: string;
  readonly title: string;
  readonly place: string;
  readonly status: MissionStatus;
  readonly statusText: string;
}

/** A titled run of rows (M20); the tutorial's section has no title. */
export interface CampaignSection {
  readonly title: string | null;
  readonly rows: readonly CampaignRow[];
}

/** A scenario's badge: the tutorial's, the chain mission's number, or the short scenario's (R1–R3). */
export function scenarioBadge(id: ScenarioId): string {
  if (id === TUTORIAL_ID) return hu.campaign.tutorial.badge;
  if (isShort(id)) return hu.campaign.shortBadge(SHORT_IDS.indexOf(id) + 1);
  return String(MISSION_IDS.indexOf(id) + 1);
}

/** A scenario's briefing kicker: the tutorial's, "N. küldetés", or the short scenario's. */
export function scenarioKicker(id: ScenarioId): string {
  if (id === TUTORIAL_ID) return hu.campaign.tutorial.kicker;
  if (isShort(id)) return hu.campaign.shortKicker;
  return hu.campaign.missionNumber(MISSION_IDS.indexOf(id as MissionId) + 1);
}

function row(id: ScenarioId, status: (id: ScenarioId) => MissionStatus): CampaignRow {
  const st = status(id);
  const t = missionText(id);
  return { id, badge: scenarioBadge(id), title: t.title, place: t.place, status: st, statusText: hu.campaign.status[st] };
}

/**
 * The campaign list in order (M20): the tutorial first (untitled, M18), then
 * each chapter's missions numbered on from 1, then the short scenarios.
 */
export function campaignSections(status: (id: ScenarioId) => MissionStatus): CampaignSection[] {
  return [
    { title: null, rows: [row(TUTORIAL_ID, status)] },
    ...CHAPTERS.map((ids, i) => ({ title: hu.campaign.sections.chapters[i] ?? null, rows: ids.map((id) => row(id, status)) })),
    { title: hu.campaign.sections.short, rows: SHORT_IDS.map((id) => row(id, status)) },
  ];
}

/** Every row of the campaign list, in order (the sections flattened). */
export function campaignRows(status: (id: ScenarioId) => MissionStatus): CampaignRow[] {
  return campaignSections(status).flatMap((s) => s.rows);
}
