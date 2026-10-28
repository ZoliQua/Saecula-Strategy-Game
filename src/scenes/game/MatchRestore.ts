import type Phaser from 'phaser';
import type { PlayerManager } from '../../game/PlayerManager';
import { hu } from '../../i18n/hu';
import type { LightManager } from '../../iso/art/lighting/LightManager';
import { screenToTile, tileToScreen } from '../../iso/coordinates';
import { restoreMatch, type RestoredMatch } from '../../save/deserializer';
import type { SaveData } from '../../save/schema';
import type { MatchState } from '../../save/serializer';
import type { ReadResult } from '../../save/storage';
import { uiStore } from '../../ui/store';
import type { AgeId, CivId } from '../../types';
import type { AgeSpan } from './artLoadPlan';

/** GameScene start data that continues a saved match instead of a new one. */
export interface LoadRequest {
  readonly load: SaveData;
}

/** restoreMatch, or null when the save cannot be rebuilt (the caller returns to the menu). */
export function tryRestoreMatch(save: SaveData): RestoredMatch | null {
  try {
    return restoreMatch(save);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('restoreMatch failed', err);
    return null;
  }
}

/** The ages each civ's players still in the game are in: lowest and highest (MatchArt.criticalJobs). */
export function civAgeSpans(players: PlayerManager): Map<CivId, AgeSpan> {
  const out = new Map<CivId, AgeSpan>();
  for (const p of players.all()) {
    if (p.defeated) continue;
    const s = out.get(p.civ);
    out.set(p.civ, s ? { min: Math.min(s.min, p.age) as AgeId, max: Math.max(s.max, p.age) as AgeId } : { min: p.age, max: p.age });
  }
  return out;
}

/** The Hungarian message for a slot that could not be loaded. */
export function readErrorText(reason: Exclude<ReadResult, { ok: true }>['reason']): string {
  if (reason === 'unavailable') return hu.save.errors.unavailable;
  if (reason === 'corrupt') return hu.save.errors.corrupt;
  if (reason === 'newer') return hu.save.errors.newer;
  return hu.save.errors.loadFailed;
}

/**
 * A loaded save's view state: the camera centre and zoom, the day-cycle
 * phase and the HUD's copies of the human's progress (age, techs, civ,
 * stockpile, clock). The game state itself is the restored world.
 */
export function applyRestoredView(scene: Phaser.Scene, restored: RestoredMatch, lighting: LightManager): void {
  const cam = scene.cameras.main;
  cam.setZoom(restored.camera.zoom);
  const { sx, sy } = tileToScreen({ tx: restored.camera.tx, ty: restored.camera.ty });
  cam.centerOn(sx, sy);
  lighting.setPhase(restored.lightPhase);
  const ui = uiStore.getState();
  const human = restored.players.human();
  if (human) {
    ui.setCiv(human.civ);
    ui.setAge(human.age);
    ui.setResearchedTechs([...human.researched]);
    ui.setResources({ ...human.resources });
  }
  ui.setGameTime(restored.gameTimeMs);
}

/** The camera as a save holds it: the view centre's tile and the zoom. */
export function cameraView(cam: Phaser.Cameras.Scene2D.Camera): MatchState['camera'] {
  // centerOn puts (x, y) at scroll + half the viewport, whatever the zoom.
  const { tx, ty } = screenToTile({ sx: cam.scrollX + cam.width * 0.5, sy: cam.scrollY + cam.height * 0.5 });
  return { tx, ty, zoom: cam.zoom };
}
