import type Phaser from 'phaser';
import { HILL } from '../../config/balance';
import { HILL_MARK } from '../../config/visual';
import { hillState } from '../../game/hill';
import { hillLook, type HillLook, type HillStatus } from '../../game/hillClocks';
import type { PlayerManager } from '../../game/PlayerManager';
import { ART_SCALE } from '../../iso/art/canvas';
import { lit } from '../../iso/art/lighting/LightManager';
import { tileToScreen, type TileCoord } from '../../iso/coordinates';
import { tileDepth } from '../../iso/depth';
import { FX_KEYS } from '../../iso/textures';
import { FOG_UNEXPLORED, type FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { EcsWorld } from '../world';
import { dashes, hillOutline } from './hillFx/ring';

const M = HILL_MARK;

/** The cloth of each state: its texture, whether it waves, how high it hangs and where it is tied. */
const CLOTH = {
  empty: { key: FX_KEYS.hillFurled, waves: false, lift: M.furled.lift, origin: [0.5, 0] },
  held: { key: FX_KEYS.hillFlag, waves: true, lift: M.flag.lift, origin: [0, M.flag.top / M.flag.height] },
  contested: { key: FX_KEYS.hillTorn, waves: true, lift: M.tornLift, origin: [0, M.flag.top / M.flag.height] },
} as const satisfies Record<HillStatus, { key: string; waves: boolean; lift: number; origin: readonly [number, number] }>;

interface Standard {
  readonly tile: TileCoord;
  readonly pole: Phaser.GameObjects.Image;
  readonly cloth: Phaser.GameObjects.Image;
  readonly swords: Phaser.GameObjects.Image;
}

interface Proxies {
  readonly base: Phaser.GameObjects.Graphics;
  readonly glow: Phaser.GameObjects.Graphics;
  readonly line: Phaser.GameObjects.Graphics;
  readonly outline: readonly TileCoord[];
  readonly standards: readonly Standard[];
}

/**
 * The hill in the world (M19): a ring on the ground round the zone and a
 * standard near each of its four corners, in the holder's colour. The
 * centre may be a tree or a rock, so nothing stands there. Render proxies
 * rebuilt from the world; they show the public state only (no unit) and
 * lie under the fog, whose unexplored land also hides the standards.
 */
export class HillMarkerSystem {
  private proxies: Proxies | null = null;
  private shown: HillLook | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
    private readonly map: MapData,
    private readonly players: PlayerManager,
    private readonly fog: FogOfWarData,
    /** The clocks wait (treaty): the ring stops breathing. */
    private readonly waiting: () => boolean,
  ) {}

  /** `time` is real time (ms): the flags and the glow only. */
  update(time: number): void {
    const hill = hillState(this.world);
    if (!hill) return;
    const proxies = (this.proxies ??= this.create(hill.centre));
    const look = hillLook(hill, this.players);
    if (look.status !== this.shown?.status || look.color !== this.shown.color) {
      this.shown = look;
      this.drawRing(proxies, look);
      this.dress(proxies.standards, look);
    }
    const breath = this.waiting() ? 0 : Math.sin((time / M.breatheMs) * Math.PI * 2);
    proxies.glow.setAlpha((1 + M.breatheDepth * breath) / (1 + M.breatheDepth));
    const cloth = CLOTH[look.status];
    proxies.standards.forEach(({ tile, pole, cloth: image, swords }, i) => {
      const seen = this.fog.get(tile.tx, tile.ty) !== FOG_UNEXPLORED;
      pole.setVisible(seen);
      image.setVisible(seen);
      swords.setVisible(seen && look.status === 'contested');
      if (cloth.waves) image.setFrame((Math.floor(time / M.flag.frameMs) + i) % M.flag.frames);
    });
  }

  destroy(): void {
    const p = this.proxies;
    if (!p) return;
    for (const g of [p.base, p.glow, p.line]) g.destroy();
    for (const s of p.standards) for (const image of [s.pole, s.cloth, s.swords]) image.destroy();
    this.proxies = null;
    this.shown = null;
  }

  private create(centre: TileCoord): Proxies {
    const { depths } = M.ring;
    const scale = 1 / ART_SCALE;
    const open = (t: TileCoord): boolean => this.map.isPassable(t.tx, t.ty) && this.map.getTile(t.tx, t.ty) === TERRAIN.grass;
    const standards = standardTiles(centre, open).map((tile): Standard => {
      const { sx, sy } = tileToScreen(tile);
      const depth = tileDepth(tile) + M.bannerDepth;
      const image = (key: string, above: number, lift: number) =>
        lit(this.scene.add.image(sx, sy, key).setScale(scale)).setPosition(sx, sy - lift).setDepth(depth + above * M.partDepth);
      return {
        tile,
        pole: image(FX_KEYS.hillPole, 0, 0).setOrigin(0.5, M.pole.foot / M.pole.height),
        cloth: image(FX_KEYS.hillFurled, 1, M.furled.lift),
        swords: image(FX_KEYS.hillSwords, 2, M.swords.lift).setOrigin(0.5, 0.5),
      };
    });
    return {
      base: this.scene.add.graphics().setDepth(depths.base),
      glow: this.scene.add.graphics().setDepth(depths.glow),
      line: this.scene.add.graphics().setDepth(depths.line),
      outline: hillOutline(centre),
      standards,
    };
  }

  private drawRing({ base, glow, line, outline }: Proxies, { status, color }: HillLook): void {
    const R = M.ring;
    const style = R[status];
    for (const g of [base, glow, line]) g.clear();
    const tint = color ?? M.linen;
    base.fillStyle(status === 'contested' ? M.ink : tint, style.fill);
    trace(base, outline, true);
    base.fillPath();
    if (status === 'contested') {
      // Dark under the light dashes: the band alternates, whatever the ground.
      base.lineStyle(R.contested.band.width, M.ink, R.contested.band.alpha);
      trace(base, outline, true);
      base.strokePath();
    }
    const paths = status === 'held' ? [outline] : dashes(outline, R[status].dash, R[status].gap);
    const closed = status === 'held';
    const stroke = (g: Phaser.GameObjects.Graphics, width: number, ink: number, alpha: number): void => {
      g.lineStyle(width, ink, alpha);
      for (const path of paths) {
        trace(g, path, closed);
        g.strokePath();
      }
    };
    stroke(base, style.edge, M.ink, R.shadeAlpha);
    if (status !== 'empty') stroke(glow, R.glow.width, tint, R.glow.alpha);
    stroke(line, style.width, tint, style.alpha);
    if (status === 'held') stroke(line, R.held.sheen.width, M.linen, R.held.sheen.alpha);
  }

  private dress(standards: readonly Standard[], { status, color }: HillLook): void {
    const { key, waves, lift, origin } = CLOTH[status];
    for (const { tile, cloth } of standards) {
      const { sx, sy } = tileToScreen(tile);
      cloth.setTexture(key, waves ? 0 : undefined).setOrigin(origin[0], origin[1]).setPosition(sx, sy - lift);
      if (color === null) cloth.clearTint();
      else cloth.setTint(color);
    }
  }
}

/** Starts a path through `points` (tile space) on `g`. */
function trace(g: Phaser.GameObjects.Graphics, points: readonly TileCoord[], closed: boolean): void {
  g.beginPath();
  points.forEach((point, i) => {
    const { sx, sy } = tileToScreen(point);
    if (i === 0) g.moveTo(sx, sy);
    else g.lineTo(sx, sy);
  });
  if (closed) g.closePath();
}

/** For each corner of the zone, the open tile of its quarter nearest the corner (the corner itself if none). */
function standardTiles(centre: TileCoord, open: (tile: TileCoord) => boolean): TileCoord[] {
  const half = Math.floor(HILL.size / 2);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) => {
    const corner = { tx: centre.tx + sx * half, ty: centre.ty + sy * half };
    const away = (t: TileCoord): number => Math.abs(t.tx - corner.tx) + Math.abs(t.ty - corner.ty);
    const quarter: TileCoord[] = [];
    for (let dy = 1; dy <= half; dy++) {
      for (let dx = 1; dx <= half; dx++) quarter.push({ tx: centre.tx + sx * dx, ty: centre.ty + sy * dy });
    }
    quarter.sort((a, b) => away(a) - away(b) || a.ty - b.ty || a.tx - b.tx);
    return quarter.find(open) ?? corner;
  });
}
