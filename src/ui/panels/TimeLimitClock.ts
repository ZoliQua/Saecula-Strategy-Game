import { hu } from '../../i18n/hu';
import { el, formatClock } from '../dom';
import { hex } from '../format';
import type { TimeLimitInfo, UiStore } from '../store';

/**
 * The clock's texts: time left, and who leads (`humanId` reads as "you"). In a
 * team match (M16) the leader is a team, named for its lowest standing id: the
 * human's team (`humanId`, player 1) or the enemy team.
 */
export function timeLimitLabels(info: TimeLimitInfo, humanId = 1): { time: string; leader: string } {
  const ours = info.leaderId === humanId;
  const leader = info.teams
    ? info.leaderId === null
      ? hu.hud.timeLimitLeader
      : ours
        ? hu.hud.timeLimitLeaderTeam
        : hu.hud.timeLimitLeaderEnemyTeam
    : ours
      ? hu.hud.timeLimitLeaderYou
      : hu.hud.timeLimitLeader;
  return { time: hu.hud.timeLimitClock(formatClock(info.remainingMs)), leader };
}

/** True on the update the clock first enters its final window (the HUD toasts once). */
export function enteredFinal(prev: TimeLimitInfo | null, next: TimeLimitInfo | null): boolean {
  return !!next?.final && !prev?.final;
}

/**
 * Time-victory clock at the top of the right column: time left until the
 * best score wins, and the leader's colour swatch. Highlighted in the
 * final window; hidden in matches without a time limit.
 */
export class TimeLimitClock {
  readonly root: HTMLElement;
  private readonly time: HTMLElement;
  private readonly leader: HTMLElement;
  private readonly swatch: HTMLElement;
  private shown: TimeLimitInfo | null = null;

  constructor(private readonly onFinal: () => void) {
    this.time = el('span', { class: 'time-limit-time' });
    this.leader = el('span', { class: 'time-limit-leader' });
    this.swatch = el('span', { class: 'wonder-swatch' });
    this.root = el('div', { class: 'glass time-limit anim-in', 'aria-live': 'polite' }, this.time, this.leader, this.swatch);
  }

  render(state: UiStore): void {
    const info = state.timeLimit;
    if (info === this.shown) return;
    if (enteredFinal(this.shown, info)) this.onFinal();
    this.shown = info;
    this.root.classList.toggle('show', info !== null);
    if (!info) return;
    const labels = timeLimitLabels(info);
    this.time.textContent = labels.time;
    this.leader.textContent = labels.leader;
    this.swatch.style.background = info.leaderColor === null ? 'transparent' : hex(info.leaderColor);
    this.root.classList.toggle('final', info.final);
    this.root.classList.toggle('own', info.leaderId === 1);
  }

  destroy(): void {
    this.root.remove();
  }
}
