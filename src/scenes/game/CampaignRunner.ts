import { MISSIONS, type ScenarioId } from '../../campaign/missions';
import type { ObjectiveContext } from '../../campaign/objectives';
import { missionText, objectiveHint, scenarioObjectiveText } from '../../campaign/objectiveText';
import { ObjectiveTracker } from '../../campaign/ObjectiveTracker';
import { CampaignProgress } from '../../campaign/progress';
import type { EcsWorld } from '../../ecs/world';
import type { PlayerManager } from '../../game/PlayerManager';
import { hu } from '../../i18n/hu';
import type { MatchStats } from '../../stats/MatchStats';
import { showHudNotice } from '../../ui/HUD';
import { settingsStore } from '../../ui/settings';
import { uiStore, type ObjectiveRowInfo } from '../../ui/store';

/** CampaignRunner's optional parts (defaults: no done objectives, the stored progress, HUD toasts, no stats). */
export interface CampaignRunnerOptions {
  /** Objective indices already done (a loaded save). */
  readonly done?: readonly number[];
  readonly progress?: CampaignProgress;
  readonly notify?: (message: string) => void;
  /** The match statistics (gathered, built and repair objectives, M18); none counts as nothing done. */
  readonly stats?: Pick<MatchStats, 'of'> | null;
}

/**
 * A campaign mission in a running match (M13): judges its objectives once
 * a second (latching, ObjectiveTracker), shows them on the HUD with a
 * toast for each newly met one, tells VictoryChecker when the mission is
 * complete, keeps the done objectives for a save, and records a won
 * mission in the campaign progress.
 */
export class CampaignRunner {
  readonly tracker: ObjectiveTracker;
  private readonly progress: CampaignProgress;
  private readonly notify: (message: string) => void;
  private readonly stats: Pick<MatchStats, 'of'> | null;

  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    readonly mission: ScenarioId,
    options: CampaignRunnerOptions = {},
  ) {
    const def = MISSIONS[mission];
    this.tracker = new ObjectiveTracker(def.objectives, options.done ?? [], def.sequential === true);
    this.progress = options.progress ?? new CampaignProgress();
    this.notify = options.notify ?? ((m) => showHudNotice(m, 'ok'));
    this.stats = options.stats ?? null;
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
    const { fresh, states } = this.tracker.tick(this.context(timeMs));
    for (const i of fresh) this.notify(hu.campaign.objectiveDone(scenarioObjectiveText(this.mission, i)));
    // A sequential mission (M18 tutorial) shows the done objectives and the current one, with its hint.
    const current = this.tracker.current();
    const gesture = settingsStore.getState().controls.commandGesture;
    const shown = this.tracker.sequential ? states.filter((s) => s.done || s.index === current) : states;
    const rows: ObjectiveRowInfo[] = shown.map((s) => {
      const hint = s.index === current ? objectiveHint(this.mission, s.index, gesture) : null;
      return {
        text: scenarioObjectiveText(this.mission, s.index),
        done: s.done,
        have: s.progress.have,
        need: s.progress.need,
        counted: s.objective.kind !== 'reachAge' && s.objective.kind !== 'winMatch',
        ...(hint ? { hint } : {}),
      };
    });
    // Publish only on a change: a new store object re-renders the HUD.
    const prev = uiStore.getState().objectives?.rows;
    const same = !!prev && prev.length === rows.length && rows.every((r, i) => {
      const p = prev[i];
      return !!p && p.done === r.done && p.have === r.have && p.need === r.need && p.text === r.text && p.hint === r.hint;
    });
    if (!same) uiStore.getState().setObjectives({ title: missionText(this.mission).title, rows });
  }

  complete(): boolean {
    return this.tracker.complete();
  }

  /** What a save keeps. */
  state(): { done: number[] } {
    return { done: this.tracker.done };
  }

  /**
   * The match ended: a victory completes the mission, unless the mission is
   * still locked (a shared save of a later mission, M10 import): the
   * campaign unlocks in order. Returns the closing text.
   */
  finish(victory: boolean): string {
    if (victory && this.progress.status(this.mission) !== 'locked') this.progress.markCompleted(this.mission);
    const t = missionText(this.mission);
    return victory ? t.victory : t.defeat;
  }

  private context(timeMs: number): ObjectiveContext {
    const human = this.players.human();
    const humanId = human?.id ?? 1;
    const counters = this.stats?.of(humanId);
    return {
      entities: this.world.entities,
      humanId,
      humanAge: human?.age ?? 1,
      humanDefeated: human?.defeated ?? true,
      timeMs,
      gatheredBy: counters ? { ...counters.gatheredBy } : { food: 0, wood: 0, gold: 0 },
      repairsDone: counters?.repairsDone ?? 0,
      builtBy: counters ? { ...counters.builtBy } : {},
    };
  }
}
