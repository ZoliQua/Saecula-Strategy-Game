import { MISSIONS, type MissionId } from '../../campaign/missions';
import { objectiveText } from '../../campaign/objectiveText';
import { ObjectiveTracker } from '../../campaign/ObjectiveTracker';
import { CampaignProgress } from '../../campaign/progress';
import type { EcsWorld } from '../../ecs/world';
import type { PlayerManager } from '../../game/PlayerManager';
import { hu } from '../../i18n/hu';
import { showHudNotice } from '../../ui/HUD';
import { uiStore, type ObjectiveRowInfo } from '../../ui/store';

/**
 * A campaign mission in a running match (M13): judges its objectives once
 * a second (latching, ObjectiveTracker), shows them on the HUD with a
 * toast for each newly met one, tells VictoryChecker when the mission is
 * complete, keeps the done objectives for a save, and records a won
 * mission in the campaign progress.
 */
export class CampaignRunner {
  readonly tracker: ObjectiveTracker;

  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    readonly mission: MissionId,
    done: readonly number[] = [],
    private readonly progress: CampaignProgress = new CampaignProgress(),
    private readonly notify: (message: string) => void = (m) => showHudNotice(m, 'ok'),
  ) {
    this.tracker = new ObjectiveTracker(MISSIONS[mission].objectives, done);
  }

  /**
   * A new mission match: the human's stock, age and age-up techs live in
   * the UI store during play (src/ecs/research.ts uiWallet), so the
   * mission start (applyMissionStart) is copied there.
   */
  static publishStart(players: PlayerManager): void {
    const human = players.human();
    if (!human) return;
    const ui = uiStore.getState();
    ui.setResources({ ...human.resources });
    ui.setAge(human.age);
    ui.setResearchedTechs([...human.researched]);
  }

  /** Re-judges the objectives at game time `timeMs` and refreshes the HUD panel. */
  secondTick(timeMs: number): void {
    const ctx = this.context(timeMs);
    for (const i of this.tracker.update(ctx)) {
      const o = this.tracker.objectives[i];
      if (o) this.notify(hu.campaign.objectiveDone(objectiveText(o)));
    }
    const rows: ObjectiveRowInfo[] = this.tracker.states(ctx).map((s) => ({
      text: objectiveText(s.objective),
      done: s.done,
      have: s.progress.have,
      need: s.progress.need,
      counted: s.objective.kind !== 'reachAge' && s.objective.kind !== 'winMatch',
    }));
    uiStore.getState().setObjectives({ title: hu.campaign.missions[this.mission].title, rows });
  }

  complete(): boolean {
    return this.tracker.complete();
  }

  /** What a save keeps. */
  state(): { done: number[] } {
    return { done: this.tracker.done };
  }

  /** The match ended: a victory completes the mission; returns its closing text. */
  finish(victory: boolean): string {
    if (victory) this.progress.markCompleted(this.mission);
    const t = hu.campaign.missions[this.mission];
    return victory ? t.victory : t.defeat;
  }

  private context(timeMs: number) {
    const human = this.players.human();
    return {
      entities: this.world.entities,
      humanId: human?.id ?? 1,
      humanAge: human?.age ?? 1,
      humanDefeated: human?.defeated ?? true,
      timeMs,
    };
  }
}
