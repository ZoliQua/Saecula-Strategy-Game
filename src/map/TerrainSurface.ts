import Phaser from 'phaser';
import { TERRAIN_LOOK } from '../config/visual';
import { LightManager } from '../iso/art/lighting/LightManager';
import { sunAt } from '../iso/art/lighting/sun';
import type { Relief } from './cliffRelief';
import { surfaceLighting } from './surfaceLighting';
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
      uLit: { type: '1f', value: 1 },
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

  /** Per frame: clock, sun and shadow direction (fixed, shadowless daylight when the scene is unlit). */
  update(timeMs: number): void {
    const s = this.shader;
    if (!s) return;
    const lights = LightManager.of(this.scene);
    const u = surfaceLighting(lights?.sun ?? sunAt(0.3), lights?.active ?? false, TERRAIN_LOOK.cliffShadowAlpha);
    const v3 = (v: readonly number[]) => ({ x: v[0] ?? 0, y: v[1] ?? 0, z: v[2] ?? 0 });
    s.setUniform('uTime.value', timeMs / 1000);
    s.setUniform('uSunDir.value', v3(u.sunDir));
    s.setUniform('uGlintDir.value', v3(u.glintDir));
    s.setUniform('uSunColor.value', v3(u.sunColor));
    s.setUniform('uAmbient.value', v3(u.ambient));
    s.setUniform('uShadow.value', { x: u.shadow[0], y: u.shadow[1], z: u.shadow[2], w: 0 });
    s.setUniform('uLit.value', u.lit);
  }

  destroy(): void {
    this.shader?.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}
