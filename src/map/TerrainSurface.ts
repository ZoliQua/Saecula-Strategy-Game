import Phaser from 'phaser';
import { TERRAIN_LOOK } from '../config/visual';
import { LightManager } from '../iso/art/lighting/LightManager';
import { shadowVector, sunAt, sunDirection } from '../iso/art/lighting/sun';
import type { Relief } from './cliffRelief';
import { packSurfaceMask } from './surfaceMask';
import { TERRAIN_SURFACE_FRAG } from './terrainSurfaceShader';
import type { WaterMask } from './waterMask';

/** Above the baked terrain chunks (−1000), below cast shadows (−990) and everything standing. */
const SURFACE_DEPTH = -995;

let seq = 0;

/**
 * One shader quad over the whole map that animates the water and draws
 * the cliff plateaus' sun shadows (see terrainSurfaceShader.ts). The
 * baked chunks keep a static water colour underneath, so the look
 * degrades gracefully without WebGL.
 */
export class TerrainSurface {
  private readonly shader: Phaser.GameObjects.Shader | null = null;
  private readonly key = `terrain_surface_${seq++}`;
  /** Mask texture bytes (memory report). */
  readonly bytes: number = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    map: { width: number; height: number },
    res: number,
    relief: Relief | null,
    water: WaterMask | null,
  ) {
    if (scene.game.renderer.type !== Phaser.WEBGL || (!relief && !water)) return;
    if ((relief && relief.res !== res) || (water && water.res !== res)) throw new Error('Surface layers must share one grid');
    const gridCols = map.width * res + 1;
    const gridRows = map.height * res + 1;
    const canvas = document.createElement('canvas');
    canvas.width = gridCols;
    canvas.height = gridRows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(gridCols, gridRows);
    img.data.set(packSurfaceMask(gridCols, gridRows, relief, water, TERRAIN_LOOK.waterDeepTiles));
    ctx.putImageData(img, 0, 0);
    scene.textures.addCanvas(this.key, canvas);
    this.bytes = gridCols * gridRows * 4;

    const pad = 64;
    const x = bounds.minX - pad;
    const y = bounds.minY - pad - (relief?.maxHeight ?? 0);
    const w = bounds.maxX - bounds.minX + pad * 2;
    const h = bounds.maxY - bounds.minY + pad * 2 + (relief?.maxHeight ?? 0);
    const base = new Phaser.Display.BaseShader(this.key, TERRAIN_SURFACE_FRAG, undefined, {
      uTime: { type: '1f', value: 0 },
      uOrigin: { type: '2f', value: { x, y } },
      uGrid: { type: '2f', value: { x: gridCols, y: gridRows } },
      uRes: { type: '1f', value: res },
      uMaxH: { type: '1f', value: relief?.maxHeight ?? 0 },
      uSunDir: { type: '3f', value: { x: 0, y: 0.866, z: 0.5 } },
      uGlintDir: { type: '3f', value: { x: 0, y: 0.5, z: -0.866 } },
      uSunColor: { type: '3f', value: { x: 0.6, y: 0.6, z: 0.55 } },
      uAmbient: { type: '3f', value: { x: 0.6, y: 0.6, z: 0.62 } },
      uShadow: { type: '4f', value: { x: 0, y: 0, z: 0, w: 0 } },
      uLayers: { type: '2f', value: { x: relief ? 1 : 0, y: water ? 1 : 0 } },
    });
    const shader = scene.add.shader(base, x, y, w, h).setOrigin(0, 0).setDepth(SURFACE_DEPTH);
    shader.setSampler2D('iChannel0', this.key, 0, {
      wrapS: 'clamp_to_edge',
      wrapT: 'clamp_to_edge',
      minFilter: 'linear',
      magFilter: 'linear',
    });
    this.shader = shader;
  }

  /** Per frame: clock, sun and shadow direction. */
  update(timeMs: number): void {
    const s = this.shader;
    if (!s) return;
    const sun = LightManager.of(this.scene)?.sun ?? sunAt(0.3);
    const sv = shadowVector(sun);
    s.setUniform('uTime.value', timeMs / 1000);
    s.setUniform('uSunDir.value', { x: sun.dir[0], y: sun.dir[1], z: sun.dir[2] });
    // Glints mirror the sun behind the scene, pulled towards the view axis so they show at any hour.
    const g = sunDirection(270 - (sun.azimuthDeg - 90) * 0.35, Math.max(18, sun.elevationDeg));
    s.setUniform('uGlintDir.value', { x: g[0], y: g[1], z: g[2] });
    s.setUniform('uSunColor.value', { x: sun.color[0], y: sun.color[1], z: sun.color[2] });
    s.setUniform('uAmbient.value', { x: sun.ambient[0], y: sun.ambient[1], z: sun.ambient[2] });
    s.setUniform('uShadow.value', { x: sv.x, y: sv.y, z: TERRAIN_LOOK.cliffShadowAlpha * sv.strength, w: 0 });
  }

  destroy(): void {
    this.shader?.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}
