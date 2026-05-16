// Scientific data for celestial bodies, used by the hover/tap info card.
// Sources: NASA fact sheets, IAU, Wikipedia. Numbers are mainstream values
// (rounded for readability — not for navigation).

export const BODY_DATA = {
  Sun: {
    type: 'G-type main-sequence star (G2V)',
    age: '4.6 billion years',
    mass: '1.989 × 10³⁰ kg  (333 000 M⊕)',
    radius: '696 340 km  (109 R⊕)',
    surfaceTemp: '5 778 K  (5 505 °C)',
    coreTemp: '15.7 million K',
    composition: '73% H · 25% He · 2% O, C, Fe, Ne…',
    luminosity: '3.83 × 10²⁶ W',
    galactic: {
      distance: '~26 000 ly from Sagittarius A*',
      speed: '~230 km/s around galactic center',
      period: '~225 Myr per orbit'
    },
    facts: [
      'Contains 99.86% of the Solar System\'s mass',
      'Will become a red giant in ~5 billion years',
      'Light from the surface takes ~8 min 20 s to reach Earth'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Sun'
  },

  Mercury: {
    type: 'Rocky planet (terrestrial)',
    mass: '3.30 × 10²³ kg  (0.055 M⊕)',
    radius: '2 440 km  (0.383 R⊕)',
    density: '5.43 g/cm³',
    distance: '0.387 AU  (57.9 Mkm)',
    orbitalPeriod: '88 Earth days',
    dayLength: '176 Earth days  (solar day)',
    surfaceTemp: '−173 to +427 °C',
    atmosphere: 'Tenuous exosphere (O, Na, H, He)',
    moons: 0,
    axialTilt: '0.03°',
    facts: [
      'Smallest planet (smaller than Ganymede & Titan)',
      'Largest day-night temperature swing in the Solar System',
      'Has a global magnetic field — unexpected for so small a body'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Mercury_(planet)'
  },

  Venus: {
    type: 'Rocky planet (terrestrial)',
    mass: '4.87 × 10²⁴ kg  (0.815 M⊕)',
    radius: '6 052 km  (0.949 R⊕)',
    density: '5.24 g/cm³',
    distance: '0.723 AU  (108.2 Mkm)',
    orbitalPeriod: '224.7 Earth days',
    dayLength: '243 Earth days  (longer than its year!)',
    surfaceTemp: '+462 °C average',
    atmosphere: '96.5% CO₂ · 3.5% N₂ · 92× Earth pressure',
    moons: 0,
    axialTilt: '177.4° (retrograde rotation)',
    facts: [
      'Hottest planet — runaway greenhouse effect',
      'Rotates backwards (retrograde) — Sun rises in the west',
      'Surface pressure ≈ 900 m underwater on Earth'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Venus'
  },

  Earth: {
    type: 'Rocky planet (terrestrial)',
    mass: '5.97 × 10²⁴ kg  (1 M⊕)',
    radius: '6 371 km  (1 R⊕)',
    density: '5.51 g/cm³',
    distance: '1.000 AU  (149.6 Mkm)',
    orbitalPeriod: '365.25 days',
    dayLength: '23 h 56 min  (sidereal); 24 h solar',
    surfaceTemp: '+15 °C average  (−89 to +57 °C)',
    atmosphere: '78% N₂ · 21% O₂ · 1% Ar · 0.04% CO₂',
    moons: 1,
    axialTilt: '23.44° (gives us seasons)',
    facts: [
      'Only known planet with liquid water on the surface',
      'Magnetic field deflects most of the solar wind',
      'Plate tectonics continually recycles the crust'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Earth'
  },

  Mars: {
    type: 'Rocky planet (terrestrial)',
    mass: '6.42 × 10²³ kg  (0.107 M⊕)',
    radius: '3 390 km  (0.532 R⊕)',
    density: '3.93 g/cm³',
    distance: '1.524 AU  (227.9 Mkm)',
    orbitalPeriod: '687 Earth days  (1.88 Earth years)',
    dayLength: '24 h 37 min  ("sol")',
    surfaceTemp: '−63 °C average  (−143 to +35 °C)',
    atmosphere: '95% CO₂ · ~0.6% Earth pressure',
    moons: 2,
    axialTilt: '25.19° (similar seasons to Earth)',
    facts: [
      'Hosts Olympus Mons — tallest volcano in the Solar System (22 km)',
      'Polar ice caps of frozen CO₂ and water ice',
      'Surface gravity is 38% of Earth\'s — easier rockets, harder bones'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Mars'
  },

  Jupiter: {
    type: 'Gas giant',
    mass: '1.90 × 10²⁷ kg  (318 M⊕)',
    radius: '69 911 km  (10.97 R⊕)',
    density: '1.33 g/cm³',
    distance: '5.20 AU  (778.6 Mkm)',
    orbitalPeriod: '11.86 Earth years',
    dayLength: '9 h 56 min  (fastest spin of any planet)',
    surfaceTemp: '−108 °C cloud tops',
    atmosphere: '90% H₂ · 10% He · traces CH₄, NH₃',
    moons: '95 (Io, Europa, Ganymede, Callisto + 91 small)',
    axialTilt: '3.13°',
    facts: [
      'Mass is 2.5× more than all other planets combined',
      'Great Red Spot — a storm larger than Earth, raging for 350+ years',
      'Magnetosphere is 20 000× stronger than Earth\'s'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Jupiter'
  },

  Saturn: {
    type: 'Gas giant',
    mass: '5.68 × 10²⁶ kg  (95.2 M⊕)',
    radius: '58 232 km  (9.14 R⊕)',
    density: '0.69 g/cm³  (would float in water)',
    distance: '9.58 AU  (1 433 Mkm)',
    orbitalPeriod: '29.46 Earth years',
    dayLength: '10 h 33 min',
    surfaceTemp: '−139 °C cloud tops',
    atmosphere: '96% H₂ · 3% He',
    moons: '146 (Titan, Enceladus, Mimas, Rhea, Iapetus…)',
    axialTilt: '26.73°',
    facts: [
      'Rings span 282 000 km but are only 10 m to 1 km thick',
      'Hexagonal storm at the north pole — geometric weather',
      'Less dense than water — the only planet with ρ < 1 g/cm³'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Saturn'
  },

  Uranus: {
    type: 'Ice giant',
    mass: '8.68 × 10²⁵ kg  (14.5 M⊕)',
    radius: '25 362 km  (3.98 R⊕)',
    density: '1.27 g/cm³',
    distance: '19.18 AU  (2 872 Mkm)',
    orbitalPeriod: '84.01 Earth years',
    dayLength: '17 h 14 min  (retrograde)',
    surfaceTemp: '−197 °C cloud tops  (coldest planet)',
    atmosphere: '83% H₂ · 15% He · 2% CH₄ (gives blue color)',
    moons: '28 (Titania, Oberon, Miranda…)',
    axialTilt: '97.77° (essentially rolls on its side)',
    facts: [
      'Tilted on its side — likely from an ancient collision',
      'Each pole gets ~42 years of continuous sunlight, then 42 of darkness',
      'Coldest atmosphere of any planet, even colder than Neptune'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Uranus'
  },

  Neptune: {
    type: 'Ice giant',
    mass: '1.02 × 10²⁶ kg  (17.1 M⊕)',
    radius: '24 622 km  (3.86 R⊕)',
    density: '1.64 g/cm³',
    distance: '30.07 AU  (4 495 Mkm)',
    orbitalPeriod: '164.79 Earth years',
    dayLength: '16 h 6 min',
    surfaceTemp: '−201 °C cloud tops',
    atmosphere: '80% H₂ · 19% He · 1% CH₄',
    moons: '16 (Triton is largest, orbits retrograde)',
    axialTilt: '28.32°',
    facts: [
      'Winds up to 2 100 km/h — fastest in the Solar System',
      'Discovered by math (Le Verrier 1846) before observation',
      'Only planet not visible to the naked eye from Earth'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Neptune'
  },

  Moon: {
    type: 'Natural satellite of Earth',
    parent: 'Earth',
    mass: '7.35 × 10²² kg  (0.012 M⊕)',
    radius: '1 737 km  (0.273 R⊕)',
    density: '3.34 g/cm³',
    distance: '384 400 km from Earth  (1.28 light-seconds)',
    orbitalPeriod: '27.32 days  (sidereal)',
    dayLength: '29.53 days  (synodic — Full Moon to Full Moon)',
    surfaceTemp: '−173 to +127 °C',
    atmosphere: 'Essentially none',
    facts: [
      'Tidally locked — always shows the same face to Earth',
      'Receding from Earth at 3.8 cm/year (laser ranging)',
      'Likely formed from debris of a Mars-sized impactor 4.5 Bya'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Moon'
  },

  Io: {
    type: 'Galilean moon of Jupiter',
    parent: 'Jupiter',
    radius: '1 822 km',
    orbitalPeriod: '1.77 days',
    surfaceTemp: '−143 °C surface, +1 600 °C lava',
    facts: [
      'Most volcanically active body in the Solar System',
      'Surface paved by sulfur compounds — yellow, orange, red',
      'Tidal heating from Jupiter and orbital resonance with Europa/Ganymede'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Io_(moon)'
  },

  Europa: {
    type: 'Galilean moon of Jupiter',
    parent: 'Jupiter',
    radius: '1 561 km',
    orbitalPeriod: '3.55 days',
    surfaceTemp: '−170 °C',
    facts: [
      'Subsurface liquid water ocean — more water than all of Earth\'s',
      'Ice shell ~15–25 km thick over ~100 km deep ocean',
      'Top candidate in the Solar System for extraterrestrial life'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Europa_(moon)'
  },

  Ganymede: {
    type: 'Galilean moon of Jupiter',
    parent: 'Jupiter',
    radius: '2 634 km  (larger than Mercury!)',
    orbitalPeriod: '7.15 days',
    surfaceTemp: '−163 °C',
    facts: [
      'Largest moon in the Solar System',
      'Only moon known to generate its own magnetic field',
      'Has a saltwater ocean buried under ~150 km of ice'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Ganymede_(moon)'
  },

  Callisto: {
    type: 'Galilean moon of Jupiter',
    parent: 'Jupiter',
    radius: '2 410 km',
    orbitalPeriod: '16.69 days',
    surfaceTemp: '−139 °C',
    facts: [
      'Most heavily cratered body in the Solar System',
      'Surface essentially unchanged for 4 billion years',
      'Outside Jupiter\'s main radiation belts — friendlier to spacecraft'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Callisto_(moon)'
  },

  Titan: {
    type: 'Largest moon of Saturn',
    parent: 'Saturn',
    radius: '2 575 km  (larger than Mercury)',
    orbitalPeriod: '15.95 days',
    surfaceTemp: '−179 °C',
    atmosphere: '95% N₂ · 5% CH₄ · 1.45× Earth pressure',
    facts: [
      'Only moon with a substantial atmosphere',
      'Has rivers, lakes and rain — but of liquid methane and ethane',
      'Cassini-Huygens probe landed on its surface in 2005'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Titan_(moon)'
  },

  Phobos: {
    type: 'Inner moon of Mars',
    parent: 'Mars',
    radius: '11 km (irregular)',
    orbitalPeriod: '0.319 days  (faster than Mars rotates!)',
    facts: [
      'Rises in the west and sets in the east — orbits below synchronous altitude',
      'Spirals inward 2 m/century — will crash into Mars in ~50 Myr',
      'Possibly a captured asteroid or impact debris'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Phobos_(moon)'
  },

  Deimos: {
    type: 'Outer moon of Mars',
    parent: 'Mars',
    radius: '6 km (irregular)',
    orbitalPeriod: '1.26 days',
    facts: [
      'Smaller and farther than Phobos — slowly spiraling outward',
      'Appears only as a bright "star" from Mars surface',
      'Likely a captured asteroid'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Deimos_(moon)'
  },

  // ── Dwarf planets ──────────────────────────────────────────────────────────

  Ceres: {
    type: 'Dwarf planet (asteroid belt)',
    mass: '9.39 × 10²⁰ kg  (0.000157 M⊕)',
    radius: '469 km  (0.0735 R⊕)',
    density: '2.16 g/cm³',
    distance: '2.77 AU  (414 Mkm)',
    orbitalPeriod: '4.60 Earth years',
    dayLength: '9 h 4 min',
    surfaceTemp: '−105 °C average',
    atmosphere: 'Trace water vapor (transient)',
    moons: 0,
    facts: [
      'Largest object in the asteroid belt — holds ~1/3 of the belt\'s mass',
      'Has internal liquid water reservoirs (Dawn mission, 2015)',
      'Was classified as a planet 1801–1850, then asteroid, now dwarf planet'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)'
  },

  Pluto: {
    type: 'Dwarf planet (Kuiper belt)',
    mass: '1.30 × 10²² kg  (0.00218 M⊕)',
    radius: '1 188 km  (0.186 R⊕)',
    density: '1.86 g/cm³',
    distance: '39.48 AU  (5 906 Mkm)',
    orbitalPeriod: '247.94 Earth years',
    dayLength: '6.39 Earth days',
    surfaceTemp: '−229 °C average',
    atmosphere: 'Thin N₂ + CH₄ + CO (collapses when farther from Sun)',
    moons: 5,
    axialTilt: '122.53° (retrograde rotation)',
    facts: [
      'Heart-shaped region "Tombaugh Regio" visible — frozen nitrogen plains',
      'Orbits inside Neptune\'s orbit for part of its year (1979–1999)',
      'New Horizons flyby (2015) revealed mountains, glaciers, hazy atmosphere',
      'Demoted from planet to dwarf planet in 2006 (IAU)'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Pluto'
  },

  Charon: {
    type: 'Largest moon of Pluto',
    parent: 'Pluto',
    radius: '606 km  (half the radius of Pluto)',
    orbitalPeriod: '6.387 days',
    surfaceTemp: '−220 °C',
    facts: [
      'Pluto-Charon system has barycentre OUTSIDE Pluto — they orbit each other',
      'Mutually tidally locked — same face always points to Pluto, and vice versa',
      'Dark red north polar cap "Mordor Macula" — tholins from Pluto\'s escaping methane'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Charon_(moon)'
  },

  Haumea: {
    type: 'Dwarf planet (Kuiper belt)',
    mass: '4.01 × 10²¹ kg  (0.000671 M⊕)',
    radius: '816 km  (mean; highly elongated)',
    density: '2.6 g/cm³',
    distance: '43.13 AU',
    orbitalPeriod: '283.28 Earth years',
    dayLength: '3.92 hours  (fastest large-body rotation in the Solar System!)',
    surfaceTemp: '−240 °C',
    moons: 2,
    axialTilt: '28.21°',
    facts: [
      'Egg-shaped (2 100 × 1 680 × 1 074 km) — spins so fast it deforms',
      'Has a thin ring — first dwarf planet known to have one (discovered 2017)',
      'Mostly water ice with high albedo — brightest known KBO surface'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Haumea'
  },

  Makemake: {
    type: 'Dwarf planet (Kuiper belt)',
    mass: '3.1 × 10²¹ kg  (0.000519 M⊕)',
    radius: '715 km  (0.112 R⊕)',
    density: '2.1 g/cm³',
    distance: '45.79 AU',
    orbitalPeriod: '309.88 Earth years',
    dayLength: '22.83 hours',
    surfaceTemp: '−243 °C',
    atmosphere: 'None detected (very thin if any)',
    moons: 1,
    axialTilt: '28.99°',
    facts: [
      'Red-brown surface from frozen methane and ethane',
      'One of the largest "classical" KBOs (cubewanos)',
      'Named after Rapa Nui (Easter Island) creation deity'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Makemake'
  },

  Eris: {
    type: 'Dwarf planet (scattered disc)',
    mass: '1.66 × 10²² kg  (0.00278 M⊕  — heavier than Pluto!)',
    radius: '1 163 km  (0.182 R⊕)',
    density: '2.43 g/cm³',
    distance: '67.86 AU',
    orbitalPeriod: '559 Earth years',
    dayLength: '~25.9 hours',
    surfaceTemp: '−243 °C',
    atmosphere: 'N₂ ice (sublimates near perihelion)',
    moons: 1,
    axialTilt: '44.04°',
    facts: [
      'Discovery (2005) triggered the 2006 reclassification of Pluto',
      '27% more massive than Pluto but slightly smaller in radius',
      'Currently near aphelion (97.5 AU) — its year is just past midnight'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Eris_(dwarf_planet)'
  },

  Dysnomia: {
    type: 'Only moon of Eris',
    parent: 'Eris',
    radius: '350 km (irregular)',
    orbitalPeriod: '15.79 days',
    facts: [
      'Used to measure Eris\'s mass — orbital period gives the central mass',
      'Named after the daughter of Eris (Greek goddess of lawlessness)',
      'Surface very dark — possibly post-impact remnant'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Dysnomia_(moon)'
  },

  Sedna: {
    type: 'Dwarf planet candidate (extreme TNO)',
    mass: '~10²¹ kg  (estimated, very uncertain)',
    radius: '~498 km',
    distance: '506 AU average  (perihelion 76 AU, aphelion 937 AU!)',
    orbitalPeriod: '~11 400 Earth years',
    dayLength: '~10 hours',
    surfaceTemp: '−262 °C',
    moons: 0,
    axialTilt: '~11.93°',
    facts: [
      'Most distant known major body — currently 84 AU from the Sun (2026)',
      'Extreme orbit suggests perturbation by an unseen massive body ("Planet Nine")',
      'Hasn\'t completed one full orbit since the last Ice Age ended',
      'Surface is one of the reddest in the Solar System — tholins on methane ice'
    ],
    wiki: 'https://en.wikipedia.org/wiki/Sedna_(dwarf_planet)'
  }
};

// Format a multi-line card for the tooltip.
// `dynamicState` is { radiusAu } from planetObjects.get(name).state — added to
// give a "what's happening right now" feel.
export function formatBodyCard(name, dynamicState = null) {
  const d = BODY_DATA[name];
  if (!d) return `<strong>${name}</strong>`;

  const rows = [];
  const row = (label, value) => {
    if (value === undefined || value === null) return;
    rows.push(`<div class="ic-row"><span>${label}</span><strong>${value}</strong></div>`);
  };

  row('Type', d.type);
  if (d.parent) row('Orbits', d.parent);
  if (d.age) row('Age', d.age);
  if (d.mass) row('Mass', d.mass);
  if (d.radius) row('Radius', d.radius);
  if (d.density) row('Density', d.density);
  if (d.luminosity) row('Luminosity', d.luminosity);

  if (dynamicState && dynamicState.radiusAu !== undefined) {
    row('Now from Sun', `${dynamicState.radiusAu.toFixed(3)} AU`);
  } else if (d.distance) {
    row('Distance', d.distance);
  }

  if (d.orbitalPeriod) row('Orbital period', d.orbitalPeriod);
  if (d.dayLength) row('Day length', d.dayLength);
  if (d.surfaceTemp) row('Surface temp', d.surfaceTemp);
  if (d.coreTemp) row('Core temp', d.coreTemp);
  if (d.atmosphere) row('Atmosphere', d.atmosphere);
  if (d.composition) row('Composition', d.composition);
  if (d.moons !== undefined) row('Moons', d.moons);
  if (d.axialTilt) row('Axial tilt', d.axialTilt);

  if (d.galactic) {
    rows.push('<div class="ic-section">Galactic motion</div>');
    row('Distance to Sgr A*', d.galactic.distance);
    row('Orbital speed', d.galactic.speed);
    row('Orbital period', d.galactic.period);
  }

  let factsHtml = '';
  if (d.facts && d.facts.length) {
    factsHtml = `
      <div class="ic-section">Did you know</div>
      <ul class="ic-facts">${d.facts.map((f) => `<li>${f}</li>`).join('')}</ul>`;
  }

  const wikiHtml = d.wiki
    ? `<a class="ic-wiki" href="${d.wiki}" target="_blank" rel="noopener">Wikipedia ↗</a>`
    : '';

  return `
    <div class="ic-header">
      <strong>${name}</strong>
    </div>
    <div class="ic-body">${rows.join('')}</div>
    ${factsHtml}
    ${wikiHtml}
  `;
}
