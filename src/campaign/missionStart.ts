import type { PlayerManager } from '../game/PlayerManager';
import { TECH_SPECS } from '../game/technologies';
import type { TechId } from '../types';
import { MISSIONS, type MissionId } from './missions';

/** The age-up technologies that lead to `age` (so a mission started later in time is consistent). */
function ageTechsUpTo(age: number): TechId[] {
  return (Object.keys(TECH_SPECS) as TechId[]).filter((id) => {
    const e = TECH_SPECS[id].effect;
    return e.kind === 'age' && e.age <= age;
  });
}

/**
 * A new mission match's start state (M13), applied to the freshly created
 * players before anything is spawned: every player begins in the mission's
 * age (with the age-up technologies counted as researched), and the human
 * gets the mission's extra stock.
 */
export function applyMissionStart(players: PlayerManager, id: MissionId): void {
  const { start } = MISSIONS[id];
  if (start.age) {
    for (const p of players.all()) {
      p.age = start.age;
      for (const t of ageTechsUpTo(start.age)) p.researched.add(t);
    }
  }
  const human = players.human();
  if (human && start.bonus) {
    const r = human.resources;
    human.resources = { food: r.food + start.bonus.food, wood: r.wood + start.bonus.wood, gold: r.gold + start.bonus.gold };
  }
}
