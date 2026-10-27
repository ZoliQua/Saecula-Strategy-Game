import type { ArchStyleId } from '../../../config/civs';
import type { BuildingType } from '../../../types';
import type { WindowLook } from '../isoProps';
import type { RoofMaterial } from '../roofCover';

/*
 * ArchStyle (M4 design decision 3): the data that turns one painter
 * family (roman / medieval / baroque layouts) into a civ's age style —
 * palette, roof profile, ornament toggles, heraldic charge and noise
 * salt. The Hungarian styles (hungarianStyles.ts) reproduce the M3 art
 * exactly; other civs swap values and, where a family's layout is not
 * enough, add painters of their own.
 */

/** Colours one age style paints with (0xRRGGBB). Each family reads the slots it uses. */
export interface ArchPalette {
  /** Rubble / field stone walls, plinths, foundations. */
  readonly stone: number;
  /** Dressed stone: steps, arch surrounds, stone towers. */
  readonly ashlar: number;
  /** Rendered walls (plaster, daub, ochre). */
  readonly plaster: number;
  /** Second render tone (the baroque smithy's deep ochre). */
  readonly plasterDeep: number;
  /** Structural timber: framing, posts, hoardings, sheds. */
  readonly timber: number;
  /** Dark wood: log walls, plank barns. */
  readonly darkWood: number;
  /** Boarding: gable boards, galleries, plank walls. */
  readonly board: number;
  /** Brick walls. */
  readonly brick: number;
  /** Unrendered brick of shells under construction (the Wonder's early stages). */
  readonly rawBrick: number;
  /** Brick of forge / smithy stacks. */
  readonly stack: number;
  /** Plank walls of sheds and ranges. */
  readonly planks: number;
  /** Door leaves: main entrances, heavy gates (barracks, stalls), workshop doors. */
  readonly doors: DoorColours;
  /** Main roof cover. */
  readonly roof: number;
  /** Secondary roof cover (slate mansards and sheds). */
  readonly roofAlt: number;
  /** Thatch / reed roofs. */
  readonly thatch: number;
  /** Mouldings, pilasters, cornices, window surrounds. */
  readonly trim: number;
  /** Turned helms, domes, cupolas (copper, verdigris). */
  readonly metal: number;
  /** Window shutters and painted doors. */
  readonly shutter: number;
  /** Window frame and glazing (IsoPainter.window). */
  readonly window: WindowLook;
  /** Per-type main roof colour where it is not `roof` (the Roman set's varied roofs). */
  readonly roofs: Readonly<Partial<Record<BuildingType, number>>>;
}

export interface DoorColours {
  readonly main: number;
  readonly gate: number;
  readonly work: number;
}

/** How the main roofs of a style are pitched and shaped (styledRoofs.ts). */
export interface RoofProfile {
  /** Multiplies every main-roof rise (1 = the family's own pitch). */
  readonly pitch: number;
  /** Multiplies every main-roof eave overhang (1 = the family's own). */
  readonly eave: number;
  /** 'native' keeps each painter's hip / gable / mansard; 'hip' or 'gable' forces that form. */
  readonly form: 'native' | 'hip' | 'gable';
  /** Cover painted on main roofs; undefined keeps each painter's own material. */
  readonly material?: RoofMaterial;
}

/** Decorations a style can switch off (true = painted where the family's layout has one). */
export interface Ornaments {
  /** Domestic chimneys (houses, town halls); forge and furnace stacks always stay. */
  readonly chimneys: boolean;
  /** Timber framing on whitewashed storeys. */
  readonly halfTimber: boolean;
  /** Corner quoins. */
  readonly quoins: boolean;
  /** Pilasters on rendered blocks. */
  readonly pilasters: boolean;
  /** Dormers on mansard roofs. */
  readonly dormers: boolean;
  /** Boarded sun-ray gables (napsugaras oromzat). */
  readonly boardedGables: boolean;
}

/** Heraldic charge on crests and shields (facade.ts crest). */
export type CrestCharge = 'double_cross' | 'st_george';

/**
 * Painter family: which layout set paints the style (registry.ts
 * ARCH_FAMILIES). A civ with bespoke buildings adds a family id whose
 * factory spreads an existing family and overrides types, e.g.
 * `tudor: (s) => ({ ...medievalArt(s), town_center: normanKeep(s) })`.
 */
export type ArchFamily = 'roman' | 'medieval' | 'baroque' | 'romano_british' | 'tudor';

export interface ArchStyle {
  readonly id: ArchStyleId;
  readonly family: ArchFamily;
  readonly palette: ArchPalette;
  readonly roof: RoofProfile;
  readonly ornaments: Ornaments;
  readonly charge: CrestCharge;
  /** Added to every painter seed; 0 for the Hungarian styles so their noise stays identical. */
  readonly seedSalt: number;
  /**
   * Extra canvas height (art px) for taller silhouettes; trimmed away when
   * unused. Size it for the pitch: style.test.ts checks that every
   * registered style's volume fits its canvas.
   */
  readonly headroom: number;
}

/** Main roof colour of a building type in a style. */
export function roofOf(s: ArchStyle, type: BuildingType): number {
  return s.palette.roofs[type] ?? s.palette.roof;
}
