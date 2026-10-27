import Phaser from 'phaser';

/*
 * DEV ONLY: the showcases' silhouette mode (M5 Global Constraint 11) —
 * every sprite solid black on a pale ground, unlit and without shadows,
 * so a civ must be recognisable by outline alone. Turn it on with
 * `silhouette: true` in __showBuildings / __showUnits, or `?silhouette=1`
 * in the page URL.
 */

/** Pale paper ground that black outlines read against. */
export const SILHOUETTE_BACKGROUND = '#e9e4d8';

/** Whether a showcase runs in silhouette mode (its option, else the page URL). */
export function silhouetteRequested(option: boolean | undefined): boolean {
  if (option !== undefined) return option;
  return typeof location !== 'undefined' && new URLSearchParams(location.search).get('silhouette') === '1';
}

/** Turns the scene's sprites and images into flat black silhouettes and hides everything else (ground plots, markers). */
export function silhouetteScene(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(SILHOUETTE_BACKGROUND);
  for (const child of scene.children.list) {
    if (child instanceof Phaser.GameObjects.Image || child instanceof Phaser.GameObjects.Sprite) {
      child.resetPipeline();
      child.setTintFill(0x000000).setAlpha(1);
    } else if ('setVisible' in child && typeof child.setVisible === 'function') {
      (child as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false);
    }
  }
}
