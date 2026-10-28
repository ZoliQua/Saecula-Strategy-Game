import { SFX_FULL_GAIN_TILES, SFX_MAX_PAN, SFX_PAN_PER_TILE, SFX_SILENT_TILES } from '../config/audio';
import type { TileCoord } from '../iso/coordinates';
import type { Settings, VolumeChannel } from '../ui/settings';

/**
 * A channel's linear gain from the settings: the slider product, squared
 * (a perceptual curve). The master slider scales every other channel.
 */
export function channelGain(settings: Settings, channel: VolumeChannel): number {
  if (settings.muted) return 0;
  const master = settings.volume.master / 100;
  const level = channel === 'master' ? master : master * (settings.volume[channel] / 100);
  return level * level;
}

/** Positional falloff (Decision 8): 1 within SFX_FULL_GAIN_TILES, linear to 0 at SFX_SILENT_TILES, 0 beyond. */
export function positionalGain(distanceTiles: number): number {
  if (distanceTiles <= SFX_FULL_GAIN_TILES) return 1;
  if (distanceTiles >= SFX_SILENT_TILES) return 0;
  return (SFX_SILENT_TILES - distanceTiles) / (SFX_SILENT_TILES - SFX_FULL_GAIN_TILES);
}

/** Euclidean distance between two tile positions, in tiles. */
export function tileDistance(a: TileCoord, b: TileCoord): number {
  return Math.hypot(a.tx - b.tx, a.ty - b.ty);
}

/** Stereo pan (-1 left .. 1 right) of a sound at `at` heard from `center`: iso screen x grows with tx - ty. */
export function stereoPan(at: TileCoord, center: TileCoord): number {
  const dx = at.tx - at.ty - (center.tx - center.ty);
  return Math.max(-SFX_MAX_PAN, Math.min(SFX_MAX_PAN, dx * SFX_PAN_PER_TILE));
}
