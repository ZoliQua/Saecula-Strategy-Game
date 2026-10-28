import type { ArchStyleId } from '../../../config/civs';
import type { BuildingType } from '../../../types';
import type { WindowLook } from '../isoProps';
import type { RoofMaterial } from '../roofCover';
import type { CrestCharge } from './charges';
import type { FrameSchool } from './kits/halfTimber';

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
  /** Sentry boxes' field and chevron colours (the baroque barracks); default Habsburg yellow and black. */
  readonly sentry?: { readonly field: number; readonly chevron: number };
  /** Masonry of free-standing towers where a family has its own default (the English Norman tower's ragstone). */
  readonly towerStone?: number;
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
  /**
   * 'native' keeps each painter's hip / gable / mansard; 'hip' or 'gable'
   * forces that form; 'halfHip' turns the family's gables into half-hips
   * (Krüppelwalm, kits/halfHip.ts) and keeps its hips; 'pavilion' turns
   * every main roof (hips, gables, mansards) into a tall truncated hip
   * with a leaded crest (kits/pavilionRoof.ts).
   */
  readonly form: 'native' | 'hip' | 'gable' | 'halfHip' | 'pavilion';
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
  /** Curved (voluted) street gable on the baroque house; default true. */
  readonly streetGables?: boolean;
}

/**
 * Shared kits a style swaps into the spots its family already has
 * (architecture/kits/). Every field is optional: absent keeps the
 * family's own painting, so styles written before a kit existed paint
 * exactly as before.
 */
export interface StyleKits {
  /** Carpentry of framed storeys and gables (kits/halfTimber.ts); default 'tudor'. */
  readonly framing?: FrameSchool;
  /** Framed upper storeys overhang the storey below; default true. */
  readonly jetties?: boolean;
  /**
   * Stepped (crow-step) gable ends on main gable roofs (kits/steppedGable.ts),
   * in the wall's own render ('wall') or in brick with blind niches ('brick').
   */
  readonly steppedGables?: 'wall' | 'brick';
  /** Turret caps, keep tops and roof cupolas become needle spires (kits/needleSpire.ts). */
  readonly needleSpires?: boolean;
  /** The Roman family's plastered blocks get a framed upper storey over a stone ground storey. */
  readonly framedUpper?: boolean;
  /** Colonnaded porches with a pedimented middle on the Roman family's barracks, stable and range fronts (kits/porticus.ts). */
  readonly porticus?: boolean;
  /** Round turrets with conical slate caps in the families' turret spots (kits/pepperpot.ts). */
  readonly pepperpots?: boolean;
  /** The courtyard families' age reading (CourtyardKits); absent = their first-age reading. */
  readonly courtyard?: CourtyardKits;
}

/**
 * How the courtyard families (whitewashed or brick blocks round patios,
 * kits/patio.ts) dress their layouts in one age. Main roofs follow the
 * style's roof profile: 'native' keeps flat terraces with parapets on
 * dwellings and low tile on halls, a forced 'hip' puts low hips on every
 * block. Arch heads follow the window look (`arch`).
 */
export interface CourtyardKits {
  /** Wall finish: lime whitewash over a painted plinth, or Toledan bond (rubble panels laced with brick). */
  readonly walls: 'whitewash' | 'toledan';
  /** Door and gate surrounds: granite voussoirs, a brick alfiz framing the arch, or an ochre plateresque frontispiece. */
  readonly portal: 'voussoir' | 'alfiz' | 'plateresque';
  /** Glazed tile (azulejo) bands under parapets and round towers. */
  readonly tileBands: boolean;
  /** Stepped merlons on the parapets of flat roofs. */
  readonly merlons: boolean;
  /** What rises in the layouts' tower spots (house, barracks): nothing, square brick towers with glazed pyramid caps, or whitewashed miradors under a domed garita. */
  readonly towers: 'none' | 'brick' | 'mirador';
  /** Bell gables (espadañas) on the ridges of halls and sheds. */
  readonly espadanas: boolean;
  /** The town centre of the later family: a Castilian keep with bartizans, or a bell-gabled cabildo on its plaza. */
  readonly civic: 'keep' | 'cabildo';
  /** Wrought-iron balconies on upper windows. */
  readonly balconies: boolean;
  /** Water in the patios: a Roman impluvium pool, a well head, or a basin fountain. */
  readonly water: 'impluvium' | 'well' | 'fountain';
  /** Planting of the farm: an olive grove with a threshing floor, an irrigated huerta with a noria, or a vineyard. */
  readonly field: 'olives' | 'huerta' | 'vines';
}

/** Heraldic charge on crests and shields (charges.ts, painted by facade.ts crest). */
export type { CrestCharge } from './charges';

/**
 * Painter family: which layout set paints the style (registry.ts
 * ARCH_FAMILIES). A civ with bespoke buildings adds a family id whose
 * factory spreads an existing family and overrides types, e.g.
 * `gothic: (s) => ({ ...medievalArt(s), town_center: gothicHall(s) })`.
 *
 * Families and style ids stay two unions (M4 review M7): a family is a
 * set of painters, a style (ArchStyleId, config/civs.ts) is one civ's
 * age reading of a family — palette, roof profile, ornaments, charge,
 * seed salt. Several styles may ride one family (M5: German `fachwerk`
 * on `tudor`, French `classicisme` on `baroque`), so a new civ adds
 * style ids freely and a family id only where its silhouette needs
 * painters of its own.
 */
export type ArchFamily =
  | 'roman'
  | 'medieval'
  | 'baroque'
  | 'romano_british'
  | 'tudor'
  | 'georgian'
  /** Roman layouts with a Porta Nigra twin-tower gate as town centre and a Limes watchtower (German age 1). */
  | 'porta_nigra'
  /** Georgian layouts with the Speyer Kaiserdom as Wonder (German age 3). */
  | 'kaiserdom'
  /** Roman layouts with a Maison Carrée temple-forum town centre and a round Gallo-Roman tower (French age 1). */
  | 'maison_carree'
  /** Medieval layouts with pepperpot turrets, a Loire château town centre and a machicolated round tower (French age 2). */
  | 'gothic_fr'
  /** Baroque layouts with an hôtel de ville town centre, a belvedere tower and Versailles as Wonder (French age 3). */
  | 'versailles'
  /** Courtyard layouts: whitewashed flat-roofed blocks round patios, a forum behind an aqueduct, a Roman lighthouse tower (Spanish age 1). */
  | 'hispania'
  /** Courtyard layouts with a keep (or, with espadañas, a bell-gabled town hall) town centre, square towers, a foundry and the Alhambra (Spanish ages 2-3). */
  | 'mudejar';

/**
 * Families whose painters size their canvases from the style
 * (`headroom`, roof pitch): the parametric Hungarian layouts that cheap
 * civ styles ride. Bespoke families size their own canvases, so they
 * must fit whatever headroom a style sets (style.test.ts).
 */
export const PARAMETRIC_FAMILIES: readonly ArchFamily[] = ['roman', 'medieval', 'baroque', 'porta_nigra', 'maison_carree', 'gothic_fr', 'versailles'];

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
   * unused. Read by the parametric families (PARAMETRIC_FAMILIES) only.
   * Size it for the pitch: style.test.ts checks that every registered
   * style's volume fits its canvas.
   */
  readonly headroom: number;
  /** Kit substitutions (StyleKits); absent = none. */
  readonly kits?: StyleKits;
}

/** Main roof colour of a building type in a style. */
export function roofOf(s: ArchStyle, type: BuildingType): number {
  return s.palette.roofs[type] ?? s.palette.roof;
}
