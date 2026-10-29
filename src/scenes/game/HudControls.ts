import Phaser from 'phaser';
import { audio } from '../../audio/AudioManager';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import { villagerActivity } from '../../stats/villagerActivity';
import { onCommand } from '../../ui/events';
import { uiStore } from '../../ui/store';
import type { CameraController } from '../systems/CameraController';
import { nextHome } from './homeTargets';
import { onKeyAction } from './KeyActions';

export interface HudControlDeps {
  readonly world: EcsWorld;
  readonly selection: SelectionSystem;
  readonly camera: CameraController;
  readonly humanId: number;
}

/**
 * The HUD's camera buttons and side panel (M7 Decisions 9, 10), game side:
 * Haza and the `home` key step through the human's town centres, the
 * minimap's ± zoom one notch, a villager row selects those villagers, and
 * the `scorePanel` / `villagerPanel` keys fold and switch the side panel.
 * Unwired on scene shutdown.
 */
export function wireHudControls(scene: Phaser.Scene, d: HudControlDeps): void {
  let lastHome: number | null = null;
  const goHome = (): void => {
    const target = nextHome(d.world, d.humanId, lastHome);
    if (!target) return;
    lastHome = target.id;
    d.camera.centerOnTile(target.tile);
  };
  const offCommands = onCommand((cmd) => {
    if (cmd.type === 'camera-home') goHome();
    else if (cmd.type === 'camera-zoom') d.camera.zoomStep(cmd.dir);
    else if (cmd.type === 'select-villagers') {
      const ids = villagerActivity(d.world, d.humanId)[cmd.activity];
      if (d.selection.selectIds(ids) > 0) audio().playSFX('unit_select');
    }
  });
  onKeyAction(scene, 'home', goHome);
  onKeyAction(scene, 'scorePanel', (e) => {
    if (!e.repeat) uiStore.getState().toggleSidePanel();
  });
  onKeyAction(scene, 'villagerPanel', (e) => {
    if (e.repeat) return;
    const ui = uiStore.getState();
    if (ui.sidePanel.open && ui.sidePanel.view === 'villagers') ui.toggleSidePanel();
    else ui.showSidePanel('villagers');
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, offCommands);
}
