import type Phaser from 'phaser';
import { unitArt } from '../../iso/art/units/UnitArt';
import { buildingTexture, rebaseCivArt, setBuildingBaseOwners, wallTexture } from '../../iso/buildingTextures';
import type { AgeId, CivId } from '../../types';
import { ageUpArtJobs, BackgroundArt, civBaseOwners, planArtLoad, type AgeSpan, type ArtPainters } from './artLoadPlan';

/**
 * A match's civ art wiring (texture memory and load budget, M5 Task 1):
 * each civ's building bases in its base owner's colour, the art painted
 * behind the loading card, and the background queue that follows during
 * play (age-2 wall pieces, then each civ's age-up art).
 */
export class MatchArt {
  /** Each civ's base owner (civBaseOwners). */
  readonly owners: ReadonlyMap<CivId, number>;
  private background: BackgroundArt | null = null;
  /** (civ, age) pairs whose age-up art is already queued. */
  private readonly ageQueued = new Set<string>();

  /** Call once the match will run: the menu keeps player 1's colour until then. */
  constructor(
    private readonly scene: Phaser.Scene,
    players: ReadonlyArray<{ readonly id: number; readonly civ: CivId; readonly isHuman: boolean }>,
  ) {
    this.owners = civBaseOwners(players);
    setBuildingBaseOwners(this.owners);
    // Menu / previous-match bases painted for another player go now (nothing of this match shows yet).
    rebaseCivArt(scene, this.owners, new Set());
  }

  /**
   * The loading-card jobs (planArtLoad critical); starts the background queue
   * with the rest. `spans` (a loaded save): each civ's art up to its highest
   * age is planned now (artLoadPlan) and marked queued, so a later ageChanged
   * to an age the civ already shows does not repeat it.
   */
  criticalJobs(humanCiv: CivId, spans?: ReadonlyMap<CivId, AgeSpan>): ReadonlyArray<() => void> {
    for (const [civ, { max }] of spans ?? []) for (let a = 2; a <= max; a++) this.ageQueued.add(`${civ}:${a}`);
    const plan = planArtLoad(humanCiv, this.owners, this.painters(), spans);
    this.background = new BackgroundArt(plan.background);
    return plan.critical;
  }

  /** The first age-up of a civ to `age` queues that age's unit sheets and the next age's wall pieces (once per civ and age). */
  onAgeChanged(civ: CivId, age: AgeId): void {
    const id = `${civ}:${age}`;
    if (this.ageQueued.has(id)) return;
    this.ageQueued.add(id);
    this.background?.enqueue(ageUpArtJobs(civ, age, this.painters()));
  }

  /** Once per game frame, after the frame's systems ran (BackgroundArt.update). */
  update(realDeltaMs: number, frameStartMs: number): void {
    this.background?.update(realDeltaMs, frameStartMs);
  }

  /** Scene shutdown: later paints (menu, previews) use player 1's colour again. */
  destroy(): void {
    this.background = null;
    setBuildingBaseOwners(new Map());
  }

  private painters(): ArtPainters {
    return {
      building: (type, civ, owner) => buildingTexture(this.scene, type, 1, owner, civ),
      wall: (piece, age, civ) => wallTexture(this.scene, piece, age, civ),
      // Not forced: when this frame already made a sheet (one per frame), try again at the back of the queue.
      unit: (type, civ) => {
        if (!unitArt(this.scene, type, civ)) this.background?.enqueue([() => this.painters().unit(type, civ)]);
      },
    };
  }
}
