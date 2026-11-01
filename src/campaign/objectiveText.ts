import { hu } from '../i18n/hu';
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
    case 'winMatch':
      return t.winMatch;
  }
}
