import type { CursorKind } from './cursor';

/** The UI palette (hud.css): a dark glass fill under an amber outline. */
const FILL = '#211913';
const LINE = '#f5a857';
const LIGHT = '#ffd49a';

interface CursorArt {
  /** The shapes, drawn twice: once as an offset shadow, once in the UI style. */
  readonly shape: string;
  /** Details drawn on top only (no shadow): highlights, weave, the "no" mark. */
  readonly detail?: string;
  /** The click point within the 32×32 image. */
  readonly hotspot: readonly [number, number];
  /** The system cursor where an SVG cursor is not supported. */
  readonly fallback: string;
}

/** Tools are drawn upright and turned 45° so the head sits top-left and the handle runs to the bottom-right. */
const tilt = (s: string): string => `<g transform="rotate(-45 16 16)">${s}</g>`;

const HANDLE = '<path d="M14.6 10h2.8v19a1.4 1.4 0 0 1-2.8 0Z"/>';

const ART: Readonly<Record<Exclude<CursorKind, 'default'>, CursorArt>> = {
  // An arrow with two footprints: "walk there".
  move: {
    shape: '<path d="M4 3v19.5l5.2-4.6 3.4 7.6 3.6-1.6-3.4-7.4h7Z"/>',
    // Solid amber soles (on top only: a shadow under each would blur them at 32 px).
    detail:
      `<g fill="${LINE}" stroke="${FILL}" stroke-width="0.8"><ellipse cx="22.5" cy="25.5" rx="2.1" ry="3.2" transform="rotate(-30 22.5 25.5)"/>` +
      '<ellipse cx="27.2" cy="19.8" rx="2.1" ry="3.2" transform="rotate(-30 27.2 19.8)"/></g>',
    hotspot: [4, 3],
    fallback: 'default',
  },
  // A felling axe: wood.
  gatherWood: {
    shape: tilt(`${HANDLE}<path d="M13.6 4.5h4.6v7h-4.6Z"/><path d="M13.6 5.2C9.4 3.4 6.4 4.6 4.6 6.2c1.2 3.4 1.4 6.2.4 9.2 3.2-.4 6.2-2.2 8.6-4.2Z"/>`),
    detail: tilt(`<path d="M6.6 7.4c.8 2.4.9 4.4.4 6.2" fill="none" stroke="${LIGHT}" stroke-width="1.1"/>`),
    hotspot: [7, 12],
    fallback: 'pointer',
  },
  // A pickaxe: gold.
  gatherGold: {
    shape: tilt(`${HANDLE}<path d="M3 10.5C8 4.6 24 4.6 29 10.5 23.6 8.6 19.6 8.6 17.6 9v2.6h-3.2V9C12.4 8.6 8.4 8.6 3 10.5Z"/>`),
    detail: tilt(`<path d="M6.5 8.6c3-1.6 6-2.1 9.5-2.1" fill="none" stroke="${LIGHT}" stroke-width="1.1"/>`),
    hotspot: [9, 9],
    fallback: 'pointer',
  },
  // A woven basket with berries: food.
  gatherFood: {
    shape:
      '<path d="M9 15.5c0-8.4 14-8.4 14 0" fill="none" stroke-width="2.4"/>' +
      '<circle cx="12.5" cy="13.4" r="2.6"/><circle cx="17" cy="12.4" r="2.6"/><circle cx="20.6" cy="14" r="2.3"/>' +
      '<path d="M4.5 15.5h23l-3.2 12a1.6 1.6 0 0 1-1.6 1.2H9.3a1.6 1.6 0 0 1-1.6-1.2Z"/>',
    detail:
      `<path d="M7.6 19.6h16.8M9 23.6h14M12 16.4l1 11.6M16 16.4v11.6M20 16.4l-1 11.6" fill="none" stroke="${LINE}" stroke-width="0.9" opacity="0.65"/>` +
      `<circle cx="11.8" cy="12.6" r="0.8" fill="${LIGHT}" stroke="none"/><circle cx="16.3" cy="11.6" r="0.8" fill="${LIGHT}" stroke="none"/>`,
    hotspot: [16, 16],
    fallback: 'pointer',
  },
  // A hammer: build.
  build: {
    shape: tilt(`${HANDLE}<path d="M8.6 4.4h11.6a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2H8.6L5.2 9.6V6.8Z"/>`),
    detail: tilt(`<path d="M9.6 6.4h10" fill="none" stroke="${LIGHT}" stroke-width="1.1"/>`),
    hotspot: [9, 9],
    fallback: 'pointer',
  },
  // A sword, point first: attack.
  attack: {
    shape: tilt(
      '<path d="M16 1.6l3 4.2v14.4h-6V5.8Z"/><path d="M8.8 20.2h14.4a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1v-1.6a1 1 0 0 1 1-1Z"/>' +
        '<path d="M14.6 23.8h2.8v4.4h-2.8Z"/><circle cx="16" cy="29.6" r="1.9"/>',
    ),
    detail: tilt(`<path d="M16 4.4v14.4" fill="none" stroke="${LIGHT}" stroke-width="1"/>`),
    hotspot: [6, 6],
    fallback: 'crosshair',
  },
  // A struck-through circle: nothing to do there.
  forbidden: {
    shape: '<circle cx="16" cy="16" r="11"/>',
    detail: '<circle cx="16" cy="16" r="7" fill="none" stroke="#ff7a6b" stroke-width="2.6"/><path d="m11 21 10-10" fill="none" stroke="#ff7a6b" stroke-width="2.6"/>',
    hotspot: [16, 16],
    fallback: 'not-allowed',
  },
};

/** The SVG image of a cursor kind (32×32). */
export function cursorSvg(kind: Exclude<CursorKind, 'default'>): string {
  const a = ART[kind];
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    `<g transform="translate(0.8 1.4)" fill="#000" stroke="#000" stroke-width="2.6" stroke-linejoin="round" opacity="0.4">${a.shape}</g>` +
    `<g fill="${FILL}" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${a.shape}${a.detail ?? ''}</g>` +
    '</svg>'
  );
}

const cache = new Map<CursorKind, string>();

/** The CSS `cursor` value of a kind: the data-URI SVG at its hotspot, with a system fallback. */
export function cursorCss(kind: CursorKind): string {
  if (kind === 'default') return '';
  let css = cache.get(kind);
  if (css === undefined) {
    const a = ART[kind];
    css = `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(kind))}") ${a.hotspot[0]} ${a.hotspot[1]}, ${a.fallback}`;
    cache.set(kind, css);
  }
  return css;
}
