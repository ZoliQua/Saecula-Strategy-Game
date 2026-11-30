import { hu } from '../i18n/hu';
import type { CommandGesture } from '../ui/settings';
import { TUTORIAL_ID, type ScenarioId } from './missions';
import type { Objective } from './objectives';

/** The Hungarian line of an objective (hu.campaign.objectives). */
export function objectiveText(o: Objective): string {
  const t = hu.campaign.objectives;
  switch (o.kind) {
    case 'reachAge':
      return t.reachAge(hu.ages[o.age === 1 ? 'roman' : o.age === 2 ? 'medieval' : 'enlightenment']);
    case 'ownBuildings':
      return t.ownBuildings(hu.buildings[o.building], o.count);
    case 'ownUnits':
      return t.ownUnits(hu.units[o.unit], o.count);
    case 'survive':
      return t.survive(Math.round(o.ms / 60_000));
    case 'gathered':
      return t.gathered(hu.resources[o.resource], o.amount);
    case 'repaired':
      return t.repaired(o.count);
    case 'winMatch':
      return t.winMatch;
  }
}

/** A scenario's texts: title, place, briefing and the closing lines (hu.campaign.tutorial or .missions). */
export function missionText(id: ScenarioId): { title: string; place: string; briefing: string; victory: string; defeat: string } {
  return id === TUTORIAL_ID ? hu.campaign.tutorial : hu.campaign.missions[id];
}

/**
 * The tutorial's hint for objective `index` (M18), naming the command click
 * as the controls are set (right click, plus the gesture's left click).
 * Null for a scenario or step without a hint.
 */
export function objectiveHint(id: ScenarioId, index: number, gesture: CommandGesture): string | null {
  if (id !== TUTORIAL_ID) return null;
  const t = hu.campaign.tutorial;
  const hint = t.hints[index];
  return hint ? hint(t.command(hu.settings.gestureKey[gesture])) : null;
}
