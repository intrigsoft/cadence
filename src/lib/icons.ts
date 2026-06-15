// Inline SVG icon set — ported verbatim from design/prototype/helpers.jsx.
// Each entry is the inner markup of a 0 0 24 24 viewBox; stroke icons inherit
// currentColor at 1.7 width. Filled sub-elements set fill/stroke inline.

export const ICONS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevDown: '<path d="M6 9l6 6 6-6"/>',
  chevRight: '<path d="M9 6l6 6-6 6"/>',
  chevLeft: '<path d="M15 6l-6 6 6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  columns: '<rect x="4" y="4" width="4.5" height="16" rx="1.5"/><rect x="10" y="4" width="4.5" height="11" rx="1.5"/><rect x="16" y="4" width="4.5" height="14" rx="1.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  checkSquare: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5L16 9"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
  message: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V6a1 1 0 0 1 1-1z"/>',
  shield: '<path d="M12 3l7 2.5v5c0 4.6-3 7.8-7 9.5-4-1.7-7-4.9-7-9.5v-5L12 3z"/><path d="M9 12l2 2 4-4"/>',
  shieldDot: '<path d="M12 3l7 2.5v5c0 4.6-3 7.8-7 9.5-4-1.7-7-4.9-7-9.5v-5L12 3z"/><circle cx="12" cy="11.5" r="1.4" fill="currentColor" stroke="none"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  dots: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9h16M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
  users: '<circle cx="9" cy="9" r="3"/><path d="M3.5 18.5a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M16.5 18.5a5.5 5.5 0 0 0-2-4.3"/>',
  send: '<path d="M5 12l14-7-5 16-3.5-6.5L5 12z"/>',
  sidebar: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M10 5v14"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  align: '<path d="M5 7h14M5 12h10M5 17h7"/>',
  tag: '<path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7.5 7.5a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0L4 12.5z"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>',
  link: '<path d="M9 15l6-6"/><path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1"/>',
  logout: '<path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M16 8l4 4-4 4M9 12h11"/>',
  dragDots: '<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
  spark: '<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10.5v3l2 1.5M9.5 3h5M12 3v3.5"/>',
  play: '<path d="M8.5 5.5l10 6.5-10 6.5z"/>',
  stopSq: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  flow: '<rect x="3" y="9" width="6" height="6" rx="2"/><rect x="15" y="3" width="6" height="6" rx="2"/><rect x="15" y="15" width="6" height="6" rx="2"/><path d="M9 12c3 0 3-6 6-6M9 12c3 0 3 6 6 6"/>',
  chart: '<path d="M4 20h16"/><path d="M7.5 20v-7M12 20V6M16.5 20v-10"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13" stroke-width="2.2"/>'
};

export type IconName = keyof typeof ICONS;
