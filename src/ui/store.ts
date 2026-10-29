import { createStore, type StoreApi } from 'zustand/vanilla';
import { DEFAULT_CIV } from '../config/civs';
import type { WonderClockInfo } from '../game/wonderClocks';
import type { VillagerActivity } from '../stats/villagerActivity';
import type {
  AgeId,
  BuildingType,
  CivId,
  Population,
  Resources,
  TechId,
  UnitType,
} from '../types';

export interface TrainingEntryInfo {
  unitType: UnitType;
  progress: number; // 0..1
}

export interface SelectedUnitInfo {
  kind: 'unit';
  id: number;
  ownerId: number;
  unitType: UnitType;
  /** The owner's civ (which civ's look the portrait shows). */
  civ: CivId;
  hp: { current: number; max: number };
  tile: { tx: number; ty: number };
  carrying?: { type: 'food' | 'wood' | 'gold'; amount: number };
}

export interface SelectedBuildingInfo {
  kind: 'building';
  id: number;
  ownerId: number;
  buildingType: BuildingType;
  /** The owner's civ (queue portraits and the owner badge). */
  civ: CivId;
  /** Texture the building is drawn with (age style + team colour), for the portrait. */
  textureKey?: string;
  hp: { current: number; max: number };
  tile: { tx: number; ty: number };
  constructionProgress?: number;
  /** The owner's only standing town centre: deleting it loses the match (SelectionSystem). */
  lastTownCenter?: boolean;
  trainable?: readonly UnitType[];
  queue?: readonly TrainingEntryInfo[];
  /** Technologies this building type researches. */
  researchable?: readonly TechId[];
  research?: { techId: TechId; progress: number };
}

export interface SelectedResourceInfo {
  kind: 'resource';
  id: number;
  resourceType: 'food' | 'wood' | 'gold';
  amount: number;
  maxAmount: number;
  tile: { tx: number; ty: number };
}

export type SelectedEntityInfo =
  | SelectedUnitInfo
  | SelectedBuildingInfo
  | SelectedResourceInfo;

/** One row of the side panel's score view (HudSync, once a second). */
export interface ScoreRowInfo {
  playerId: number;
  civ: CivId;
  color: number;
  isHuman: boolean;
  score: number;
  defeated: boolean;
}

export type SidePanelView = 'score' | 'villagers';

/** The right-edge side panel: shown or folded to its tab, and which view (display state, never saved). */
export interface SidePanelState {
  open: boolean;
  view: SidePanelView;
}

export interface UiState {
  resources: Resources;
  population: Population;
  currentAge: AgeId;
  /** The human's civ (which civ's art the HUD pictures show). */
  civ: CivId;
  /** Technologies the human has finished. */
  researchedTechs: readonly TechId[];
  /** Limited buildings (wonder) the human already owns or is building. */
  uniqueBuilt: readonly BuildingType[];
  selectedEntity: SelectedEntityInfo | null;
  /** How many entities are selected (primary is `selectedEntity`). */
  selectionCount: number;
  placementBuilding: BuildingType | null;
  /** Wall line being dragged: segments to be built and their total wood cost. */
  wallPreview: { segments: number; wood: number } | null;
  /** In-game clock for the HUD (display only). */
  gameTimeMs: number;
  /** Running Wonder countdowns, soonest first (empty in conquest-only matches). */
  wonders: readonly WonderClockInfo[];
  /** Building whose delete button is armed (the next press deletes it), or null. */
  deleteArmedId: number | null;
  /** The refund percentage locked when the delete was armed: shown on the button and paid on confirm. */
  deleteArmedPct: number;
  sidePanel: SidePanelState;
  /** Every player's score, highest first. */
  scores: readonly ScoreRowInfo[];
  /** The human's villagers per activity. */
  villagerCounts: Readonly<Record<VillagerActivity, number>>;
}

export interface UiActions {
  setResources: (r: Partial<Resources>) => void;
  setPopulation: (p: Partial<Population>) => void;
  setAge: (age: AgeId) => void;
  setCiv: (civ: CivId) => void;
  setResearchedTechs: (techs: readonly TechId[]) => void;
  setUniqueBuilt: (types: readonly BuildingType[]) => void;
  setSelectedEntity: (info: SelectedEntityInfo | null, count?: number) => void;
  setPlacementBuilding: (type: BuildingType | null) => void;
  setWallPreview: (preview: { segments: number; wood: number } | null) => void;
  setGameTime: (ms: number) => void;
  setWonders: (wonders: readonly WonderClockInfo[]) => void;
  /** Arms the delete of building `id` with the refund `refundPct` locked (null disarms). */
  setDeleteArmed: (id: number | null, refundPct?: number) => void;
  /** Opens the side panel on `view`. */
  showSidePanel: (view: SidePanelView) => void;
  /** Folds an open panel to its tab, or opens a folded one on its last view. */
  toggleSidePanel: () => void;
  setScores: (rows: readonly ScoreRowInfo[]) => void;
  setVillagerCounts: (counts: Readonly<Record<VillagerActivity, number>>) => void;
}

export type UiStore = UiState & UiActions;

const INITIAL: UiState = {
  resources: { food: 200, wood: 200, gold: 100 },
  population: { current: 3, cap: 10 },
  currentAge: 1,
  civ: DEFAULT_CIV,
  researchedTechs: [],
  uniqueBuilt: [],
  selectedEntity: null,
  selectionCount: 0,
  placementBuilding: null,
  wallPreview: null,
  gameTimeMs: 0,
  wonders: [],
  deleteArmedId: null,
  deleteArmedPct: 0,
  sidePanel: { open: true, view: 'score' },
  scores: [],
  villagerCounts: { food: 0, wood: 0, gold: 0, build: 0, idle: 0, other: 0 },
};

export function createUiStore(): StoreApi<UiStore> {
  return createStore<UiStore>((set) => ({
    ...INITIAL,
    setResources: (r) =>
      set((state) => ({ resources: { ...state.resources, ...r } })),
    setPopulation: (p) =>
      set((state) => ({ population: { ...state.population, ...p } })),
    setAge: (age) => set({ currentAge: age }),
    setCiv: (civ) => set({ civ }),
    setResearchedTechs: (techs) => set({ researchedTechs: techs }),
    setUniqueBuilt: (types) => set({ uniqueBuilt: types }),
    // A different selection disarms a pending delete (a refresh of the same entity keeps it).
    setSelectedEntity: (info, count) =>
      set((state) => ({
        selectedEntity: info,
        selectionCount: count ?? (info ? 1 : 0),
        deleteArmedId: info && info.id === state.deleteArmedId ? state.deleteArmedId : null,
      })),
    setPlacementBuilding: (type) => set({ placementBuilding: type, wallPreview: null }),
    setWallPreview: (preview) => set({ wallPreview: preview }),
    setGameTime: (ms) => set({ gameTimeMs: ms }),
    setWonders: (wonders) => set({ wonders }),
    setDeleteArmed: (id, refundPct = 0) => set({ deleteArmedId: id, deleteArmedPct: id === null ? 0 : refundPct }),
    showSidePanel: (view) => set({ sidePanel: { open: true, view } }),
    toggleSidePanel: () => set((state) => ({ sidePanel: { ...state.sidePanel, open: !state.sidePanel.open } })),
    setScores: (rows) => set({ scores: rows }),
    setVillagerCounts: (counts) => set({ villagerCounts: counts }),
  }));
}

export function resetUiStore(store: StoreApi<UiStore> = uiStore): void {
  store.setState({
    resources: { ...INITIAL.resources },
    population: { ...INITIAL.population },
    currentAge: INITIAL.currentAge,
    civ: INITIAL.civ,
    researchedTechs: [],
    uniqueBuilt: [],
    selectedEntity: null,
    selectionCount: 0,
    placementBuilding: null,
    wallPreview: null,
    gameTimeMs: 0,
    wonders: [],
    deleteArmedId: null,
    deleteArmedPct: 0,
    sidePanel: { ...INITIAL.sidePanel },
    scores: [],
    villagerCounts: { ...INITIAL.villagerCounts },
  });
}

/**
 * Default singleton store used by GameScene and HUDScene. Pinned on
 * globalThis so Vite HMR re-evaluations share a single instance
 * across both the game bundle and dynamic `import()` calls (this is
 * a dev-only quality-of-life; in the production bundle the module
 * is evaluated once anyway).
 */
const STORE_KEY = '__isorts_uiStore__';
interface GlobalHolder {
  [STORE_KEY]?: StoreApi<UiStore>;
}
const holder = globalThis as unknown as GlobalHolder;
export const uiStore: StoreApi<UiStore> = holder[STORE_KEY] ?? createUiStore();
holder[STORE_KEY] = uiStore;
