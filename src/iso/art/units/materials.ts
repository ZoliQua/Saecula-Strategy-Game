/**
 * Surface materials of the unit rig and the shared colour palette.
 * Colours are albedo (lighting shades them at runtime); `team` parts
 * are painted into the team-colour mask instead and tinted per player.
 */
export interface Material {
  readonly color: number;
  /** Painted into the team mask (tinted with the player colour at runtime). */
  readonly team?: boolean;
  /** Baked specular strength 0..1 (steel, bronze, gold). */
  readonly metal?: number;
  /** Stripes along the primitive's main axis (armour bands, barrel rings, quilting). */
  readonly bands?: { readonly count: number; readonly color?: number; readonly width?: number };
}

/** Collects the materials one figure uses; primitives refer to them by index. */
export class MaterialTable {
  readonly list: Material[] = [];
  private readonly ids = new Map<Material, number>();

  id(m: Material): number {
    let i = this.ids.get(m);
    if (i === undefined) {
      i = this.list.length;
      this.list.push(m);
      this.ids.set(m, i);
    }
    return i;
  }
}

const solid = (color: number): Material => ({ color });
const metal = (color: number, shine: number): Material => ({ color, metal: shine });

export const M = {
  skin: solid(0xe6b08a),
  eye: solid(0x22160e),
  hair: solid(0x5a3a22),
  team: { color: 0xffffff, team: true } as Material,
  teamQuilted: { color: 0xffffff, team: true, bands: { count: 5, width: 0.1 } } as Material,
  leather: solid(0x6b4526),
  darkLeather: solid(0x45301e),
  boot: solid(0x3a2618),
  blackBoot: solid(0x23201f),
  wood: solid(0x8a5a32),
  darkWood: solid(0x5a3a22),
  straw: solid(0xe0bd64),
  strawDark: solid(0xc49e48),
  linen: solid(0xe6ddc8),
  white: solid(0xece8de),
  black: solid(0x2a2830),
  feather: solid(0xf0ece2),
  crest: solid(0xb8362a),
  string: solid(0xf0e8d0),
  steel: metal(0xb9bec6, 0.9),
  darkSteel: metal(0x7e848e, 0.7),
  mail: { color: 0x9aa0a8, metal: 0.45, bands: { count: 7, color: 0x6c7078, width: 0.3 } } as Material,
  lorica: { color: 0xbcc0c6, metal: 0.85, bands: { count: 6, color: 0x6e727a, width: 0.14 } } as Material,
  bronze: { color: 0xc4954a, metal: 0.9, bands: { count: 4, color: 0x7a5424, width: 0.08 } } as Material,
  brass: metal(0xd4a84e, 0.8),
  gold: metal(0xe8c35a, 0.9),
  iron: metal(0x55585e, 0.5),
  trousers: {
    brown: solid(0x6b4f33),
    olive: solid(0x4f5a35),
    grey: solid(0x4a4a52),
    dark: solid(0x3a3a44),
    leather: solid(0x5a4632),
  },
  horse: {
    bay: solid(0xa0703f),
    grey: solid(0xe0d8cc),
    darkBay: solid(0x5e3b22),
    mane: solid(0x2e1e14),
    lightMane: solid(0xb8ae9e),
    hoof: solid(0x2a2420),
  },
} as const;
