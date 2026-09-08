// Small drawn scenes, one per subject.
//
// These are illustrations, not photographs, and the app never calls them
// anything else. What they can honestly do is show the *shape* of a picture,
// where the subject sits, how far the background falls away, what time of day
// it is, which is most of what a thumbnail is for. Drawn rather than fetched
// so they cost nothing, work offline, and carry no licence.

const SHAPES = {
  runner: `<circle cx="86" cy="30" r="4.4" /><path d="M81 39L72 61" /><path d="M78 45L62 42L56 52" />
    <path d="M78 46L94 51L97 41" /><path d="M72 61L86 70L83 87" /><path d="M72 61L58 70L64 85" />`,
  bust: `<circle cx="80" cy="42" r="13" /><path d="M56 92c1-15 11-23 24-23s23 8 24 23" />`,
  busts2: `<circle cx="62" cy="52" r="11" /><path d="M42 92c1.6-14 9-20 20-20s18.4 6 20 20" />
    <circle cx="100" cy="60" r="8.5" /><path d="M84 92c1.2-11 7-16 16-16s14.8 5 16 16" />`,
  crowd: `<circle cx="46" cy="56" r="9" /><path d="M30 94c.9-12 7.5-17 16-17s15.1 5 16 17" />
    <circle cx="80" cy="50" r="10.5" /><path d="M61 94c1.1-14 9-20 19-20s17.9 6 19 20" />
    <circle cx="114" cy="56" r="9" /><path d="M98 94c.9-12 7.5-17 16-17s15.1 5 16 17" />`,
  peaks: `<path d="M8 84L44 46L66 68L92 40L134 84" /><path d="M54 57l10 10M82 51l9 9" />`,
  city: `<path d="M14 92V52h20v40M40 92V38h22v54M68 92V60h18v32M92 92V44h20v48M118 92V64h20v28" />
    <path d="M46 48h3M46 58h3M46 68h3M100 54h3M100 66h3" />`,
  window: `<rect x="42" y="24" width="72" height="60" rx="2" /><path d="M78 24v60M42 54h72" />`,
  flower: `<path d="M80 92V54" /><circle cx="80" cy="44" r="8" />
    <path d="M80 36c-9-9-19-6-19-6s3 11 13 12M80 36c9-9 19-6 19-6s-3 11-13 12" />
    <path d="M80 68c-8 0-14-5-14-5s6-5 14-5" />`,
  plate: `<ellipse cx="80" cy="62" rx="40" ry="17" /><ellipse cx="80" cy="62" rx="26" ry="10" />
    <path d="M126 44v36M132 44v36" />`,
  bird: `<path d="M26 74c14-26 32-24 43 2" /><path d="M134 74c-14-26-32-24-43 2" />
    <circle cx="80" cy="72" r="5" /><path d="M80 67v-7" />`,
  moon: `<circle cx="80" cy="52" r="27" /><circle cx="66" cy="44" r="6" /><circle cx="77" cy="66" r="3.6" />
    <circle cx="92" cy="45" r="2.6" /><circle cx="90" cy="62" r="1.8" />`,
  burst: `<circle cx="80" cy="46" r="3" /><path d="M80 16v18M80 58v18M50 46h18M92 46h18
    M59 25l13 13M88 54l13 13M101 25L88 38M72 54L59 67" />`,
  water: `<path d="M12 58c16-11 32-11 48 0s32 11 48 0" /><path d="M12 72c16-11 32-11 48 0s32 11 48 0" />
    <path d="M12 86c16-11 32-11 48 0s32 11 48 0" />`,
  cyclist: `<circle cx="56" cy="74" r="14" /><circle cx="106" cy="74" r="14" />
    <path d="M56 74l18-18h16l16 18M74 56l6-14h12" /><circle cx="88" cy="32" r="6" />`,
  none: '',
};

// sky, ground, horizon (0-1), subject, extras
const SCENERY = {
  sports:       [['#A9AFB4', '#8C949A'], ['#4E5F3C', '#38472B'], 0.58, 'runner', []],
  kids:         [['#C6B49A', '#A08A6E'], ['#6B5941', '#4C3E2C'], 0.62, 'busts2', ['sun']],
  wildlife:     [['#93A48C', '#6E8168'], ['#3D4E35', '#293722'], 0.55, 'bird', []],
  portrait:     [['#C9B69E', '#9E886C'], ['#7A6449', '#57462F'], 0.66, 'bust', ['bokeh']],
  group:        [['#AEB6BB', '#8E979D'], ['#4F5F41', '#39472E'], 0.62, 'crowd', []],
  landscape:    [['#8FB0CC', '#B9C6C4'], ['#3F5340', '#26331F'], 0.72, 'peaks', ['sun']],
  architecture: [['#9FBAD2', '#C3CFD6'], ['#6E6A62', '#4E4A43'], 0.78, 'city', []],
  street:       [['#A6A9AB', '#8A8D90'], ['#57544F', '#3E3B37'], 0.72, 'city', []],
  indoor:       [['#C8B99C', '#9C8A6E'], ['#5D5140', '#40372A'], 0.68, 'window', []],
  concert:      [['#20161F', '#150F16'], ['#120C11', '#0B080C'], 0.7, 'bust', ['spot']],
  food:         [['#C4B097', '#A08B6F'], ['#7C6749', '#5A4933'], 0.44, 'plate', []],
  macro:        [['#7E9668', '#5C7449'], ['#3B4C2C', '#26331C'], 0.5, 'flower', ['bokeh']],
  nightcity:    [['#1E2B41', '#16202F'], ['#101722', '#0A0E15'], 0.72, 'city', ['lights']],
  stars:        [['#131E33', '#0A1120'], ['#0C1018', '#070A0F'], 0.82, 'peaks', ['stars']],
  water:        [['#8FA7A6', '#6F8A8B'], ['#3E5455', '#28393A'], 0.4, 'water', []],
  panning:      [['#9AA0A2', '#7C8386'], ['#4A4F52', '#33373A'], 0.66, 'cyclist', ['streaks']],
  fireworks:    [['#141B2A', '#0B0F18'], ['#0A0D14', '#06080C'], 0.86, 'burst', ['stars']],
  moon:         [['#0E1524', '#080C15'], ['#070A10', '#04060A'], 0.92, 'moon', ['stars']],
};

const DOTS = [[18, 20, 7], [36, 12, 4], [52, 24, 9], [70, 14, 5], [104, 22, 8], [126, 13, 6], [146, 26, 7]];
const STARS = [[16, 14], [34, 26], [50, 10], [66, 30], [88, 16], [104, 34], [122, 12], [140, 24], [150, 40], [26, 40]];

function extraLayer(kind, id) {
  if (kind === 'sun') return `<circle cx="126" cy="24" r="9" fill="rgba(255,238,200,.55)" />`;
  if (kind === 'bokeh') {
    return DOTS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(255,244,222,.20)" />`).join('');
  }
  if (kind === 'stars') {
    return STARS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="rgba(240,244,255,.75)" />`).join('');
  }
  if (kind === 'lights') {
    return DOTS.slice(0, 5).map(([x]) => `<circle cx="${x}" cy="72" r="2.4" fill="rgba(255,214,140,.75)" />`).join('');
  }
  if (kind === 'spot') {
    return `<path d="M80 0L36 100h88z" fill="url(#spot-${id})" />`;
  }
  if (kind === 'streaks') {
    return `<g stroke="rgba(255,255,255,.16)" stroke-width="3" stroke-linecap="round">
      <path d="M6 30h34M10 44h26M4 58h30M12 18h22" /></g>`;
  }
  return '';
}

/**
 * @returns {string} an inline SVG for a scene, sized by whatever contains it.
 */
let instance = 0;

export function scenery(sceneId, { rounded = 0 } = {}) {
  const entry = SCENERY[sceneId];
  if (!entry) return '';
  const [sky, ground, horizon, shape, extras] = entry;
  // Gradient ids have to be unique per instance: the same scene appears as a
  // tile and as a guide thumbnail on the same page, and duplicate ids make the
  // second one inherit the first one's fill.
  const id = `${sceneId}-${(instance += 1)}`;
  const y = Math.round(horizon * 100);

  return `<svg class="scenery" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
    ${rounded ? `style="border-radius:${rounded}px"` : ''}>
    <defs>
      <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sky[0]}" /><stop offset="1" stop-color="${sky[1]}" /></linearGradient>
      <linearGradient id="gnd-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${ground[0]}" /><stop offset="1" stop-color="${ground[1]}" /></linearGradient>
      <radialGradient id="spot-${id}" cx="0.5" cy="0" r="1">
        <stop offset="0" stop-color="rgba(255,226,170,.30)" /><stop offset="1" stop-color="rgba(255,226,170,0)" /></radialGradient>
    </defs>
    <rect width="160" height="100" fill="url(#sky-${id})" />
    <rect y="${y}" width="160" height="${100 - y}" fill="url(#gnd-${id})" />
    ${extras.map((e) => extraLayer(e, id)).join('')}
    <g fill="none" stroke="rgba(12,14,12,.82)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"
      transform="translate(0,-13)">
      ${SHAPES[shape] ?? ''}
    </g>
  </svg>`;
}

export const hasScenery = (id) => Boolean(SCENERY[id]);
