/** Inline SVG icons for the DOM UI (no external icon font). */

export const icons = {
  food: `<svg viewBox="0 0 24 24"><path fill="#ff9a76" d="M12 6c3.6-2.6 8 0 8 4.6C20 16 15.8 21 12 21S4 16 4 10.6C4 6 8.4 3.4 12 6Z"/><path fill="#ffc7a8" d="M8.2 9.2c.6-1.6 2.2-2.4 3.3-2-1.6.8-2.2 2-2.5 3.2-.2.8-1.1.4-.8-1.2Z"/><path fill="#7bc47f" d="M12 6.4c-.2-2 1-3.8 3.4-4.2-.2 2.2-1.6 3.6-3.4 4.2Z"/></svg>`,
  wood: `<svg viewBox="0 0 24 24"><rect x="3" y="12" width="16" height="6" rx="3" fill="#a8703e"/><rect x="5" y="6" width="16" height="6" rx="3" fill="#c88a4e"/><ellipse cx="19" cy="15" rx="2.6" ry="3" fill="#ecc58e"/><ellipse cx="21" cy="9" rx="2.6" ry="3" fill="#f2d3a2"/><ellipse cx="21" cy="9" rx="1" ry="1.2" fill="#c88a4e"/></svg>`,
  gold: `<svg viewBox="0 0 24 24"><path fill="#c98f22" d="M3 17.5 7 10h7l4 7.5Z"/><path fill="#f6cf5a" d="M9 10h7l-2.4-4.5H11.4Z"/><path fill="#ffe9a3" d="M6.5 17.5 9 12.5h4l2.5 5Z"/><circle cx="18.5" cy="6" r="1.2" fill="#fff4c4"/></svg>`,
  pop: `<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" fill="#f2efe9"/><path fill="#f2efe9" d="M3 19c0-3.6 2.7-6 6-6s6 2.4 6 6Z"/><circle cx="16.5" cy="9" r="2.6" fill="rgba(242,239,233,.55)"/><path fill="rgba(242,239,233,.55)" d="M14.6 13.6c3.4-.8 6.4 1.4 6.4 5.4h-4.6c0-2.2-.6-4-1.8-5.4Z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  sword: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.5 4H20v5.5L10 19.5 4.5 14Z"/><path d="m4 20 3-3"/></svg>`,
  range: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
  speed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/></svg>`,
  sack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 4h6l-1.5 3c4 1.5 6 5 6 8.5 0 3-2.5 4.5-7.5 4.5S4.5 18.5 4.5 15.5C4.5 12 6.5 8.5 10.5 7Z"/></svg>`,
  hammer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6 4 4M11 3l7 7-2 2-7-7Z"/><path d="m12 11-8 8"/></svg>`,
  mark: `<svg viewBox="0 0 32 32"><defs><linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf8f"/><stop offset="1" stop-color="#e08a3c"/></linearGradient></defs><path fill="url(#bm)" d="M16 2 29 9.5v13L16 30 3 22.5v-13Z"/><path fill="#1a1512" d="M16 8.5 23 12.5v8L16 24.5 9 20.5v-8Z"/><path fill="#ffcf8f" d="M16 12 19.5 14v4L16 20l-3.5-2v-4Z"/></svg>`,
} as const;

export type IconName = keyof typeof icons;
