import { MISSION_IDS, SCENARIO_IDS, TUTORIAL_ID, type ScenarioId } from '../../campaign/missions';
import { missionText } from '../../campaign/objectiveText';
import type { MissionStatus } from '../../campaign/progress';
import { hu } from '../../i18n/hu';

/** One row of the campaign list (CampaignScreen). */
export interface CampaignRow {
  readonly id: ScenarioId;
  /** The tutorial's badge, or the mission's number. */
  readonly badge: string;
  readonly title: string;
  readonly place: string;
  readonly status: MissionStatus;
  readonly statusText: string;
}

/** The campaign list's rows, in order: the tutorial first (M18), then the missions numbered 1–3. */
export function campaignRows(status: (id: ScenarioId) => MissionStatus): CampaignRow[] {
  return SCENARIO_IDS.map((id) => {
    const st = status(id);
    const t = missionText(id);
    const badge = id === TUTORIAL_ID ? hu.campaign.tutorial.badge : String(MISSION_IDS.indexOf(id) + 1);
    return { id, badge, title: t.title, place: t.place, status: st, statusText: hu.campaign.status[st] };
  });
}
