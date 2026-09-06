// Stroke icons on a 24px grid. Drawn rather than fetched so they scale, recolour
// and work with no network.

const P = {
  aperture: '<circle cx="12" cy="12" r="9"/><path d="M12 12L4.6 7.6M12 12h8.9M12 12l-4.4 7.7"/>',
  book: '<path d="M12 6.2C10 4.7 7.5 4.2 4 4.2v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2z"/><path d="M12 6.2v13"/>',
  sliders: '<path d="M4 7h9M17.5 7H20M4 17h4.5M13 17h7"/><circle cx="15" cy="7" r="2.2"/><circle cx="10.5" cy="17" r="2.2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.2v5.4M12 7.9v.1"/>',
  warning: '<path d="M12 4.2l8.6 15H3.4z"/><path d="M12 10.4v3.6M12 16.9v.1"/>',
  down: '<path d="M12 4.5v15M6 13.5l6 6 6-6"/>',
  action: '<circle cx="15.5" cy="9" r="4.2"/><path d="M2.5 7.5h5M1.5 12h6.5M3.5 16.5h4.5"/>',
  portrait: '<circle cx="12" cy="8.4" r="3.9"/><path d="M4.4 20.2c1.2-4.1 4.1-6.1 7.6-6.1s6.4 2 7.6 6.1"/>',
  kids: '<circle cx="8.6" cy="7.8" r="3"/><path d="M3.2 18.6c.9-3.2 3-4.8 5.4-4.8s4.5 1.6 5.4 4.8"/><circle cx="17.6" cy="12.2" r="2.2"/><path d="M14.2 19c.5-1.9 1.8-2.9 3.4-2.9s2.9 1 3.4 2.9"/>',
  group: '<circle cx="12" cy="7.6" r="3"/><path d="M6.6 18.4c.9-3.2 3-4.8 5.4-4.8s4.5 1.6 5.4 4.8"/><circle cx="4.6" cy="10.4" r="2.1"/><circle cx="19.4" cy="10.4" r="2.1"/><path d="M1.6 18.4c.4-1.8 1.5-2.8 3-2.8M22.4 18.4c-.4-1.8-1.5-2.8-3-2.8"/>',
  landscape: '<path d="M2 18.5l6-8 4.6 5.6L16 11l6 7.5z"/><circle cx="17.2" cy="6" r="2.4"/>',
  architecture: '<path d="M3 21h18M6 21V6l6-3 6 3v15"/><path d="M10 21v-5h4v5M10 10h.01M14 10h.01"/>',
  street: '<path d="M3 21h18M5.5 21V8.2h5V21M14 21V4.2h5V21"/><path d="M7.4 11.4h1M7.4 14.8h1M16.2 8h1M16.2 12h1"/>',
  indoor: '<rect x="4" y="4" width="16" height="16" rx="1.6"/><path d="M12 4v16M4 12h16"/>',
  concert: '<path d="M9 18V6.5l10-2.2V16"/><circle cx="6.6" cy="18.2" r="2.6"/><circle cx="16.6" cy="16" r="2.6"/>',
  food: '<path d="M4 4v6.5a2.5 2.5 0 0 0 5 0V4M6.5 10.5V20"/><path d="M17 20V4c-2 .8-3 3-3 6s1 4 3 4"/>',
  macro: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L21 21"/><circle cx="11" cy="11" r="2.2"/>',
  night: '<path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8z"/>',
  stars: '<path d="M11.2 3.2l1.7 4.5 4.5 1.7-4.5 1.7-1.7 4.5-1.7-4.5L5 9.4l4.5-1.7z"/><circle cx="18.4" cy="17.4" r="1.1"/><circle cx="6.2" cy="18.4" r="0.9"/>',
  water: '<path d="M2.5 7.5c2.6-2.4 5.2-2.4 7.8 0s5.2 2.4 7.8 0"/><path d="M2.5 12.5c2.6-2.4 5.2-2.4 7.8 0s5.2 2.4 7.8 0"/><path d="M2.5 17.5c2.6-2.4 5.2-2.4 7.8 0s5.2 2.4 7.8 0"/>',
  panning: '<circle cx="13.5" cy="12" r="5"/><path d="M2 6.5h5M1 12h5M3 17.5h4"/>',
  fireworks: '<path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.2 5.2l2.9 2.9M15.9 15.9l2.9 2.9M18.8 5.2l-2.9 2.9M8.1 15.9l-2.9 2.9"/><circle cx="12" cy="12" r="2"/>',
  moon: '<circle cx="12" cy="12" r="8.6"/><circle cx="9" cy="9.5" r="1.6"/><circle cx="14.5" cy="14" r="1.1"/><circle cx="15" cy="8.5" r="0.8"/>',
  wildlife: '<path d="M4.5 20c0-4.5 3.2-7.5 7.5-7.5s7.5 3 7.5 7.5"/><circle cx="12" cy="8" r="3.4"/><path d="M8.4 5.2L6.6 2.8M15.6 5.2l1.8-2.4"/>',
  sun: '<circle cx="12" cy="12" r="4.4"/><path d="M12 2.4v2.6M12 19v2.6M4.2 12H1.6M22.4 12h-2.6M6.3 6.3L4.5 4.5M19.5 19.5l-1.8-1.8M17.7 6.3l1.8-1.8M4.5 19.5l1.8-1.8"/>',
  home: '<path d="M3.5 10.5L12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  camera: '<path d="M3 8.4h3.6L8.4 5.6h7.2l1.8 2.8H21v10.2H3z"/><circle cx="12" cy="13.2" r="3.3"/>',
  lens: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.4"/>',
};

export function icon(name, size = 22, extra = '') {
  const d = P[name] ?? P.aperture;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
}
