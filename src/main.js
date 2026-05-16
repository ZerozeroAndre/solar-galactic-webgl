import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { formatBodyCard } from './bodyData.js';
import { formatConstellationCard } from './constellationData.js';
import { advanceNBody, getNBodyPosition, resetNBody, isNBodyReady } from './nbody.js';
import {
  AU_SCALE,
  DEG,
  ECLIPTIC_TO_GALACTIC_TILT,
  GALACTIC_RADIUS_SCENE,
  J2000,
  MS_PER_DAY,
  applyEclipticTilt,
  comets,
  dwarfPlanets,
  namedAsteroids,
  spacecraft,
  eclipticFromCartesian,
  elementAt,
  eclipticToEquatorial,
  equatorialToHorizontal,
  milkyWayDrift,
  normalizeAngle,
  planetState,
  solveKepler,
  planets,
  radecToSceneVec3,
  setGalacticOrbitPeriod,
  sunGalacticPosition
} from './orbitalModel.js';
import { CITIES } from './cities.js';

const canvas = document.querySelector('#scene');
const speedInput = document.querySelector('#timeScale');
// Search overlay — Cmd/Ctrl + K opens, type to filter all bodies, Enter to focus.
const searchOverlay = document.querySelector('#searchOverlay');
const searchInput = document.querySelector('#searchInput');
const searchResults = document.querySelector('#searchResults');
let searchActiveIdx = 0;

function getAllSearchableNames() {
  // Собираем все имена из data sources. Группировка для read'ability.
  const names = [];
  names.push({ name: 'Sun', kind: 'Star' });
  for (const p of planets) {
    names.push({ name: p.name, kind: 'Planet' });
    for (const m of (MOONS[p.name] || [])) names.push({ name: m.name, kind: `Moon of ${p.name}` });
  }
  for (const p of dwarfPlanets) {
    names.push({ name: p.name, kind: 'Dwarf planet' });
    for (const m of (MOONS[p.name] || [])) names.push({ name: m.name, kind: `Moon of ${p.name}` });
  }
  for (const p of namedAsteroids) names.push({ name: p.name, kind: 'Asteroid' });
  for (const c of comets) names.push({ name: c.name, kind: 'Comet' });
  for (const s of spacecraft) names.push({ name: s.name, kind: 'Spacecraft' });
  return names;
}
const ALL_SEARCHABLE = getAllSearchableNames();

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? ALL_SEARCHABLE.filter((e) => e.name.toLowerCase().includes(q))
    : ALL_SEARCHABLE.slice(0, 20);
  searchActiveIdx = 0;
  searchResults.innerHTML = matches.map((e, i) =>
    `<div class="search-item${i === 0 ? ' active' : ''}" data-name="${e.name}">
       ${e.name}
       <span class="search-meta">${e.kind}</span>
     </div>`
  ).join('');
  // Bind click on each
  searchResults.querySelectorAll('.search-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      searchActiveIdx = i;
      pickSearchResult();
    });
  });
}

function pickSearchResult() {
  const items = searchResults.querySelectorAll('.search-item');
  const active = items[searchActiveIdx];
  if (!active) return;
  const name = active.dataset.name;
  closeSearch();
  jumpToFocus(name);
  // Sync dropdown to match
  if (focusSelect) focusSelect.value = name;
}

function openSearch() {
  searchOverlay.hidden = false;
  searchInput.value = '';
  renderSearchResults('');
  // Focus после reflow
  requestAnimationFrame(() => searchInput.focus());
}

function closeSearch() {
  searchOverlay.hidden = true;
}

searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));
searchInput.addEventListener('keydown', (e) => {
  const items = searchResults.querySelectorAll('.search-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (items.length === 0) return;
    items[searchActiveIdx]?.classList.remove('active');
    searchActiveIdx = (searchActiveIdx + 1) % items.length;
    items[searchActiveIdx].classList.add('active');
    items[searchActiveIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (items.length === 0) return;
    items[searchActiveIdx]?.classList.remove('active');
    searchActiveIdx = (searchActiveIdx - 1 + items.length) % items.length;
    items[searchActiveIdx].classList.add('active');
    items[searchActiveIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    pickSearchResult();
  } else if (e.key === 'Escape') {
    closeSearch();
  }
});

// Cmd+K / Ctrl+K — открыть search overlay
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
});

// Click outside modal — закрыть
searchOverlay.addEventListener('click', (e) => {
  if (e.target === searchOverlay) closeSearch();
});

// Speed presets — кликабельные кнопки рядом со слайдером, быстрое переключение
// между типичными темпами (1 day/sec, 1 month/sec, 1 year/sec, 10 years/sec).
document.querySelectorAll('.speed-preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetSpeed = parseFloat(btn.dataset.speed);
    // Clamp to current slider range (солнечный mode max=4, galactic max=10).
    const clamped = Math.min(parseFloat(speedInput.max), Math.max(parseFloat(speedInput.min), targetSpeed));
    speedInput.value = String(clamped);
    speedInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
});
const speedLabel = document.querySelector('#speedLabel');
const dateLabel = document.querySelector('#dateLabel');
const pauseBtn = document.querySelector('#pauseBtn');
const resetBtn = document.querySelector('#resetBtn');
const topBtn = document.querySelector('#topBtn');
const tiltBtn = document.querySelector('#tiltBtn');
const followSunBtn = document.querySelector('#followSunBtn');
const overviewBtn = document.querySelector('#overviewBtn');
const focusSelect = document.querySelector('#focusSelect');
const frameSelect = document.querySelector('#frameSelect');
const trailsToggle = document.querySelector('#trailsToggle');
const galaxyToggle = document.querySelector('#galaxyToggle');
const orbitPathToggle = document.querySelector('#orbitPathToggle');
const nbodyToggle = document.querySelector('#nbodyToggle');
const dwarfPlanetsToggle = document.querySelector('#dwarfPlanetsToggle');
const asteroidBeltToggle = document.querySelector('#asteroidBeltToggle');
const kuiperBeltToggle = document.querySelector('#kuiperBeltToggle');
const trojansToggle = document.querySelector('#trojansToggle');
const cometsToggle = document.querySelector('#cometsToggle');
const spacecraftToggle = document.querySelector('#spacecraftToggle');
const heliopauseToggle = document.querySelector('#heliopauseToggle');
const lagrangeToggle = document.querySelector('#lagrangeToggle');
const apsidesToggle = document.querySelector('#apsidesToggle');
const namedAsteroidsToggle = document.querySelector('#namedAsteroidsToggle');
const nbodyTmpVec = new THREE.Vector3();
const labelsToggle = document.querySelector('#labelsToggle');
const planetList = document.querySelector('#planetList');
const tooltip = document.querySelector('#tooltip');
const panelToggle = document.querySelector('#panelToggle');
const appEl = document.querySelector('#app');
const realtimeToggle = document.querySelector('#realtimeToggle');
const starsToggle = document.querySelector('#starsToggle');
const constellationsToggle = document.querySelector('#constellationsToggle');
const modeBtns = document.querySelectorAll('.mode-btn');
const orbitPeriodSlider = document.querySelector('#orbitPeriodSlider');
const orbitPeriodLabel = document.querySelector('#orbitPeriodLabel');
const earthPhaseOverride = 1.389;
const cityInput = document.querySelector('#cityInput');
const cityDropdown = document.querySelector('#cityDropdown');
const cityPicker = document.querySelector('.city-picker');
const geoBtn = document.querySelector('#geoBtn');
const locationLabel = document.querySelector('#locationLabel');
const skyList = document.querySelector('#skyList');

const LABEL_SCALE = 0.025;
// Сэмплинг 2 дня даёт ≥44 точек на орбиту даже для Mercury (88д) — гладкая кривая.
// Capacity = 20 лет / 2 дня ≈ 3653, округляем до 4096.
const LIVE_TRAIL_SAMPLE_DAYS = 2;
const MAX_TRAIL_SAMPLES_PER_FRAME = 600;
const TRAIL_MAX_AGE_DAYS = 365.25 * 20;
const TRAIL_CAPACITY = 4096;

// Луны: dist — в радиусах родительской планеты; period — реальный сидерический в сутках.
// Размер луны в сценических единицах. Phase — начальный угол на 0 J2000.
const MOONS = {
  Earth: [
    // Inclination 5.145° к эклиптике — ключевая величина для эклипсов: без неё
    // Луна каждое новолуние/полнолуние идеально выровнена с Солнцем и эклипсы
    // происходили бы 24× в год вместо реальных 4-7. Node longitude ~125° (J2000
    // value; реальный node прецессирует с периодом 18.6 года, здесь зафиксирован).
    {
      name: 'Moon', dist: 2.5, period: 27.32, radius: 0.075, color: 0xcfcfcf, phase: 0.5,
      inclination: 5.145, node: 125, eccentricity: 0.0549
      // e=0.0549 — реальная луна. Perigee ~363k km, apogee ~405k km (10% variance).
      // Видно как переменное расстояние от Земли в 3D-сцене (но небольшое визуально).
    }
  ],
  Jupiter: [
    { name: 'Io', dist: 2.0, period: 1.769, radius: 0.10, color: 0xf5d97a, phase: 0.1 },
    { name: 'Europa', dist: 2.55, period: 3.551, radius: 0.09, color: 0xe5dbc6, phase: 1.7 },
    { name: 'Ganymede', dist: 3.25, period: 7.155, radius: 0.13, color: 0xa89b86, phase: 3.2 },
    { name: 'Callisto', dist: 4.25, period: 16.689, radius: 0.115, color: 0x7a6a55, phase: 4.5 }
  ],
  Saturn: [
    { name: 'Titan', dist: 4.5, period: 15.945, radius: 0.13, color: 0xe6a560, phase: 2.1 }
  ],
  Pluto: [
    // Charon — Pluto's largest moon, mutually tidally locked (barycentre actually
    // outside Pluto). Real distance ~17 500 km = 14.7 Pluto radii; compressed to 2.5
    // to match Earth-Moon visual convention.
    { name: 'Charon', dist: 2.5, period: 6.387, radius: 0.045, color: 0xa89684, phase: 1.2 }
  ],
  Eris: [
    // Dysnomia — only known moon of Eris. Real distance ~37 300 km = 32 Eris radii.
    { name: 'Dysnomia', dist: 4.0, period: 15.786, radius: 0.025, color: 0x807a72, phase: 0.4 }
  ]
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);
scene.fog = new THREE.FogExp2(0x020617, 0.0035);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.05, 2600);
camera.position.set(240, 155, 360);

const glContext = canvas.getContext('webgl2', {
  antialias: true,
  powerPreference: 'high-performance'
}) || canvas.getContext('webgl', {
  antialias: true,
  powerPreference: 'high-performance'
});

if (!glContext) {
  const warning = document.createElement('div');
  warning.className = 'webgl-warning';
  warning.textContent = 'WebGL is unavailable in this browser context. Open the app in a normal Chrome/Safari/Firefox window with hardware acceleration enabled.';
  document.querySelector('.panel').append(warning);
  throw new Error('WebGL context is unavailable');
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  context: glContext,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
// minDistance близко к камере near plane (0.05) — позволяет приближаться вплотную
// к планетам и лунам (Земля радиус 0.24, можно подойти до 0.1 = практически в атмосферу).
controls.minDistance = 0.1;
controls.maxDistance = 2400;
controls.target.set(285, 0, 0);
// Touch жесты: один палец = вращение, два = pinch zoom + pan (стандарт мобильных карт).
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN
};
// Авто-пауза при interaction с камерой, когда сфокусирован на теле. Иначе
// быстро движущаяся Луна (период 27d → ~27s real time) "соскальзывает" из
// центра экрана пока юзер пытается её повертеть. Pause только во время drag/zoom,
// и только если режим — focus (не Free), и только если sim ещё не paused юзером.
let pausedByInteraction = false;
controls.addEventListener('start', () => {
  if (focusName !== 'Free' && !paused) {
    pausedByInteraction = true;
    paused = true;
  }
});
controls.addEventListener('end', () => {
  if (pausedByInteraction) {
    paused = false;
    pausedByInteraction = false;
  }
});

const raycaster = new THREE.Raycaster();
// Линии созвездий — тонкие (1 vertex wide), default threshold 1 — попасть невозможно.
// Бампаем до 25 (~ полпикселя при наших дистанциях). На sphere radius 2100 это
// угловой допуск ~0.68° — достаточно широкий для удобства клика, не слишком
// агрессивный чтобы случайно ловить соседние линии.
raycaster.params.Line.threshold = 25;
// Points (asteroid belt, Kuiper belt, Trojans) — point-cloud raycast допуск.
// Default 1 → почти невозможно попасть в один пиксельный астероид. 3 даёт
// комфортное hover на любую "тучу" точек.
raycaster.params.Points.threshold = 3;
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const solarRoot = new THREE.Group();
const galaxyRoot = new THREE.Group();
const starRoot = new THREE.Group();
const trailRoot = new THREE.Group();
scene.add(starRoot, galaxyRoot, trailRoot, solarRoot);

// Освещение:
//   • Ambient: 0.4 — небольшой фон, чтобы ночные стороны не были полностью чёрными,
//     но terminator (граница день/ночь) на Земле читался резко.
//   • PointLight: intensity=1450, distance=520, decay=1.25 — настройки, при которых
//     внутренние планеты видны полноценно освещёнными. Не строгий inverse-square law
//     (тот в Three.js physical mode требует ~170k intensity для эквивалентного
//     визуального результата), но даёт читаемую картину с правильным terminator.
scene.add(new THREE.AmbientLight(0x20304d, 0.4));
const sunLight = new THREE.PointLight(0xfff1b8, 1450, 520, 1.25);
solarRoot.add(sunLight);

const planetObjects = new Map();
const selectable = [];
let simDate = new Date(Date.UTC(2026, 4, 13, 12, 0, 0));
const galacticReferenceDate = new Date(simDate.getTime());
let paused = false;
let focusName = 'Sun';
let cameraMode = 'free';
let lastReferenceFrame = 'galactic';
let lastFocusTarget = new THREE.Vector3();
let hasFocusTarget = false;
let lastTrailDate = new Date(simDate.getTime());
let sunTrail;
let mwTrail; // трейл центра МП — виден только в extragalactic фрейме

// --- Mode (Solar System vs Galactic) ----------------------------------------
const MODE_CONFIG = {
  solar: {
    speed: { min: 0, max: 4, default: 0 }, // 10^0..10^4 days/sec
    camera: { position: [10, 6, 12], target: [0, 0, 0] },
    focus: 'Sun',
    referenceFrame: 'heliocentric',
    showPlanets: true,
    showMW: false,
    showStars: false,
    showConstellations: false
  },
  galactic: {
    // Здесь видна спиральная траектория планет вокруг дрейфующего Солнца + МП фоном.
    // Дефолт 1 year/sec — сейчас спираль читаема, а планетные орбиты не размазаны.
    speed: { min: 0, max: 10, default: 2.56 }, // 10^2.56 ≈ 365 days/sec = 1 year/sec
    camera: { position: [0, 120, 200], target: [0, 0, 0] },
    focus: 'Sun',
    referenceFrame: 'galactic',
    showPlanets: true, // ВАЖНО: показываем планеты — это даёт спиральный след
    showMW: true,
    showStars: true,
    showConstellations: false,
    lockToSun: true // жёсткий lock камеры — лерпится к Sun каждый кадр
  }
};
let currentMode = 'solar';

function setFocus(name, mode = cameraMode) {
  focusName = name;
  focusSelect.value = name;
  cameraMode = mode;
  hasFocusTarget = false;
}

function jumpToFocus(name, offsetOverride = null) {
  const focused = planetObjects.get(name);
  if (!focused) return;
  // Авто-включение соответствующего toggle если фокусимся на скрытом теле.
  // Иначе пользователь zoom'ится в правильную точку, но видит пустоту (тело hidden).
  const dwarfNames = ['Ceres', 'Pluto', 'Haumea', 'Makemake', 'Eris', 'Sedna', 'Charon', 'Dysnomia'];
  const asteroidNames = ['Vesta', 'Pallas', 'Hygiea', 'Juno', 'Eunomia', 'Iris'];
  const cometNames = ['Halley', 'Hale-Bopp'];
  const spacecraftNames = ['Voyager 1', 'Voyager 2', 'New Horizons', 'Parker Solar Probe'];
  if (dwarfNames.includes(name) && !dwarfPlanetsToggle.checked) dwarfPlanetsToggle.checked = true;
  if (asteroidNames.includes(name) && !namedAsteroidsToggle.checked) namedAsteroidsToggle.checked = true;
  if (cometNames.includes(name) && !cometsToggle.checked) cometsToggle.checked = true;
  if (spacecraftNames.includes(name) && !spacecraftToggle.checked) spacecraftToggle.checked = true;
  focused.mesh.getWorldPosition(focused.worldPosition);

  // Автоматический zoom: расстояние камеры подбирается из размера тела.
  // Sun остаётся дальше (glow + сам источник света — близко неудобно).
  // Планеты и луны зумятся гораздо ближе: Земля заполняет ~55% высоты экрана.
  let radius = 1;
  if (focused.data && focused.data.radius) radius = focused.data.radius;
  else if (focused.mesh.geometry?.parameters?.radius) radius = focused.mesh.geometry.parameters.radius;

  const isSun = name === 'Sun';
  const isSpacecraft = focused.isSpacecraft;
  let offset;
  if (offsetOverride) offset = offsetOverride;
  else if (isSun) offset = new THREE.Vector3(radius * 12, radius * 8, radius * 16);
  else if (isSpacecraft) {
    // "Pale Blue Dot" perspective: камера дальше от Солнца чем spacecraft, в
    // том же направлении. Смотрит на spacecraft → за ним вдалеке Солнечная
    // система как яркая точка. Знаменитый ракурс V1 (1990).
    const wpos = focused.worldPosition;
    const distFromSun = wpos.length();
    if (distFromSun > 1) {
      offset = wpos.clone().normalize().multiplyScalar(6);
    } else {
      offset = new THREE.Vector3(3, 2, 5);
    }
  } else offset = new THREE.Vector3(radius * 2, radius * 1.5, radius * 3);
  camera.position.copy(focused.worldPosition).add(offset);
  controls.target.copy(focused.worldPosition);
  setFocus(name, 'free');
  lastFocusTarget.copy(focused.worldPosition);
  hasFocusTarget = true;
}

// --- texture loader & planet materials --------------------------------------
// Реальные текстуры Solar System Scope (CC BY 4.0) в public/textures/.
// В dev — Vite сервит их с корня. В prod (GitHub Pages) сайт живёт по
// /solar-galactic-webgl/, поэтому подмешиваем base через import.meta.env.BASE_URL.
const ASSET_BASE = import.meta.env.BASE_URL; // '/' в dev, '/solar-galactic-webgl/' в prod
function assetUrl(path) {
  return ASSET_BASE + (path.startsWith('/') ? path.slice(1) : path);
}

const textureLoader = new THREE.TextureLoader();

function loadTex(path, srgb = true) {
  const t = textureLoader.load(assetUrl(path));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// Apply optional texture to existing material with graceful fallback:
// если файл есть → texture показывается, цвет нейтральный. Если файла нет
// (404, network error) → material остаётся с solid color, никакого warning.
function applyOptionalTexture(material, path) {
  if (!path) return;
  textureLoader.load(
    assetUrl(path),
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      material.map = tex;
      material.color.setHex(0xffffff); // нейтральный — текстура показывается as-is
      material.needsUpdate = true;
    },
    undefined,
    () => { /* error — оставляем solid color */ }
  );
}

// Optional textures для всех not-currently-textured bodies (dwarf planets, moons).
// Loading логика — оптимистическая: пытаемся загрузить async, при 404 fallback
// остаётся на solid color (тот что в material.color по умолчанию). Файлы должны
// лежать в public/textures/. Рекомендуемые источники качественных JPG (2K equirect):
//   • Solar System Scope (https://www.solarsystemscope.com/textures/) — CC BY 4.0
//     pluto, ceres, makemake, haumea, eris, charon, io, europa, ganymede, callisto, titan
//   • NASA Trek (https://trek.nasa.gov/) — официальные планетарные карты
//   • USGS Astrogeology — Phobos, Deimos
const DWARF_TEXTURES = {
  Pluto: '/textures/pluto.jpg',
  Charon: '/textures/charon.jpg',
  Ceres: '/textures/ceres.jpg',
  Haumea: '/textures/haumea.jpg',
  Makemake: '/textures/makemake.jpg',
  Eris: '/textures/eris.jpg'
};
const MOON_TEXTURES = {
  Io: '/textures/io.jpg',
  Europa: '/textures/europa.jpg',
  Ganymede: '/textures/ganymede.jpg',
  Callisto: '/textures/callisto.jpg',
  Titan: '/textures/titan.jpg',
  Phobos: '/textures/phobos.jpg',
  Deimos: '/textures/deimos.jpg'
  // Dysnomia: пока без текстуры (нет публичных high-res снимков)
};

const PLANET_TEXTURES = {
  Mercury: { map: '/textures/mercury.jpg', roughness: 0.95 },
  Venus: {
    map: '/textures/venus_atmosphere.jpg',
    roughness: 0.85,
    atmosphere: { color: 0xffb56b, intensity: 0.95, exponent: 2.4 }
  },
  Earth: {
    map: '/textures/earth_daymap.jpg',
    emissiveMap: '/textures/earth_nightmap.jpg',
    roughness: 0.78,
    atmosphere: { color: 0x6bb6ff, intensity: 0.75, exponent: 3.0 }
  },
  Mars: {
    map: '/textures/mars.jpg',
    roughness: 0.92,
    atmosphere: { color: 0xff9b7a, intensity: 0.22, exponent: 3.0 }
  },
  Jupiter: {
    map: '/textures/jupiter.jpg',
    roughness: 0.78,
    atmosphere: { color: 0xc9b08a, intensity: 0.4, exponent: 3.5 }
  },
  Saturn: { map: '/textures/saturn.jpg', roughness: 0.78 },
  Uranus: { map: '/textures/uranus.jpg', roughness: 0.78 },
  Neptune: { map: '/textures/neptune.jpg', roughness: 0.78 }
};

// Сидерический период вращения Солнца (на экваторе) и наклон оси к эклиптике.
const SUN_AXIS = { period: 27.0, tilt: 7.25 };

// Сидерический период вращения (дни), осевой наклон (°) и фаза вращения на J2000
// (радианы). Отрицательный период — ретроградное вращение.
// Phase для Земли = GMST на J2000 (Jan 1, 2000, 12:00 UT) = 18.6975 ч = 4.8949 рад
// — необходимо чтобы Greenwich находился в правильной позиции относительно Солнца
// в любой момент real-time. Для других планет не критично (нет фиксированных
// landmark'ов как Greenwich) — используем 0.
const PLANET_AXIS = {
  Mercury: { period: 58.6462, tilt: 0.034, phase: 0 },
  Venus: { period: -243.018, tilt: 177.36, phase: 0 },
  Earth: { period: 0.99727, tilt: 23.44, phase: 4.5299 },
  Mars: { period: 1.02595, tilt: 25.19, phase: 0 },
  Jupiter: { period: 0.41354, tilt: 3.13, phase: 0 },
  Saturn: { period: 0.44401, tilt: 26.73, phase: 0 },
  Uranus: { period: -0.71833, tilt: 97.77, phase: 0 },
  Neptune: { period: 0.67125, tilt: 28.32, phase: 0 }
};

function makePlanetMaterial(planet) {
  const cfg = PLANET_TEXTURES[planet.name];
  if (!cfg) return new THREE.MeshStandardMaterial({ color: planet.color, roughness: 0.9, metalness: 0 });
  const opts = {
    map: loadTex(cfg.map, true),
    roughness: cfg.roughness,
    metalness: 0
  };
  if (cfg.emissiveMap) {
    opts.emissiveMap = loadTex(cfg.emissiveMap, true);
    opts.emissive = new THREE.Color(0xffffff);
    // Intensity подбирается так, чтобы городские огни читались на ночной стороне,
    // но не давали заметного свечения на дневной (фоновое освещение пересиливает).
    opts.emissiveIntensity = 0.9;
  }
  return new THREE.MeshStandardMaterial(opts);
}

function makeEarthClouds(planetRadius) {
  const cloudTex = loadTex('/textures/earth_clouds.jpg', true);
  const geometry = new THREE.SphereGeometry(planetRadius * 1.012, 64, 32);
  const material = new THREE.MeshLambertMaterial({
    map: cloudTex,
    alphaMap: cloudTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.85
  });
  return new THREE.Mesh(geometry, material);
}

// Кольца Сатурна с реальной alpha-текстурой. RingGeometry по умолчанию даёт
// планарные UV; переписываем так, чтобы u шёл от innerRadius к outerRadius —
// иначе 1D-распределение полос лежит на диск некорректно.
function makeSaturnRings(innerR, outerR) {
  const geometry = new THREE.RingGeometry(innerR, outerR, 256, 1);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    uv.setXY(i, (r - innerR) / (outerR - innerR), (angle + Math.PI) / (Math.PI * 2));
  }
  uv.needsUpdate = true;
  const ringMap = loadTex('/textures/saturn_ring_alpha.png', true);
  const material = new THREE.MeshBasicMaterial({
    map: ringMap,
    alphaMap: ringMap,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    alphaTest: 0.02
  });
  return new THREE.Mesh(geometry, material);
}

// --- atmosphere glow --------------------------------------------------------
// Back-face Fresnel-shader на сфере чуть большего радиуса. Аддитивное смешивание,
// без записи в depth — не мешает остальной сцене.
function makeAtmosphereGlow(planetRadius, options) {
  const geometry = new THREE.SphereGeometry(planetRadius * 1.06, 64, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(options.color) },
      glowIntensity: { value: options.intensity },
      glowExponent: { value: options.exponent }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float glowIntensity;
      uniform float glowExponent;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 viewDir = normalize(-vViewPos);
        float fres = pow(1.0 - abs(dot(vNormal, viewDir)), glowExponent);
        gl_FragColor = vec4(glowColor, fres * glowIntensity);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 3;
  return mesh;
}

function makeLabel(text, color = '#e5e7eb') {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d');
  ctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(10, 2.5, 1);
  return sprite;
}

// Orbit line с per-vertex градиентом: яркая дуга впереди планеты, гаснет позади.
// 240 сэмплов даёт визуально гладкую кривую (1.5° на сегмент).
function makeOrbitLine(planet) {
  const N = 360; // 1° на сегмент — гладко на любом разумном зуме
  const points = [];
  for (let step = 0; step < N; step += 1) {
    const sample = new Date(J2000 + (step / N) * planet.a[0] ** 1.5 * 365.25 * MS_PER_DAY);
    points.push(planetState(planet, sample).position);
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const baseColor = new THREE.Color(planet.color);
  const colors = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i += 1) {
    colors[i * 3] = baseColor.r * 0.35;
    colors[i * 3 + 1] = baseColor.g * 0.35;
    colors[i * 3 + 2] = baseColor.b * 0.35;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    fog: false
  });
  const line = new THREE.LineLoop(geometry, lineMat);
  line.renderOrder = 4;
  line.frustumCulled = false;

  const group = new THREE.Group();
  group.add(line);
  group.userData.orbitData = {
    geometry,
    colors,
    baseColor,
    vertexCount: points.length,
    points,
    lastIdx: 0,
    isClosed: true
  };
  return group;
}

// Per-frame: подсветить часть орбиты впереди тела, погасить позади.
// Работает и для закрытых петель (планеты, isClosed=true), и для открытых
// дуг (галактический путь Солнца — окно времени, isClosed=false).
function updateOrbitGradient(orbitObj, bodyPos) {
  const od = orbitObj.userData.orbitData;
  if (!od) return;
  const N = od.vertexCount;
  const closed = od.isClosed;
  // Локальный поиск ближайшего индекса вокруг прошлого. Для открытой дуги
  // clamp к [0, N-1], для закрытой — wrap по модулю.
  let bestIdx = od.lastIdx;
  let bestDist = Infinity;
  const window = 16;
  for (let k = -window; k <= window; k += 1) {
    let i = od.lastIdx + k;
    if (closed) i = ((i % N) + N) % N;
    else if (i < 0 || i >= N) continue;
    const p = od.points[i];
    const dx = p.x - bodyPos.x;
    const dy = p.y - bodyPos.y;
    const dz = p.z - bodyPos.z;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  od.lastIdx = bestIdx;

  const r = od.baseColor.r;
  const g = od.baseColor.g;
  const b = od.baseColor.b;
  const half = N / 2;
  for (let i = 0; i < N; i += 1) {
    let delta = i - bestIdx;
    if (closed) {
      if (delta > half) delta -= N;
      if (delta < -half) delta += N;
    }
    // delta > 0 = впереди по орбите (будущее), < 0 = позади (прошлое)
    let intensity;
    if (delta >= 0) {
      intensity = Math.max(0.18, 1.0 - delta / (N * 0.55));
    } else {
      intensity = Math.max(0.04, 1.0 + delta / (N * 0.22));
    }
    od.colors[i * 3] = r * intensity;
    od.colors[i * 3 + 1] = g * intensity;
    od.colors[i * 3 + 2] = b * intensity;
  }
  od.geometry.attributes.color.needsUpdate = true;
}

function makeTrail(color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(TRAIL_CAPACITY * 3);
  const colors = new Float32Array(TRAIL_CAPACITY * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setDrawRange(0, 0);
  // Под аддитивным смешиванием яркость = RGB. Vertex colors дают плавный
  // переход от горячей головы (saturated white) к тусклому хвосту.
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    fog: false
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 10;
  // Буфер предзаполнен нулями, поэтому bounding sphere съезжает к (0,0,0).
  // Без отключения culling трейл, ушедший далеко от центра сцены, исчезает.
  line.frustumCulled = false;
  return {
    line,
    samples: [], // { point: Vector3, time: number (ms epoch) }
    positions,
    colors,
    capacity: TRAIL_CAPACITY,
    baseColor: new THREE.Color(color)
  };
}

function pushTrailSample(trail, point, timeMs) {
  trail.samples.push({ point: point.clone(), time: timeMs });
  while (trail.samples.length > trail.capacity) trail.samples.shift();
}

function refreshTrail(trail, currentTimeMs) {
  const maxAgeMs = TRAIL_MAX_AGE_DAYS * MS_PER_DAY;
  while (trail.samples.length > 0 && currentTimeMs - trail.samples[0].time > maxAgeMs) {
    trail.samples.shift();
  }
  const n = trail.samples.length;
  const baseR = trail.baseColor.r;
  const baseG = trail.baseColor.g;
  const baseB = trail.baseColor.b;
  // Голова трейла = последние HEAD_LEN сэмплов: бустим яркость и смещаем к белому,
  // даёт ощущение раскалённого ведущего следа кометы.
  const HEAD_LEN = 8;
  const headStart = Math.max(0, n - HEAD_LEN);
  for (let i = 0; i < n; i += 1) {
    const s = trail.samples[i];
    trail.positions[i * 3] = s.point.x;
    trail.positions[i * 3 + 1] = s.point.y;
    trail.positions[i * 3 + 2] = s.point.z;
    const age = (currentTimeMs - s.time) / maxAgeMs;
    const intensity = age < 0 ? 1 : Math.max(0, 1 - age);
    let r = baseR * intensity;
    let g = baseG * intensity;
    let b = baseB * intensity;
    if (i >= headStart) {
      const headT = (i - headStart) / HEAD_LEN; // 0..1, 1 = новейший
      const boost = 1 + headT * 0.9;             // до 1.9× яркости
      const whiteT = headT * 0.45;                // до 45% к белому
      r = Math.min(2.0, r * boost * (1 - whiteT) + whiteT);
      g = Math.min(2.0, g * boost * (1 - whiteT) + whiteT);
      b = Math.min(2.0, b * boost * (1 - whiteT) + whiteT);
    }
    trail.colors[i * 3] = r;
    trail.colors[i * 3 + 1] = g;
    trail.colors[i * 3 + 2] = b;
  }
  trail.line.geometry.setDrawRange(0, n);
  trail.line.geometry.attributes.position.needsUpdate = true;
  trail.line.geometry.attributes.color.needsUpdate = true;
}

// Skybox: реальная панорама звёздного неба Solar System Scope
// (stars_milky_way.jpg, 2K equirectangular). Equirectangular UV-маппинг
// автоматически кладёт яркую полосу МП на экватор геометрии — это совпадает
// с XZ-плоскостью нашей сцены (= галактическая плоскость).
let skyboxMesh = null;
function addSkybox() {
  const tex = loadTex('/textures/stars_milky_way.jpg', true);
  const geometry = new THREE.SphereGeometry(2200, 64, 32);
  const material = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'Milky Way skybox';
  starRoot.add(sky);
  skyboxMesh = sky;
}

// Гибридная визуализация МП — три слоя дают одновременно фотореалистичный
// спиральный рисунок (от ESO-текстуры) и 3D-объём (балдж + звёздное облако):
//
//   1. Плоская текстура (PlaneGeometry с eso1339g, CC BY 4.0) — baseline узор
//      рукавов, видный сверху. Opacity снижена до 0.55, чтобы 3D-слои читались.
//   2. Сферический балдж — MeshBasicMaterial с shader-fresnel падением.
//      Реалистично представляет центральную выпуклость (~3 kpc радиус).
//   3. Тонкий диск звёзд-частиц — сотни точек в плоскости с малой вертикальной
//      толщиной (±5 ед.). Даёт впечатление 3D-структуры с любого угла.
//
// Размер плоского диска: 6.2× GALACTIC_RADIUS_SCENE = 1116 ед. Sun у нас на 180
// от центра (= 8 kpc), диск тянется до ~25 kpc → 180 × 25/8 ≈ 562 (радиус).

// ─── Asteroid belt + Kuiper belt — visual populations ─────────────────────
// Не индивидуальные Kepler-orbit'ы (50k × Kepler-solve/кадр — overkill для
// декоративного облака), а статичные point clouds с очень медленной общей
// ротацией вокруг Солнца. Каждый пояс — один THREE.Points с per-vertex size.
// Подход тот же что у Celestia/Stellarium для процедурных популяций.

// Kirkwood gaps — резонансы средней мощности с Юпитером, в которых астероиды
// нестабильны (выметаются за ~10⁶ лет). Видны как тёмные кольца в распределении.
const KIRKWOOD_GAPS = [
  { a: 2.06, w: 0.04 }, // 4:1 резонанс
  { a: 2.50, w: 0.05 }, // 3:1 — Hestia gap
  { a: 2.82, w: 0.04 }, // 5:2
  { a: 2.96, w: 0.03 }, // 7:3
  { a: 3.27, w: 0.06 }  // 2:1 — Hecuba gap, самый широкий
];

function isInKirkwoodGap(a) {
  for (const g of KIRKWOOD_GAPS) if (Math.abs(a - g.a) < g.w) return true;
  return false;
}

function buildBeltShaderMaterial() {
  // Per-vertex size shader: каждая точка имеет свой размер sprite.
  // Аддитивный блендинг здесь НЕ используется — это твёрдые тела, не свет.
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        // Круглый sprite вместо квадратного (gl_PointCoord — UV точки 0..1)
        vec2 d = gl_PointCoord - vec2(0.5);
        if (length(d) > 0.5) discard;
        gl_FragColor = vec4(vColor, 0.85);
      }
    `
  });
}

// Главный пояс астероидов: 15 k точек между Mars и Jupiter (2.1-3.5 AU) с
// гауссовским пиком плотности у 2.7 AU и провалами Kirkwood. Толщина ±0.15 AU.
function createAsteroidBelt() {
  const N = 15000;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const color = new THREE.Color();
  let written = 0;
  while (written < N) {
    // Сумма трёх uniform ≈ гауссиан, центр 2.7 AU
    const r = 2.7 + ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 1.4;
    if (r < 2.1 || r > 3.5 || isInKirkwoodGap(r)) continue;
    const theta = Math.random() * Math.PI * 2;
    // Гауссово приближение по вертикали (±0.15 AU = ±1.65 сцен. ед.)
    const yAu = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 0.3;
    positions[written * 3] = r * Math.cos(theta) * AU_SCALE;
    positions[written * 3 + 1] = yAu * AU_SCALE;
    positions[written * 3 + 2] = r * Math.sin(theta) * AU_SCALE;
    // Цвет: brown-grey диапазон — типично для C/S/M-type астероидов
    color.setHSL(0.07 + Math.random() * 0.05, 0.25 + Math.random() * 0.2, 0.32 + Math.random() * 0.22);
    colors[written * 3] = color.r;
    colors[written * 3 + 1] = color.g;
    colors[written * 3 + 2] = color.b;
    // Размер: большинство 1 px, редкие 1.5-2 px (как ярче-астероиды)
    sizes[written] = 0.7 + Math.random() * (Math.random() < 0.05 ? 1.5 : 0.6);
    written += 1;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const points = new THREE.Points(geom, buildBeltShaderMaterial());
  points.name = 'Asteroid belt';
  points.renderOrder = 2;
  points.frustumCulled = false;
  return points;
}

// Пояс Койпера: 25 k точек, две компоненты —
//   • Classical (cold) belt: 39-48 AU, низкие e и i (5:2 резонанс с Neptune на 39.4)
//   • Scattered disc: 50-100 AU, высокие i (до 30°)
// Цвет: icy blue-white (CH₄/H₂O лёд).
function createKuiperBelt() {
  const N = 25000;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const color = new THREE.Color();
  let written = 0;
  while (written < N) {
    let r, inclMax;
    if (Math.random() < 0.7) {
      // Classical belt — плоский, узкий
      r = 39 + Math.random() * 11; // 39-50 AU
      inclMax = 0.07; // ±4°
    } else {
      // Scattered disc — широкий, наклонённый
      r = 30 + Math.pow(Math.random(), 0.5) * 70; // 30-100 AU, biased к ближе
      inclMax = 0.5; // до ±29°
    }
    const theta = Math.random() * Math.PI * 2;
    const incl = (Math.random() - 0.5) * 2 * inclMax;
    const sinIncl = Math.sin(incl);
    const cosIncl = Math.cos(incl);
    positions[written * 3] = r * Math.cos(theta) * AU_SCALE;
    positions[written * 3 + 1] = r * sinIncl * AU_SCALE;
    positions[written * 3 + 2] = r * Math.sin(theta) * cosIncl * AU_SCALE;
    // Цвет: ice blue-white до light grey
    color.setHSL(0.55 + Math.random() * 0.10, 0.18 + Math.random() * 0.15, 0.55 + Math.random() * 0.25);
    colors[written * 3] = color.r;
    colors[written * 3 + 1] = color.g;
    colors[written * 3 + 2] = color.b;
    sizes[written] = 0.6 + Math.random() * (Math.random() < 0.03 ? 1.8 : 0.5);
    written += 1;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const points = new THREE.Points(geom, buildBeltShaderMaterial());
  points.name = 'Kuiper belt';
  points.renderOrder = 2;
  points.frustumCulled = false;
  return points;
}

// Jupiter Trojans — две группы астероидов в стабильных точках Лагранжа L4 и L5
// (60° впереди и позади Jupiter в его орбите). Реальных Trojans известно
// ~12 000 (Greeks at L4) + ~5 000 (Trojans at L5).
//
// Подход: точки генерируются в локальном фрейме (Jupiter at scene angle 0°),
// затем anchor-group вращается по Y чтобы следовать за реальной угловой
// позицией Jupiter каждый frame. Локально:
//   L4 кластер: angle = +60° ± libration
//   L5 кластер: angle = −60° ± libration
//
// Libration: реальное движение астероида вокруг точки Лагранжа — tadpole
// orbit с амплитудой ~10° по углу + ~0.3 AU по радиусу + ~10° по инклинации.
// Период libration ~150-200 лет — намного медленнее frame-rate, поэтому
// показываем статическое snapshot распределения.
function createJupiterTrojans() {
  const N_PER_CLUSTER = 2500;
  const N = N_PER_CLUSTER * 2;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const color = new THREE.Color();
  const JUPITER_A = 5.2; // AU — same as Jupiter's semi-major axis
  for (let cluster = 0; cluster < 2; cluster += 1) {
    // L4 ahead (+60°), L5 behind (−60°). В нашей сцене orbits CCW глядя с +Y,
    // т.е. "ahead" = larger angle. Будет повёрнуто anchor'ом.
    const baseAngle = cluster === 0 ? 60 * DEG : -60 * DEG;
    for (let i = 0; i < N_PER_CLUSTER; i += 1) {
      // Tadpole libration в угле — гауссиан σ=8°
      const angleJitter = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * 8 * DEG;
      const angle = baseAngle + angleJitter;
      // Радиальная libration — гауссиан σ=0.15 AU
      const rJitter = ((Math.random() + Math.random()) - 1) * 0.3;
      const r = JUPITER_A + rJitter;
      // Инклинация ±10°
      const incl = (Math.random() - 0.5) * 2 * 10 * DEG;
      const sinI = Math.sin(incl);
      const cosI = Math.cos(incl);
      const idx = cluster * N_PER_CLUSTER + i;
      positions[idx * 3] = r * Math.cos(angle) * cosI * AU_SCALE;
      positions[idx * 3 + 1] = r * sinI * AU_SCALE;
      positions[idx * 3 + 2] = r * Math.sin(angle) * cosI * AU_SCALE;
      // Цвет: D-type asteroids — тёмные, красноватые (типично для Trojans)
      color.setHSL(0.03 + Math.random() * 0.05, 0.3 + Math.random() * 0.2, 0.3 + Math.random() * 0.18);
      colors[idx * 3] = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;
      sizes[idx] = 0.7 + Math.random() * (Math.random() < 0.04 ? 1.6 : 0.5);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const points = new THREE.Points(geom, buildBeltShaderMaterial());
  points.name = 'Jupiter Trojans';
  points.renderOrder = 2;
  points.frustumCulled = false;
  // Anchor — group что вращается чтобы следовать за реальной угловой позицией Jupiter
  const anchor = new THREE.Group();
  anchor.name = 'Trojans anchor';
  anchor.add(points);
  return anchor;
}

// Comet tail — billboard plane vertices от 0 (nucleus) до 1 (хвост далеко).
// Width 2, length 1 — масштабируется per-frame по intensity (1/r²).
// Ориентация per-frame: Y-ось вдоль anti-solar direction, плоскость поворачивается
// вокруг этой оси чтобы лицом к камере (cylindrical billboard).
const COMET_TAIL_MAX_LENGTH = 18; // scene units = ~1.6 AU
function createCometTail(tailColor) {
  const geom = new THREE.PlaneGeometry(1.4, COMET_TAIL_MAX_LENGTH, 1, 1);
  geom.translate(0, COMET_TAIL_MAX_LENGTH / 2, 0); // origin at one end (head)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      tailColor: { value: new THREE.Color(tailColor) },
      intensity: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 tailColor;
      uniform float intensity;
      varying vec2 vUv;
      void main() {
        // vUv.y: 0 = nucleus end (bright), 1 = far end (transparent)
        float lengthFade = pow(1.0 - vUv.y, 1.6);
        // vUv.x: 0..1 across width, alpha gauss-like falloff at edges
        float widthFade = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.4);
        float a = lengthFade * widthFade * intensity;
        // Тёплая голова, холодный хвост — лёгкая color-shift по длине
        vec3 c = mix(vec3(1.0, 0.95, 0.85), tailColor, vUv.y);
        gl_FragColor = vec4(c, a);
      }
    `
  });
  const mesh = new THREE.Mesh(geom, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return mesh;
}

// Каждая комета — { nucleus, tail, state, data }. Nucleus и tail — direct
// children of solarRoot. Tail имеет independent matrix update (anti-solar).
function createComet(cometData) {
  const nucleusGeom = new THREE.SphereGeometry(cometData.radius, 16, 8);
  const nucleusMat = new THREE.MeshStandardMaterial({
    color: cometData.color,
    emissive: cometData.tailColor || 0xccccdd,
    emissiveIntensity: 0.4,
    roughness: 1,
    metalness: 0
  });
  const nucleus = new THREE.Mesh(nucleusGeom, nucleusMat);
  nucleus.name = cometData.name;
  nucleus.userData = { label: cometData.name, type: 'comet', comet: cometData };
  const tail = createCometTail(cometData.tailColor || 0x9ec5ff);
  // Декларируем optional поля upfront — иначе TS не знает что мы их добавим
  // ниже в buildScene (label, trail, orbit). Заполняются позже.
  return {
    nucleus, tail, data: cometData, state: null,
    label: /** @type {THREE.Sprite | null} */ (null),
    trail: /** @type {any} */ (null),
    orbit: /** @type {THREE.Group | null} */ (null)
  };
}

// Spacecraft icon — рисуется в canvas один раз и используется как sprite texture.
// Cross + circle — традиционный navigation symbol в orbital diagrams.
function makeSpacecraftIcon(hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const cssColor = `#${hexColor.toString(16).padStart(6, '0')}`;
  ctx.strokeStyle = cssColor;
  ctx.fillStyle = cssColor;
  ctx.lineWidth = 3;
  // Outer ring
  ctx.beginPath();
  ctx.arc(32, 32, 14, 0, Math.PI * 2);
  ctx.stroke();
  // Cross
  ctx.beginPath();
  ctx.moveTo(32, 4); ctx.lineTo(32, 60);
  ctx.moveTo(4, 32); ctx.lineTo(60, 32);
  ctx.stroke();
  // Center dot
  ctx.beginPath();
  ctx.arc(32, 32, 3, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createSpacecraft(craftData) {
  const tex = makeSpacecraftIcon(craftData.color);
  const spriteMat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3, 3, 1); // scene units — visible at far distances too
  sprite.name = craftData.name;
  // Voyagers at 165+ AU могут быть очень далеко от центра; disable culling гарантирует
  // что они всегда рендерятся пока их добавили в scene.
  sprite.frustumCulled = false;
  sprite.userData = { label: craftData.name, type: 'spacecraft', spacecraft: craftData };

  // Trajectory line — faint additive линия от Sun до текущей позиции spacecraft.
  // Решает проблему "континуального пространства": визуально соединяет внутреннюю
  // солнечную систему с далёким Voyager. Обновляется per-frame.
  const trajGeom = new THREE.BufferGeometry();
  const trajPositions = new Float32Array(6); // [x0,y0,z0, x1,y1,z1]
  trajGeom.setAttribute('position', new THREE.BufferAttribute(trajPositions, 3));
  const trajMat = new THREE.LineBasicMaterial({
    color: craftData.color,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const trajLine = new THREE.Line(trajGeom, trajMat);
  trajLine.frustumCulled = false;
  trajLine.renderOrder = 4;

  return {
    sprite, trajLine, data: craftData, state: null, position: new THREE.Vector3(),
    label: /** @type {THREE.Sprite | null} */ (null),
    trail: /** @type {any} */ (null)
  };
}

// Compute spacecraft position at given simDate.
// Returns null if before launchDate (spacecraft не существует ещё).
function computeSpacecraftPosition(craftData, simDate) {
  const launch = new Date(craftData.launchDate);
  if (simDate.getTime() < launch.getTime()) return null;
  const motion = craftData.motion;
  if (motion.type === 'linear') {
    const yearsSinceJ2000 = (simDate.getTime() - J2000) / (365.25 * MS_PER_DAY);
    return new THREE.Vector3(
      (motion.posAtJ2000[0] + motion.velocity[0] * yearsSinceJ2000) * AU_SCALE,
      (motion.posAtJ2000[1] + motion.velocity[1] * yearsSinceJ2000) * AU_SCALE,
      (motion.posAtJ2000[2] + motion.velocity[2] * yearsSinceJ2000) * AU_SCALE
    );
  }
  if (motion.type === 'kepler') {
    return planetState(motion, simDate).position;
  }
  return null;
}

// Apsis position для planet: true anomaly ν=0 (perihelion) или ν=π (aphelion).
// Не зависит от mean anomaly (т.е. от текущей даты), только от orbital elements.
function apsisPosition(planet, trueAnomaly, simDate) {
  const days = (simDate.getTime() - J2000) / MS_PER_DAY;
  const centuries = days / 36525;
  const a = elementAt(planet.a, centuries);
  const e = elementAt(planet.e, centuries);
  const i = elementAt(planet.i, centuries) * DEG;
  const longPeri = elementAt(planet.longPeri, centuries) * DEG;
  const longNode = elementAt(planet.longNode, centuries) * DEG;
  const argPeri = longPeri - longNode;
  const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));
  const u = trueAnomaly + argPeri;
  const cosO = Math.cos(longNode), sinO = Math.sin(longNode);
  const cosI = Math.cos(i), sinI = Math.sin(i);
  const cosU = Math.cos(u), sinU = Math.sin(u);
  const x = r * (cosO * cosU - sinO * sinU * cosI);
  const z = r * (sinO * cosU + cosO * sinU * cosI);
  const y = r * (sinU * sinI);
  return new THREE.Vector3(x * AU_SCALE, y * AU_SCALE, z * AU_SCALE);
}

function createApsidesMarkers() {
  const group = new THREE.Group();
  group.name = 'Apsides';
  for (const planet of planets) {
    // Маленькие markers — sphere meshes. Perihelion красный (горячий, ближе к Sun),
    // aphelion синий (холодный, дальше).
    const peri = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.85, depthWrite: false })
    );
    peri.userData = { type: 'apsis', kind: 'perihelion', planet: planet.name, label: `Perihelion-${planet.name}` };
    peri.renderOrder = 5;
    const apo = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85, depthWrite: false })
    );
    apo.userData = { type: 'apsis', kind: 'aphelion', planet: planet.name, label: `Aphelion-${planet.name}` };
    apo.renderOrder = 5;
    group.add(peri);
    group.add(apo);
    apsidesMarkers.push({ peri, apo, planet });
  }
  return group;
}

// Lagrange points (Sun-Earth система) — 5 точек гравитационного равновесия.
//   L1: между Sun и Earth (0.99 AU) — SOHO, DSCOVR
//   L2: за Earth, по anti-Sun (1.01 AU) — JWST, Gaia, Euclid
//   L3: на противоположной стороне Sun (−1 AU) — никто не размещён
//   L4: 60° впереди Earth по орбите — Earth Trojans (2010 TK7)
//   L5: 60° позади Earth — theoretical Trojans
//
// Маркеры — sprite с canvas-icon. Position обновляется per-frame по Earth's position.
function makeLagrangeIcon(label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const cssColor = `#${color.toString(16).padStart(6, '0')}`;
  ctx.strokeStyle = cssColor;
  ctx.fillStyle = cssColor;
  ctx.lineWidth = 2.5;
  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(32, 8); ctx.lineTo(56, 32); ctx.lineTo(32, 56); ctx.lineTo(8, 32); ctx.closePath();
  ctx.stroke();
  // Label inside
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 32, 34);
  return new THREE.CanvasTexture(canvas);
}

function createLagrangePoints() {
  const group = new THREE.Group();
  group.name = 'Sun-Earth Lagrange';
  const colors = { L1: 0xfde047, L2: 0xa78bfa, L3: 0x94a3b8, L4: 0x86efac, L5: 0x86efac };
  for (const ptName of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    const tex = makeLagrangeIcon(ptName, colors[ptName]);
    const mat = new THREE.SpriteMaterial({
      map: tex, color: 0xffffff, transparent: true,
      depthWrite: false, fog: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.6, 0.6, 1);
    sprite.frustumCulled = false;
    sprite.userData = { type: 'lagrange', label: `Lagrange${ptName}` };
    group.add(sprite);
    lagrangeSprites.push({ sprite, name: ptName });
  }
  return group;
}

// Heliosphere boundary visualization — two semi-transparent spheres:
//   • Termination shock at ~94 AU — где solar wind замедляется от supersonic
//   • Heliopause at ~120 AU — фактическая граница Солнечной системы (solar wind
//     встречает interstellar medium). Voyager 1 пересёк в 2012, Voyager 2 в 2018.
// Render: BackSide + low opacity + additive. Видны как мягкие сферы.
function createHeliosphere() {
  const group = new THREE.Group();
  group.name = 'Heliosphere boundaries';

  // Termination shock — внутренняя сфера, голубоватая
  const shockGeom = new THREE.SphereGeometry(94 * AU_SCALE, 64, 32);
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.05,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  const shock = new THREE.Mesh(shockGeom, shockMat);
  shock.userData = { type: 'population', label: 'TerminationShock' };
  shock.renderOrder = 1;
  group.add(shock);

  // Heliopause — внешняя сфера, фиолетовая (где гелиосфера встречает ISM)
  const hpGeom = new THREE.SphereGeometry(120 * AU_SCALE, 64, 32);
  const hpMat = new THREE.MeshBasicMaterial({
    color: 0xa78bfa,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });
  const hp = new THREE.Mesh(hpGeom, hpMat);
  hp.userData = { type: 'population', label: 'Heliopause' };
  hp.renderOrder = 1;
  group.add(hp);

  return group;
}

function addMilkyWayDisk() {
  // ── Слой 1 (плоская ESO-текстура) — УДАЛЁН ─────────────────────────────
  // Плоский PlaneGeometry со sticker-видом галактики не имел физического смысла
  // (вид сверху на 3D-объект в 3D-сцене даёт ощущение «наклейки»). Оставлены
  // только volumetric-слои ниже, которые физически репрезентируют структуру МП:
  // балдж (сфера), тонкий диск, толстый диск, гало.

  // Bulge (жёлтая сфера в позиции Sgr A*) удалён по решению дизайна:
  // выделение центра противоречит идее "движение без видимого центра МП".
  // Реальный Sgr A* — сверхмассивная чёрная дыра, визуально невидим.
  // Bulge — это распределённое звёздное население, не точечный объект; в
  // диск-слоях его звёзды учтены через повышенную плотность точек у центра.

  const bulgeRadius = 70; // используется ниже в плотности диска

  // ── Слой 3: тонкий диск (thin disk) ──────────────────────────────────────
  // Молодые звёзды (популяция I) — голубоватые O/B/A в рукавах + жёлтые G на радии Солнца.
  // Реальная толщина ~700 пк → ±11 ед. в нашей сцене (1 kpc = 22.5 ед.).
  // Aspect ratio диска (radius : thickness) ~1:50 — соответствует реальности.
  const diskRadius = GALACTIC_RADIUS_SCENE * 3.1;
  const thinDiskCount = 6000;
  const thinPositions = new Float32Array(thinDiskCount * 3);
  const thinColors = new Float32Array(thinDiskCount * 3);
  const color = new THREE.Color();
  let written = 0;
  while (written < thinDiskCount) {
    const r = -Math.log(Math.random() + 0.005) * diskRadius * 0.32;
    if (r > diskRadius) continue;
    const theta = Math.random() * Math.PI * 2;
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    // Толщина: внутри балджа сферическая, снаружи — тонкий диск ±11 ед.
    let y;
    if (r < bulgeRadius * 0.8) {
      y = (Math.random() - 0.5) * bulgeRadius * 1.2 * Math.exp(-r / 40);
    } else {
      // Гауссово приближение через сумму трёх random — выглядит естественнее равномерного.
      const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      y = g * 11;
    }
    thinPositions[written * 3] = x;
    thinPositions[written * 3 + 1] = y;
    thinPositions[written * 3 + 2] = z;
    const distNorm = Math.min(r / diskRadius, 1);
    color.setHSL(0.55 + 0.10 * distNorm, 0.4, 0.55 + 0.20 * (1 - distNorm));
    thinColors[written * 3] = color.r;
    thinColors[written * 3 + 1] = color.g;
    thinColors[written * 3 + 2] = color.b;
    written += 1;
  }
  const thinGeom = new THREE.BufferGeometry();
  thinGeom.setAttribute('position', new THREE.BufferAttribute(thinPositions, 3));
  thinGeom.setAttribute('color', new THREE.BufferAttribute(thinColors, 3));
  const thinDisk = new THREE.Points(thinGeom, new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false,
    fog: false
  }));
  thinDisk.position.set(0, 0, -GALACTIC_RADIUS_SCENE);
  thinDisk.name = 'Milky Way thin disk';
  thinDisk.renderOrder = 6;
  thinDisk.frustumCulled = false;
  galaxyRoot.add(thinDisk);

  // ── Слой 4: толстый диск (thick disk) ────────────────────────────────────
  // Старые звёзды (популяция II), более жёлто-оранжевые. Реальная толщина ~2-3 kpc
  // → ±30 ед. Гало менее плотное, чем тонкий диск.
  const thickDiskCount = 900;
  const thickPositions = new Float32Array(thickDiskCount * 3);
  const thickColors = new Float32Array(thickDiskCount * 3);
  written = 0;
  while (written < thickDiskCount) {
    const r = -Math.log(Math.random() + 0.005) * diskRadius * 0.38;
    if (r > diskRadius) continue;
    const theta = Math.random() * Math.PI * 2;
    const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    thickPositions[written * 3] = r * Math.cos(theta);
    thickPositions[written * 3 + 1] = g * 30;
    thickPositions[written * 3 + 2] = r * Math.sin(theta);
    // Жёлтые/оранжевые — старые K/G звёзды Population II.
    color.setHSL(0.10 + Math.random() * 0.05, 0.45, 0.55);
    thickColors[written * 3] = color.r;
    thickColors[written * 3 + 1] = color.g;
    thickColors[written * 3 + 2] = color.b;
    written += 1;
  }
  const thickGeom = new THREE.BufferGeometry();
  thickGeom.setAttribute('position', new THREE.BufferAttribute(thickPositions, 3));
  thickGeom.setAttribute('color', new THREE.BufferAttribute(thickColors, 3));
  const thickDisk = new THREE.Points(thickGeom, new THREE.PointsMaterial({
    size: 1.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false,
    fog: false
  }));
  thickDisk.position.set(0, 0, -GALACTIC_RADIUS_SCENE);
  thickDisk.name = 'Milky Way thick disk';
  thickDisk.renderOrder = 6;
  thickDisk.frustumCulled = false;
  galaxyRoot.add(thickDisk);

  // Halo (сферическая оболочка из 2000 звёзд вокруг центра МП) удалён.
  // Хотя физически halo существует (Population II + globular clusters),
  // визуально создаёт впечатление "галактика в снежном шаре": пользователь
  // видит чёткую границу сферы вокруг диска, что противоречит реальности —
  // halo очень разреженный и в честной симуляции просто не виден глазу.
  // Звёздный фон обеспечивает skybox (панорама stars_milky_way.jpg).
}

// --- Stars & constellations (Hipparcos + IAU 88) ---------------------------
// Данные из d3-celestial (https://github.com/ofrohn/d3-celestial), MIT license.
// Каталог звёзд: ~4500 звёзд видимых невооружённым глазом (mag ≤ 6).
// Линии созвездий: 88 IAU фигур.
// Координаты в файлах — J2000 экваториальные (RA, Dec в градусах).
// Конвертация: equatorial → galactic → scene (см. orbitalModel.js).

const STAR_SPHERE_RADIUS = 2120; // чуть внутри skybox (2200), снаружи всего остального
const CONSTELLATION_SPHERE_RADIUS = 2100;

const starsGroup = new THREE.Group();
const constellationsGroup = new THREE.Group();
constellationsGroup.visible = false; // off по умолчанию (создаёт визуальный шум)
starRoot.add(starsGroup);
starRoot.add(constellationsGroup);

// B-V color index → приблизительный RGB цвет звезды.
// Холодные (BV > 1.5, M-type) красноватые; горячие (BV < 0, O/B-type) голубоватые.
// Солнце ≈ BV 0.65 (жёлто-белый).
function bvToColor(bv) {
  const t = Math.max(-0.4, Math.min(2.0, isNaN(bv) ? 0.6 : bv));
  let r, g, b;
  if (t < 0.0) {
    r = 0.65 + 0.35 * (t + 0.4) / 0.4;
    g = 0.78 + 0.17 * (t + 0.4) / 0.4;
    b = 1.0;
  } else if (t < 0.7) {
    r = 1.0;
    g = 0.95 - 0.15 * (t / 0.7);
    b = 0.95 - 0.5 * (t / 0.7);
  } else if (t < 1.5) {
    r = 1.0;
    g = 0.80 - 0.25 * ((t - 0.7) / 0.8);
    b = 0.45 - 0.3 * ((t - 0.7) / 0.8);
  } else {
    r = 1.0 - 0.05 * ((t - 1.5) / 0.5);
    g = 0.55 - 0.15 * ((t - 1.5) / 0.5);
    b = 0.15;
  }
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

function buildStarsMesh(starsJson) {
  const features = starsJson.features;
  const n = features.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const f = features[i];
    const [raDeg, decDeg] = f.geometry.coordinates;
    const v = radecToSceneVec3(raDeg * DEG, decDeg * DEG, STAR_SPHERE_RADIUS);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    const mag = f.properties.mag;
    // Эмпирический размер: яркие mag 0-1 заметные, mag 6 — едва видны.
    // Базовое масштабирование увеличено, чтобы звёзды читались поверх MW-skybox.
    sizes[i] = Math.max(1.2, 9.0 - mag * 1.3);
    const [cr, cg, cb] = bvToColor(parseFloat(f.properties.bv));
    // Без сильного затухания по mag — пусть тусклые тоже видны, но мельче.
    const dim = Math.max(0.55, 1.0 - mag * 0.08);
    colors[i * 3] = cr * dim;
    colors[i * 3 + 1] = cg * dim;
    colors[i * 3 + 2] = cb * dim;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  // ShaderMaterial — для per-vertex размера + круглый sprite via gl_PointCoord.
  // ВАЖНО: в кастомном ShaderMaterial атрибут `color` НЕ объявляется автоматически
  // даже при vertexColors: true (это только для built-in материалов). Декларируем явно.
  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        // Круглый sprite с мягким спадом яркости от центра.
        vec2 d = gl_PointCoord - vec2(0.5);
        float r = length(d) * 2.0;
        if (r > 1.0) discard;
        float a = pow(1.0 - r, 1.4);
        gl_FragColor = vec4(vColor, a);
      }
    `
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'Hipparcos bright stars';
  points.frustumCulled = false;
  return points;
}

function buildConstellationLines(linesJson) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    fog: false
  });
  for (const f of linesJson.features) {
    const multi = f.geometry.coordinates; // array of LineString-coordinate arrays
    for (const lineCoords of multi) {
      if (lineCoords.length < 2) continue;
      const pts = lineCoords.map(([ra, dec]) =>
        radecToSceneVec3(ra * DEG, dec * DEG, CONSTELLATION_SPHERE_RADIUS)
      );
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, material);
      line.frustumCulled = false;
      // Маркируем для raycast'а — type='constellation' + ID из JSON ('Ori', 'UMa', etc.)
      line.userData = { type: 'constellation', constellationId: f.id, label: f.id };
      group.add(line);
      selectable.push(line);
    }
  }
  group.name = 'IAU constellations';
  return group;
}

async function loadSkyCatalog() {
  try {
    const [stars, lines] = await Promise.all([
      fetch(assetUrl('/data/stars.6.json')).then((r) => r.json()),
      fetch(assetUrl('/data/constellations.lines.json')).then((r) => r.json())
    ]);
    starsGroup.add(buildStarsMesh(stars));
    constellationsGroup.add(buildConstellationLines(lines));
  } catch (e) {
    console.error('Failed to load sky catalog:', e);
  }
}

let galaxyPath = null;
function addGalaxyPath() {
  if (galaxyPath) {
    galaxyRoot.remove(galaxyPath);
    galaxyPath.geometry.dispose();
    galaxyPath.material.dispose();
  }
  const points = [];
  for (let year = -3; year <= 14; year += 0.05) {
    const sample = new Date(galacticReferenceDate.getTime() + year * 365.25 * MS_PER_DAY);
    const p = sunGalacticPosition(sample, galacticReferenceDate);
    points.push(new THREE.Vector3(p.x, -0.02, p.z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const baseColor = new THREE.Color(0x38bdf8);
  const colors = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i += 1) {
    colors[i * 3] = baseColor.r * 0.35;
    colors[i * 3 + 1] = baseColor.g * 0.35;
    colors[i * 3 + 2] = baseColor.b * 0.35;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    fog: false
  });
  const path = new THREE.Line(geometry, material);
  path.name = 'Sun galactic orbit path';
  path.renderOrder = 7;
  path.frustumCulled = false;
  path.userData.orbitData = {
    geometry,
    colors,
    baseColor,
    vertexCount: points.length,
    points,
    lastIdx: 0,
    isClosed: false
  };
  galaxyPath = path;
  galaxyRoot.add(path);

  // Маркер центра МП (раньше — синяя сфера) убран: ничего общего с реальной
  // Sgr A* (сверхмассивная чёрная дыра, визуально невидимая). Балдж в
  // addMilkyWayDisk даёт правильное визуальное представление центрального
  // региона — жёлто-оранжевый сферический glow от старых звёзд.
}

let asteroidBeltMesh = null;
let kuiperBeltMesh = null;
let trojansAnchor = null;
let heliopauseGroup = null;
let lagrangeGroup = null;
const lagrangeSprites = []; // [{ sprite, label, name }]
let apsidesGroup = null;
const apsidesMarkers = []; // [{ peri: Mesh, apo: Mesh, planet }]
const cometObjects = []; // [{ nucleus, tail, data, state, orbit?, label, trail }]
const spacecraftObjects = []; // [{ sprite, data, position, label, trail }]

function buildScene() {
  addSkybox();
  addMilkyWayDisk();
  addGalaxyPath();
  loadSkyCatalog(); // async — звёзды и созвездия появятся когда загрузятся

  // Asteroid + Kuiper belts: добавляем в solarRoot чтобы они автоматически
  // двигались вместе с Солнцем в galactic mode (Солнце дрейфует — пояса с ним).
  // Видимость управляется per-frame в updateScene по toggles.
  asteroidBeltMesh = createAsteroidBelt();
  asteroidBeltMesh.visible = false;
  asteroidBeltMesh.userData = { type: 'population', label: 'AsteroidBelt' };
  solarRoot.add(asteroidBeltMesh);
  selectable.push(asteroidBeltMesh);
  kuiperBeltMesh = createKuiperBelt();
  kuiperBeltMesh.visible = false;
  kuiperBeltMesh.userData = { type: 'population', label: 'KuiperBelt' };
  solarRoot.add(kuiperBeltMesh);
  selectable.push(kuiperBeltMesh);
  heliopauseGroup = createHeliosphere();
  heliopauseGroup.visible = false;
  solarRoot.add(heliopauseGroup);
  // Помечаем child-meshes для hover
  heliopauseGroup.traverse((obj) => {
    if (obj.isMesh && obj.userData.label) selectable.push(obj);
  });

  lagrangeGroup = createLagrangePoints();
  lagrangeGroup.visible = false;
  solarRoot.add(lagrangeGroup);
  for (const lp of lagrangeSprites) selectable.push(lp.sprite);

  apsidesGroup = createApsidesMarkers();
  apsidesGroup.visible = false;
  solarRoot.add(apsidesGroup);
  for (const m of apsidesMarkers) {
    selectable.push(m.peri);
    selectable.push(m.apo);
  }

  trojansAnchor = createJupiterTrojans();
  trojansAnchor.visible = false;
  // anchor — Group, raycast целиком не работает. Помечаем child-points внутри.
  trojansAnchor.traverse((obj) => {
    if (obj.isPoints) {
      obj.userData = { type: 'population', label: 'JupiterTrojans' };
      selectable.push(obj);
    }
  });
  solarRoot.add(trojansAnchor);

  // Comets — nucleus + tail + label + trail + (опционально) orbit line.
  for (const cometData of comets) {
    const c = createComet(cometData);
    solarRoot.add(c.nucleus);
    solarRoot.add(c.tail);
    selectable.push(c.nucleus);
    c.label = makeLabel(cometData.name, '#bbf7d0');
    c.label.scale.set(5, 1.3, 1);
    solarRoot.add(c.label);
    c.trail = makeTrail(cometData.tailColor || 0x9ec5ff);
    trailRoot.add(c.trail.line);
    if (!cometData.extremeOrbit) {
      c.orbit = makeOrbitLine(cometData);
      solarRoot.add(c.orbit);
    }
    c.nucleus.visible = false;
    c.tail.visible = false;
    c.label.visible = false;
    c.trail.line.visible = false;
    if (c.orbit) c.orbit.visible = false;
    cometObjects.push(c);
    // Регистрируем в planetObjects чтобы focus dropdown и tooltip card работали.
    planetObjects.set(cometData.name, {
      mesh: c.nucleus,
      orbit: c.orbit || null,
      label: c.label,
      trail: c.trail,
      moonAnchor: null,
      moons: [],
      state: null,
      worldPosition: new THREE.Vector3(),
      isComet: true
    });
  }

  // Spacecraft — sprite + label + trail. Без статичной орбиты (траектории —
  // гиперболические escape или PSP-elliptic, в обоих случаях рисуем только trail).
  for (const craftData of spacecraft) {
    const c = createSpacecraft(craftData);
    solarRoot.add(c.sprite);
    solarRoot.add(c.trajLine);
    selectable.push(c.sprite);
    c.label = makeLabel(craftData.name, '#e0e7ff');
    c.label.scale.set(4.5, 1.15, 1);
    solarRoot.add(c.label);
    c.trail = makeTrail(craftData.color);
    trailRoot.add(c.trail.line);
    c.sprite.visible = false;
    c.label.visible = false;
    c.trail.line.visible = false;
    spacecraftObjects.push(c);
    planetObjects.set(craftData.name, {
      mesh: c.sprite,
      orbit: null,
      label: c.label,
      trail: c.trail,
      moonAnchor: null,
      moons: [],
      state: null,
      worldPosition: c.position,
      isSpacecraft: true
    });
  }

  const sunGeometry = new THREE.SphereGeometry(1.35, 64, 32);
  // Солнце светится самостоятельно — MeshBasicMaterial с текстурой.
  // Лит-материал не нужен, потому что Солнце источник света.
  const sunMaterial = new THREE.MeshBasicMaterial({ map: loadTex('/textures/sun.jpg', true) });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.name = 'Sun';
  sun.userData = { label: 'Sun', type: 'star' };
  solarRoot.add(sun);
  selectable.push(sun);

  const glowGeometry = new THREE.SphereGeometry(2.6, 48, 24);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  solarRoot.add(new THREE.Mesh(glowGeometry, glowMaterial));

  const sunLabel = makeLabel('Sun', '#fde68a');
  sunLabel.position.set(0, 3.2, 0);
  solarRoot.add(sunLabel);
  sunTrail = makeTrail(0xfde68a);
  trailRoot.add(sunTrail.line);
  // Трейл центра МП — голубоватый, виден только в extragalactic фрейме.
  // Показывает путь, который проходит центр галактики через CMB rest frame
  // (в направлении апекса Local Group: l=267°, b=29°).
  mwTrail = makeTrail(0x93c5fd);
  trailRoot.add(mwTrail.line);
  planetObjects.set('Sun', { mesh: sun, label: sunLabel, worldPosition: new THREE.Vector3() });

  for (const planet of planets) {
    const geometry = new THREE.SphereGeometry(planet.radius, 64, 32);
    const cfg = PLANET_TEXTURES[planet.name] || {};
    const material = makePlanetMaterial(planet);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = planet.name;
    mesh.userData = { label: planet.name, type: 'planet', planet };
    // Физически корректный осевой наклон.
    // Order 'YXZ' = intrinsic Y first (spin around body Y), then X (tilt around X).
    // Это эквивалентно: spin вокруг полярной оси, потом tilt ориентирует ось
    // в инерциальной системе. Полярная ось остаётся фиксированной — нет
    // wandering как при rotation.z = tilt с order 'ZYX'.
    mesh.rotation.order = 'YXZ';
    const axis = PLANET_AXIS[planet.name];
    if (axis) mesh.rotation.x = axis.tilt * DEG;
    solarRoot.add(mesh);
    selectable.push(mesh);

    if (cfg.atmosphere) {
      mesh.add(makeAtmosphereGlow(planet.radius, cfg.atmosphere));
    }

    if (planet.name === 'Earth') {
      mesh.add(makeEarthClouds(planet.radius));
    }

    const orbit = makeOrbitLine(planet);
    solarRoot.add(orbit);

    const label = makeLabel(planet.name);
    solarRoot.add(label);

    const trail = makeTrail(planet.color);
    trailRoot.add(trail.line);

    if (planet.rings) {
      const rings = makeSaturnRings(planet.radius * 1.24, planet.radius * 2.27);
      // Кольцо в экваториальной плоскости планеты. Так как mesh уже имеет
      // tilt по Z, кольцо как ребёнок mesh унаследует наклон автоматически
      // (что физически правильно — кольца Сатурна в его экваторе).
      rings.rotation.x = Math.PI / 2;
      mesh.add(rings);
    }

    // Луны: anchor-Group ставится на позицию планеты, дети — луны.
    // Anchor не наследует mesh.rotation, поэтому луны не крутятся со спином планеты.
    let moonAnchor = null;
    const moonObjs = [];
    const moonData = MOONS[planet.name];
    if (moonData) {
      moonAnchor = new THREE.Group();
      solarRoot.add(moonAnchor);
      for (const moon of moonData) {
        const moonGeom = new THREE.SphereGeometry(moon.radius, 32, 16);
        const moonMat = new THREE.MeshStandardMaterial({
          color: moon.color, roughness: 0.94, metalness: 0.0
        });
        // Earth's Moon — текстура всегда есть. Galilean + Titan + Phobos/Deimos —
        // загружаются если файл присутствует, иначе color fallback.
        if (moon.name === 'Moon') applyOptionalTexture(moonMat, '/textures/moon.jpg');
        else if (MOON_TEXTURES[moon.name]) applyOptionalTexture(moonMat, MOON_TEXTURES[moon.name]);
        const moonMesh = new THREE.Mesh(moonGeom, moonMat);
        moonMesh.name = moon.name;
        moonMesh.userData = { label: moon.name, type: 'moon', moon, parent: planet.name };
        moonAnchor.add(moonMesh);
        selectable.push(moonMesh);

        const moonLabel = makeLabel(moon.name, '#cbd5e1');
        moonLabel.scale.set(5, 1.25, 1);
        moonAnchor.add(moonLabel);

        const moonObj = {
          data: moon,
          mesh: moonMesh,
          label: moonLabel,
          worldPosition: new THREE.Vector3()
        };
        moonObjs.push(moonObj);
        // Зарегистрируем луну в planetObjects, чтобы focus camera её видел.
        planetObjects.set(moon.name, moonObj);
      }
    }

    planetObjects.set(planet.name, {
      mesh,
      orbit,
      label,
      trail,
      moonAnchor,
      moons: moonObjs,
      state: null,
      worldPosition: new THREE.Vector3()
    });
  }

  // ── Dwarf planets ──────────────────────────────────────────────────────────
  // Same pipeline as planets (sphere + orbit + label + trail), but always
  // MeshStandardMaterial with solid color (no textures). Extreme orbits like
  // Sedna get no static orbit line — only the body and live trail are shown.
  for (const planet of [...dwarfPlanets, ...namedAsteroids]) {
    const geometry = new THREE.SphereGeometry(planet.radius, 32, 16);
    const material = new THREE.MeshStandardMaterial({
      color: planet.color, roughness: 0.92, metalness: 0.0
    });
    applyOptionalTexture(material, DWARF_TEXTURES[planet.name]);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = planet.name;
    mesh.userData = { label: planet.name, type: 'planet', planet };
    solarRoot.add(mesh);
    selectable.push(mesh);

    let orbit = null;
    if (!planet.extremeOrbit) {
      orbit = makeOrbitLine(planet);
      solarRoot.add(orbit);
    }

    const label = makeLabel(planet.name, '#cbd5e1');
    label.scale.set(7, 1.75, 1);
    solarRoot.add(label);

    const trail = makeTrail(planet.color);
    trailRoot.add(trail.line);

    // Луны карликовых планет: те же что у обычных, через MOONS dict.
    let moonAnchor = null;
    const moonObjs = [];
    const moonData = MOONS[planet.name];
    if (moonData) {
      moonAnchor = new THREE.Group();
      solarRoot.add(moonAnchor);
      for (const moon of moonData) {
        const moonGeom = new THREE.SphereGeometry(moon.radius, 24, 12);
        const moonMat = new THREE.MeshStandardMaterial({
          color: moon.color, roughness: 0.94, metalness: 0.0
        });
        applyOptionalTexture(moonMat, DWARF_TEXTURES[moon.name] || MOON_TEXTURES[moon.name]);
        const moonMesh = new THREE.Mesh(moonGeom, moonMat);
        moonMesh.name = moon.name;
        moonMesh.userData = { label: moon.name, type: 'moon', moon, parent: planet.name };
        moonAnchor.add(moonMesh);
        selectable.push(moonMesh);

        const moonLabel = makeLabel(moon.name, '#94a3b8');
        moonLabel.scale.set(4.5, 1.1, 1);
        moonAnchor.add(moonLabel);

        const moonObj = {
          data: moon,
          mesh: moonMesh,
          label: moonLabel,
          worldPosition: new THREE.Vector3()
        };
        moonObjs.push(moonObj);
        planetObjects.set(moon.name, moonObj);
      }
    }

    planetObjects.set(planet.name, {
      mesh,
      orbit,
      label,
      trail,
      moonAnchor,
      moons: moonObjs,
      state: null,
      worldPosition: new THREE.Vector3(),
      isDwarf: true
    });
  }
}

function buildUi() {
  const focusOptions = ['Free', 'Sun'];
  for (const p of planets) {
    focusOptions.push(p.name);
    const moonsForPlanet = MOONS[p.name] || [];
    for (const m of moonsForPlanet) focusOptions.push(`  ↳ ${m.name}`);
  }
  // Dwarf planets — добавляем в dropdown после регулярных планет.
  for (const p of dwarfPlanets) {
    focusOptions.push(p.name);
    const moonsForPlanet = MOONS[p.name] || [];
    for (const m of moonsForPlanet) focusOptions.push(`  ↳ ${m.name}`);
  }
  // Named asteroids
  for (const p of namedAsteroids) focusOptions.push(p.name);
  // Comets и spacecraft — также в dropdown
  for (const c of comets) focusOptions.push(c.name);
  for (const c of spacecraft) focusOptions.push(c.name);
  focusSelect.innerHTML = focusOptions
    .map((label) => {
      const value = label.startsWith('  ↳ ') ? label.slice(4) : label;
      return `<option value="${value}">${label}</option>`;
    })
    .join('');
  focusSelect.value = focusName;

  planetList.innerHTML = planets.map((planet) => `
    <div class="planet-row" data-planet="${planet.name}">
      <span class="planet-name"><i style="background:#${planet.color.toString(16).padStart(6, '0')}"></i>${planet.name}</span>
      <strong id="distance-${planet.name}">-</strong>
      <label class="trail-toggle" title="Toggle trail for ${planet.name}"><input type="checkbox" id="trail-${planet.name}" checked /> trail</label>
    </div>
  `).join('');
}

function updateSpeedLabel() {
  const value = Number(speedInput.value);
  const daysPerSecond = 10 ** value;
  const yps = daysPerSecond / 365.25;
  if (daysPerSecond < 1) {
    speedLabel.textContent = `${Math.round(daysPerSecond * 24)} hours / sec`;
  } else if (daysPerSecond < 365.25) {
    speedLabel.textContent = `${Math.round(daysPerSecond)} days / sec`;
  } else if (yps < 1e3) {
    speedLabel.textContent = `${yps.toFixed(yps < 10 ? 1 : 0)} years / sec`;
  } else if (yps < 1e6) {
    speedLabel.textContent = `${(yps / 1e3).toFixed(1)} kyr / sec`;
  } else if (yps < 1e9) {
    speedLabel.textContent = `${(yps / 1e6).toFixed(2)} Myr / sec`;
  } else {
    speedLabel.textContent = `${(yps / 1e9).toFixed(2)} Gyr / sec`;
  }
  return daysPerSecond;
}

// ============================================================================
// Sky map: для текущего simDate и наблюдателя (lat, lon) вычисляем
// геоцентрические позиции тел, преобразуем в altitude/azimuth.
// ============================================================================

const earthPlanet = planets.find((p) => p.name === 'Earth');
const observer = { lat: null, lon: null, name: null };

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
function compassFromAz(azRad) {
  const deg = ((azRad * 180 / Math.PI) % 360 + 360) % 360;
  return COMPASS[Math.round(deg / 22.5) % 16];
}

// Расстояние между двумя точками на небесной сфере (для elongation от Солнца).
function sphericalDistance(ra1, dec1, ra2, dec2) {
  return Math.acos(
    Math.max(-1, Math.min(1,
      Math.sin(dec1) * Math.sin(dec2)
      + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2)
    ))
  );
}

function skyEntryForBody(name, geoPos, observerDate) {
  // geoPos в сценических Cartesian (нам нужны AU для расстояния).
  const { lambda, beta, r } = eclipticFromCartesian(geoPos);
  const { ra, dec } = eclipticToEquatorial(lambda, beta);
  const distanceAu = r / AU_SCALE;
  let alt = null;
  let az = null;
  if (observer.lat !== null && observer.lon !== null) {
    const h = equatorialToHorizontal(ra, dec, observer.lat * DEG, observer.lon * DEG, observerDate);
    alt = h.alt;
    az = h.az;
  }
  return { name, ra, dec, alt, az, distanceAu };
}

// Moon phase from Sun-Earth-Moon geometry.
//   • phaseAngle α = angle Sun-Moon-Earth (Earth seen from Moon, vs Sun)
//   • illumination k = (1 + cos α) / 2  →  0 at New, 1 at Full
//   • Waxing vs waning: ecliptic longitude difference (Moon − Sun) from Earth
//     - 0-180° → waxing (Moon east of Sun, follows it across sky)
//     - 180-360° → waning (Moon west of Sun, precedes it)
//   • Phase emoji: standard Unicode lunar phase symbols
const PHASE_NAMES = [
  ['New Moon', '🌑'],
  ['Waxing Crescent', '🌒'],
  ['First Quarter', '🌓'],
  ['Waxing Gibbous', '🌔'],
  ['Full Moon', '🌕'],
  ['Waning Gibbous', '🌖'],
  ['Last Quarter', '🌗'],
  ['Waning Crescent', '🌘']
];

// Position of a moon in the ecliptic frame.
// Supports optional Kepler elements: eccentricity, inclination, node.
// • eccentricity 0 → circular orbit (default, как было раньше — для Io, Europa, Phobos, …)
// • eccentricity > 0 → ellipse через standard Kepler equation: M = E − e·sin(E)
// • inclination → tilt orbit relative to parent's equator/ecliptic
// • node → longitude of ascending node (rotation around Y axis)
function moonOrbitPosition(moonData, simDaysVal, parentRadius) {
  const meanAnomaly = (simDaysVal / moonData.period) * Math.PI * 2 + (moonData.phase || 0);
  const e = moonData.eccentricity || 0;
  const a = moonData.dist * parentRadius;
  let x, z;
  if (e === 0) {
    x = a * Math.cos(meanAnomaly);
    z = a * Math.sin(meanAnomaly);
  } else {
    // Solve Kepler's equation для эллиптической орбиты. Newton-Raphson сходится
    // за 4-6 итераций для e < 0.3 (для Луны e=0.055 → 3 итерации).
    const E = solveKepler(normalizeAngle(meanAnomaly), e);
    x = a * (Math.cos(E) - e);
    z = a * Math.sqrt(1 - e * e) * Math.sin(E);
  }
  let y = 0;
  if (moonData.inclination) {
    const i = moonData.inclination * DEG;
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);
    const y2 = y * cosI - z * sinI;
    const z2 = y * sinI + z * cosI;
    y = y2; z = z2;
  }
  if (moonData.node) {
    const n = moonData.node * DEG;
    const cosN = Math.cos(n);
    const sinN = Math.sin(n);
    const x3 = x * cosN + z * sinN;
    const z3 = -x * sinN + z * cosN;
    x = x3; z = z3;
  }
  return new THREE.Vector3(x, y, z);
}

function computeMoonEntry(date, earthHelio, sunEntry) {
  const moonData = MOONS.Earth && MOONS.Earth[0];
  if (!moonData) return null;
  const simDaysLocal = (date.getTime() - J2000) / MS_PER_DAY;
  // Inclined-orbit position (5.14° tilt + 125° node) — нужно для корректного
  // eclipse detection: иначе Moon идеально в плоскости с Sun, эклипсы каждые 27 дней.
  const moonGeo = moonOrbitPosition(moonData, simDaysLocal, earthPlanet.radius);
  // Гелиоцентрическое положение Луны = Земля + relative
  const moonHelio = earthHelio.clone().add(moonGeo);
  // Phase angle = угол Sun-Moon-Earth (от Луны)
  const moonToSun = moonHelio.clone().negate(); // Sun at origin
  const moonToEarth = moonGeo.clone().negate();
  const phaseAngle = moonToSun.angleTo(moonToEarth);
  const illumination = (1 + Math.cos(phaseAngle)) / 2;
  // Waxing/waning: разность эклиптических долгот Moon − Sun (как видит Earth)
  const moonEcl = eclipticFromCartesian(moonGeo);
  const sunGeoFromEarth = earthHelio.clone().negate();
  const sunEcl = eclipticFromCartesian(sunGeoFromEarth);
  let dLng = (moonEcl.lambda - sunEcl.lambda) * 180 / Math.PI;
  dLng = ((dLng % 360) + 360) % 360;
  // Маппинг 0..360° → 8 фаз (центры каждой фазы по 45°)
  const phaseIndex = Math.floor(((dLng + 22.5) % 360) / 45);
  const [phaseName, phaseEmoji] = PHASE_NAMES[phaseIndex];
  const entry = skyEntryForBody('Moon', moonGeo, date);
  entry.elongation = sphericalDistance(entry.ra, entry.dec, sunEntry.ra, sunEntry.dec);
  entry.color = 0xdde6f5;
  entry.isMoon = true;
  entry.phaseName = phaseName;
  entry.phaseEmoji = phaseEmoji;
  entry.illumination = illumination;
  entry.phaseAngleDeg = phaseAngle * 180 / Math.PI;
  return entry;
}

// Eclipse detection from current geocentric geometry. Inclination of Moon
// (5.14° to ecliptic) makes most new/full moons NOT eclipses — only when
// Moon is near a node during new/full → angular alignment with Sun (solar)
// or with anti-Sun (lunar) within ~1°.
const SUN_ANGULAR_RADIUS_DEG = 0.265; // ~16 arcmin at 1 AU
const MOON_ANGULAR_RADIUS_DEG = 0.259; // ~15.5 arcmin
const EARTH_UMBRA_AT_MOON_DEG = 0.68; // ~41 arcmin (radius of Earth's umbra cone at Moon distance)

function computeEclipses(sunEntry, moonEntry) {
  if (!moonEntry) return { solar: null, lunar: null };
  // Solar eclipse: New Moon (low illumination) + Moon angularly close to Sun
  const sep = sphericalDistance(sunEntry.ra, sunEntry.dec, moonEntry.ra, moonEntry.dec);
  const sepDeg = sep * 180 / Math.PI;
  let solar = null;
  if (moonEntry.illumination < 0.05) {
    const sumRadii = SUN_ANGULAR_RADIUS_DEG + MOON_ANGULAR_RADIUS_DEG;
    if (sepDeg < sumRadii) {
      // Linear coverage approximation — точное вычисление через сечение двух дисков
      // сложнее, но визуальная точность сравнима для education-purposes.
      const coverage = Math.max(0, 1 - sepDeg / sumRadii);
      solar = { coverage, sepDeg, totality: sepDeg < Math.abs(SUN_ANGULAR_RADIUS_DEG - MOON_ANGULAR_RADIUS_DEG) };
    }
  }
  // Lunar eclipse: Full Moon (high illumination) + Moon angularly opposite Sun
  // (within Earth's umbra cone at Moon distance, ~0.68°)
  let lunar = null;
  if (moonEntry.illumination > 0.95) {
    // Угловое расстояние от точки антисолнца до Луны
    const antiSolDeg = (Math.PI - sep) * 180 / Math.PI;
    const umbraTotal = EARTH_UMBRA_AT_MOON_DEG + MOON_ANGULAR_RADIUS_DEG;
    if (antiSolDeg < umbraTotal) {
      const coverage = Math.max(0, 1 - antiSolDeg / umbraTotal);
      lunar = { coverage, oppositionDeg: antiSolDeg, totality: antiSolDeg < EARTH_UMBRA_AT_MOON_DEG - MOON_ANGULAR_RADIUS_DEG };
    }
  }
  return { solar, lunar };
}

// Twilight categories по высоте Солнца (стандарт astronomy):
//   +90° to 0°  : Day
//   0° to -6°   : Civil twilight  (объекты видны как тени; уличные фонари)
//   -6° to -12° : Nautical twilight (горизонт ещё различим)
//   -12° to -18°: Astronomical twilight (рассвет/закат для астрономов)
//   below -18°  : Night (truly dark)
function twilightState(sunAltRad) {
  const altDeg = sunAltRad * 180 / Math.PI;
  if (altDeg > 0) return { name: 'Day', emoji: '☀️', short: `Sun ${altDeg >= 0 ? '+' : ''}${altDeg.toFixed(1)}°` };
  if (altDeg > -6) return { name: 'Civil twilight', emoji: '🌆', short: `Sun ${altDeg.toFixed(1)}°` };
  if (altDeg > -12) return { name: 'Nautical twilight', emoji: '🌃', short: `Sun ${altDeg.toFixed(1)}°` };
  if (altDeg > -18) return { name: 'Astronomical twilight', emoji: '🌌', short: `Sun ${altDeg.toFixed(1)}°` };
  return { name: 'Night', emoji: '⭐', short: `Sun ${altDeg.toFixed(1)}°` };
}

function twilightBarPosition(sunAltRad) {
  // Map alt range [-30°, +60°] → [0, 100]% on the gradient bar.
  const altDeg = sunAltRad * 180 / Math.PI;
  const t = Math.max(-30, Math.min(60, altDeg));
  return ((t + 30) / 90) * 100;
}

function computeSky(date) {
  // Геоцентрические позиции: planet_helio - earth_helio. Всё в сценических ед.
  const earthHelio = planetState(earthPlanet, date).position;
  const entries = [];

  // Sun: геоцентрически — направление от Земли к началу координат (Солнце).
  const sunGeo = earthHelio.clone().negate();
  const sunEntry = skyEntryForBody('Sun', sunGeo, date);
  entries.push(sunEntry);

  // Moon — отдельная логика, фазы из геометрии Sun-Earth-Moon.
  const moonEntry = computeMoonEntry(date, earthHelio, sunEntry);
  if (moonEntry) entries.push(moonEntry);

  for (const planet of planets) {
    if (planet.name === 'Earth') continue;
    const helio = planetState(planet, date).position;
    const geo = helio.clone().sub(earthHelio);
    const entry = skyEntryForBody(planet.name, geo, date);
    // Elongation = угловое расстояние от Солнца на небе.
    entry.elongation = sphericalDistance(entry.ra, entry.dec, sunEntry.ra, sunEntry.dec);
    entry.color = planet.color;
    entries.push(entry);
  }
  return entries;
}

function updateSkyPanel(date) {
  if (!skyList) return;
  const allEntries = computeSky(date);
  const sunEntry = allEntries.find((e) => e.name === 'Sun');
  const moonEntry = allEntries.find((e) => e.isMoon);
  const entries = allEntries.filter((e) => e.name !== 'Sun');
  if (observer.lat === null || observer.lon === null) {
    skyList.innerHTML = '<div class="sky-empty">Set location to see horizon visibility</div>';
    return;
  }
  // Отсортировать по высоте: сначала видимые над горизонтом, потом самые высокие.
  entries.sort((a, b) => (b.alt || -Math.PI) - (a.alt || -Math.PI));

  // Twilight header: текущее состояние неба + позиция Солнца на градиенте
  let headerHTML = '';
  if (sunEntry && sunEntry.alt !== null) {
    const tw = twilightState(sunEntry.alt);
    const pos = twilightBarPosition(sunEntry.alt);
    headerHTML = `
      <div class="twilight-header">
        <span class="twilight-name">${tw.emoji} ${tw.name}</span>
        <span class="twilight-alt">${tw.short}</span>
      </div>
      <div class="twilight-bar">
        <div class="twilight-marker" style="left:${pos}%"></div>
      </div>
    `;
  }

  // Eclipse banners (если есть в данный момент)
  let eclipseHTML = '';
  if (sunEntry && moonEntry) {
    const ec = computeEclipses(sunEntry, moonEntry);
    if (ec.solar) {
      const pct = Math.round(ec.solar.coverage * 100);
      const kind = ec.solar.totality ? 'Total' : (pct > 50 ? 'Partial' : 'Grazing');
      eclipseHTML += `<div class="eclipse-banner solar">☀️🌑 ${kind} solar eclipse · ${pct}% covered <span class="eclipse-meta">(sep ${ec.solar.sepDeg.toFixed(2)}°)</span></div>`;
    }
    if (ec.lunar) {
      const pct = Math.round(ec.lunar.coverage * 100);
      const kind = ec.lunar.totality ? 'Total' : (pct > 50 ? 'Partial' : 'Penumbral');
      eclipseHTML += `<div class="eclipse-banner lunar">🌕🌑 ${kind} lunar eclipse · ${pct}% in umbra <span class="eclipse-meta">(from opposition ${ec.lunar.oppositionDeg.toFixed(2)}°)</span></div>`;
    }
  }
  const listHTML = entries.map((e) => {
    const above = e.alt !== null && e.alt > 0;
    const altDeg = (e.alt * 180 / Math.PI).toFixed(0);
    const compass = compassFromAz(e.az);
    const elongDeg = (e.elongation * 180 / Math.PI).toFixed(0);
    const colorHex = `#${e.color.toString(16).padStart(6, '0')}`;
    if (e.isMoon) {
      const illumPct = Math.round(e.illumination * 100);
      const titleExtra = ` · ${e.phaseName} (${illumPct}% illuminated, phase angle ${e.phaseAngleDeg.toFixed(0)}°)`;
      return `
        <div class="sky-row ${above ? 'above-horizon' : 'below-horizon'}" title="Moon: RA ${(e.ra*12/Math.PI).toFixed(1)}h, Dec ${(e.dec*180/Math.PI).toFixed(0)}°, elongation ${elongDeg}° from Sun${titleExtra}">
          <i style="background:${colorHex}"></i>
          <span>Moon <span class="moon-phase">${e.phaseEmoji} ${e.phaseName} · ${illumPct}%</span></span>
          <span class="sky-coord">${above ? `${compass} ${altDeg}°` : 'below horizon'}</span>
        </div>
      `;
    }
    return `
      <div class="sky-row ${above ? 'above-horizon' : 'below-horizon'}" title="${e.name}: RA ${(e.ra*12/Math.PI).toFixed(1)}h, Dec ${(e.dec*180/Math.PI).toFixed(0)}°, ${e.distanceAu.toFixed(2)} AU, elongation ${elongDeg}° from Sun">
        <i style="background:${colorHex}"></i>
        <span>${e.name}</span>
        <span class="sky-coord">${above ? `${compass} ${altDeg}°` : 'below horizon'}</span>
      </div>
    `;
  }).join('');

  skyList.innerHTML = headerHTML + eclipseHTML + listHTML;
}

function planetTrailPoint(planet, date, referenceFrame) {
  const localPosition = planetState(planet, date).position;
  if (referenceFrame === 'heliocentric') return localPosition;
  const sunPos = sunGalacticPosition(date, galacticReferenceDate);
  if (referenceFrame === 'extragalactic') {
    sunPos.add(milkyWayDrift(date, galacticReferenceDate));
  }
  return sunPos.add(applyEclipticTilt(localPosition));
}

function appendLiveTrailSamples(fromDate, toDate, referenceFrame) {
  if (!trailsToggle.checked) {
    lastTrailDate = new Date(toDate.getTime());
    return;
  }

  const spanMs = toDate.getTime() - fromDate.getTime();
  if (spanMs <= 0) return;

  const spanDays = spanMs / MS_PER_DAY;
  const sampleCount = Math.min(
    MAX_TRAIL_SAMPLES_PER_FRAME,
    Math.max(1, Math.ceil(spanDays / LIVE_TRAIL_SAMPLE_DAYS))
  );

  for (let i = 1; i <= sampleCount; i += 1) {
    const t = i / sampleCount;
    const sampleTime = fromDate.getTime() + spanMs * t;
    const sampleDate = new Date(sampleTime);

    if (referenceFrame !== 'heliocentric' && sunTrail) {
      const sunSamplePos = sunGalacticPosition(sampleDate, galacticReferenceDate);
      if (referenceFrame === 'extragalactic') {
        sunSamplePos.add(milkyWayDrift(sampleDate, galacticReferenceDate));
      }
      pushTrailSample(sunTrail, sunSamplePos, sampleTime);
    }

    // Трейл центра МП — только в extragalactic фрейме. Точка центра МП в локальных
    // координатах galaxyRoot всегда (0, 0, -GALACTIC_RADIUS_SCENE), в мировых = mwDrift + offset.
    if (referenceFrame === 'extragalactic' && mwTrail) {
      const mwCenterPos = milkyWayDrift(sampleDate, galacticReferenceDate)
        .add(new THREE.Vector3(0, 0, -GALACTIC_RADIUS_SCENE));
      pushTrailSample(mwTrail, mwCenterPos, sampleTime);
    }

    for (const planet of planets) {
      const obj = planetObjects.get(planet.name);
      pushTrailSample(obj.trail, planetTrailPoint(planet, sampleDate, referenceFrame), sampleTime);
    }
    // Dwarf planets — sample только если toggle включён.
    if (dwarfPlanetsToggle.checked) {
      for (const planet of dwarfPlanets) {
        const obj = planetObjects.get(planet.name);
        if (obj) pushTrailSample(obj.trail, planetTrailPoint(planet, sampleDate, referenceFrame), sampleTime);
      }
    }
    // Named asteroids — отдельный toggle
    if (namedAsteroidsToggle.checked) {
      for (const planet of namedAsteroids) {
        const obj = planetObjects.get(planet.name);
        if (obj) pushTrailSample(obj.trail, planetTrailPoint(planet, sampleDate, referenceFrame), sampleTime);
      }
    }
    // Comets — те же сэмплы только если toggle включён.
    if (cometsToggle.checked) {
      for (const cometData of comets) {
        const obj = planetObjects.get(cometData.name);
        if (obj) pushTrailSample(obj.trail, planetTrailPoint(cometData, sampleDate, referenceFrame), sampleTime);
      }
    }
    // Spacecraft trails — отдельно (не Kepler-based для Voyagers/NH)
    if (spacecraftToggle.checked) {
      for (const craftData of spacecraft) {
        const obj = planetObjects.get(craftData.name);
        const pos = computeSpacecraftPosition(craftData, sampleDate);
        if (obj && pos) pushTrailSample(obj.trail, pos, sampleTime);
      }
    }
  }

  lastTrailDate = new Date(toDate.getTime());
}

function clearTrails() {
  if (sunTrail) {
    sunTrail.samples.length = 0;
    sunTrail.line.geometry.setDrawRange(0, 0);
  }
  if (mwTrail) {
    mwTrail.samples.length = 0;
    mwTrail.line.geometry.setDrawRange(0, 0);
  }
  for (const obj of planetObjects.values()) {
    if (obj.trail) {
      obj.trail.samples.length = 0;
      obj.trail.line.geometry.setDrawRange(0, 0);
    }
  }
}

function refreshAllTrails(currentTimeMs) {
  if (sunTrail && sunTrail.line.visible) refreshTrail(sunTrail, currentTimeMs);
  if (mwTrail && mwTrail.line.visible) refreshTrail(mwTrail, currentTimeMs);
  for (const obj of planetObjects.values()) {
    if (obj.trail && obj.trail.line.visible) refreshTrail(obj.trail, currentTimeMs);
  }
}

function updateScene(deltaSeconds) {
  const daysPerSecond = updateSpeedLabel();
  // В Solar mode фрейм всегда heliocentric (опции нет в select).
  // В Galactic — берётся из select (galactic | extragalactic).
  const referenceFrame = currentMode === 'solar' ? 'heliocentric' : frameSelect.value;
  if (referenceFrame !== lastReferenceFrame) {
    clearTrails();
    lastTrailDate = new Date(simDate.getTime());
    lastReferenceFrame = referenceFrame;
  }

  const previousTrailDate = new Date(lastTrailDate.getTime());
  if (realtimeToggle && realtimeToggle.checked) {
    // Real-time mode: sim time = wall clock UTC.
    simDate = new Date();
  } else if (!paused) {
    simDate = new Date(simDate.getTime() + daysPerSecond * deltaSeconds * MS_PER_DAY);
  }

  const inGalacticView = referenceFrame !== 'heliocentric';
  let mwDrift = new THREE.Vector3(0, 0, 0);
  if (referenceFrame === 'extragalactic') {
    mwDrift = milkyWayDrift(simDate, galacticReferenceDate);
  }
  galaxyRoot.position.copy(mwDrift);
  const sunPosition = inGalacticView
    ? sunGalacticPosition(simDate, galacticReferenceDate).add(mwDrift)
    : new THREE.Vector3(0, 0, 0);
  solarRoot.position.copy(sunPosition);
  solarRoot.rotation.x = inGalacticView ? ECLIPTIC_TO_GALACTIC_TILT : 0;
  // MW структура видна только в galactic mode — toggle UI всё равно скрыт в solar
  // через .galactic-only, но checkbox state остаётся; без проверки inGalacticView
  // синий thinDisk (HSL 0.55) и жёлтый bulge торчат на (0, 0, -180) в solar view.
  galaxyRoot.visible = galaxyToggle.checked && inGalacticView;
  if (galaxyPath) galaxyPath.visible = orbitPathToggle.checked && inGalacticView;
  // Градиент галактической орбиты: подсветить дугу впереди Солнца, гасить хвост.
  // Считаем только когда дуга реально видна (toggle on и не вне galactic view).
  if (galaxyPath && galaxyPath.visible && galaxyRoot.visible && inGalacticView) {
    const sunLocal = sunGalacticPosition(simDate, galacticReferenceDate);
    sunLocal.y = -0.02; // путь лежит на y=-0.02, выравниваем для корректного поиска
    updateOrbitGradient(galaxyPath, sunLocal);
  }
  // Hipparcos каталог и линии созвездий — только в galactic mode (они привязаны
  // к сфере 2120, в solar mode не имеют научного смысла как "вокруг солнечной
  // системы"). Skybox же — это панорама ночного неба, нужна всегда как фон.
  starsGroup.visible = starsToggle.checked && inGalacticView;
  constellationsGroup.visible = constellationsToggle.checked && inGalacticView;
  if (skyboxMesh) skyboxMesh.visible = true;
  dateLabel.textContent = simDate.toISOString().slice(0, 10);

  const sunObject = planetObjects.get('Sun');
  sunObject.mesh.getWorldPosition(sunObject.worldPosition);
  sunObject.label.visible = labelsToggle.checked;
  // Вращение Солнца вокруг своей оси — ~27 дней (экватор), наклон 7.25° к эклиптике.
  // Та же геометрия что у планет: order YXZ, tilt вокруг X, spin вокруг Y, негативный знак.
  const sunDays = (simDate.getTime() - J2000) / MS_PER_DAY;
  sunObject.mesh.rotation.order = 'YXZ';
  sunObject.mesh.rotation.x = SUN_AXIS.tilt * DEG;
  sunObject.mesh.rotation.y = -(sunDays / SUN_AXIS.period) * Math.PI * 2;
  if (sunTrail) {
    sunTrail.line.visible = trailsToggle.checked && inGalacticView;
  }
  if (mwTrail) {
    // Трейл MW виден только в extragalactic — в galactic MW неподвижна.
    mwTrail.line.visible = trailsToggle.checked && referenceFrame === 'extragalactic';
  }

  // Real-physics mode: integrate N-body system to current simDate. Falls back
  // to Kepler if user is in galactic view (where the whole solar root moves on
  // a circular orbit anyway and N-body would conflict with that motion).
  const nbodyOn = nbodyToggle.checked && !inGalacticView;
  if (nbodyOn) {
    advanceNBody(simDate);
  } else if (isNBodyReady()) {
    // Toggle is off but state exists — keep it in sync with simDate so that
    // when user re-enables, integration resumes from a sensible state.
    resetNBody(simDate);
  }

  const simDays = (simDate.getTime() - J2000) / MS_PER_DAY;
  for (const planet of planets) {
    const obj = planetObjects.get(planet.name);
    const state = planetState(planet, simDate);
    obj.state = state;
    // In real-physics mode, OVERRIDE position from N-body integrator. Kepler
    // state is still computed so we keep dynamic info (radiusAu for tooltips).
    if (nbodyOn) {
      const nbodyPos = getNBodyPosition(planet.name, nbodyTmpVec);
      if (nbodyPos) {
        state.position.copy(nbodyPos);
        state.radiusAu = Math.sqrt(nbodyPos.x * nbodyPos.x + nbodyPos.y * nbodyPos.y + nbodyPos.z * nbodyPos.z) / AU_SCALE;
      }
    }
    obj.mesh.position.copy(state.position);
    // Физически корректное вращение планеты вокруг собственной оси:
    //   • Tilt применён через rotation.x (НЕ rotation.z как раньше) — наклон оси
    //     корректно тилтит полюс к celestial north pole, без wandering.
    //   • Spin отрицательный — orbit в нашей сцене CW от +Y (planetState
    //     left-handed mapping), значит вращение должно быть в ту же сторону.
    //   • Euler order 'YXZ' — spin around mesh's local Y first, потом tilt around X.
    //     Это даёт spin вокруг ТИЛТОВАННОЙ оси (физически верно).
    const axis = PLANET_AXIS[planet.name];
    if (axis) {
      const basePhase = planet.name === 'Earth' ? earthPhaseOverride : (axis.phase || 0);
      obj.mesh.rotation.y = basePhase - (simDays / axis.period) * Math.PI * 2;
    }
    obj.mesh.getWorldPosition(obj.worldPosition);
    obj.label.position.copy(state.position).add(new THREE.Vector3(0, planet.radius + 1.15, 0));
    obj.label.scale.setScalar(Math.max(0.7, camera.position.distanceTo(obj.worldPosition) * LABEL_SCALE));
    obj.label.visible = labelsToggle.checked;
    obj.orbit.visible = trailsToggle.checked && referenceFrame === 'heliocentric';
    if (obj.orbit.visible) updateOrbitGradient(obj.orbit, state.position);
    const perTrailEl = document.querySelector(`#trail-${planet.name}`);
    const perTrailOn = !perTrailEl || perTrailEl.checked;
    obj.trail.line.visible = trailsToggle.checked && perTrailOn;

    if (obj.moonAnchor) {
      obj.moonAnchor.position.copy(state.position);
      for (const moonObj of obj.moons) {
        const angle = (simDays / moonObj.data.period) * Math.PI * 2 + moonObj.data.phase;
        // Inclined orbit position (для Луны это 5.14° + node 125°; для остальных лун
        // inclination/node = 0 по умолчанию → flat orbit, как было раньше).
        const moonPos = moonOrbitPosition(moonObj.data, simDays, planet.radius);
        moonObj.mesh.position.copy(moonPos);
        // Тидальная фиксация: rotation.y = π − angle.
        // Орбита идёт (r cosα, 0, r sinα) — это вращение вокруг −Y (CW при взгляде сверху).
        // В Three.js rotation.y = +α вращает вокруг +Y (CCW). Чтобы спин совпадал
        // с направлением орбиты, нужно −angle; +π подкручивает текстуру так, чтобы
        // u=0.5 (точка в локальном +X, центр moon.jpg = подспутниковая точка) смотрел
        // на родителя в (0,0,0).
        moonObj.mesh.rotation.y = Math.PI - angle;
        moonObj.mesh.getWorldPosition(moonObj.worldPosition);
        moonObj.label.position.copy(moonObj.mesh.position).add(new THREE.Vector3(0, moonObj.data.radius + 0.35, 0));
        moonObj.label.scale.setScalar(Math.max(0.45, camera.position.distanceTo(moonObj.worldPosition) * LABEL_SCALE * 0.5));
        moonObj.label.visible = labelsToggle.checked;
      }
    }

    const distanceEl = document.querySelector(`#distance-${planet.name}`);
    if (distanceEl) distanceEl.textContent = `${state.radiusAu.toFixed(2)} AU`;
  }

  // ── Asteroid & Kuiper belt visibility + slow rotation ────────────────────
  // Видимы в обоих режимах (children solarRoot, дрейфуют с Sun в galactic mode —
  // там видишь "где Solar System в галактике"). Ротация на средней угловой
  // скорости пояса (астероиды ~4.6 года, Kuiper ~250 лет).
  if (asteroidBeltMesh) {
    asteroidBeltMesh.visible = asteroidBeltToggle.checked;
    if (asteroidBeltMesh.visible) {
      // Период 4.6 года → ω = 2π/(4.6·365.25) рад/день
      asteroidBeltMesh.rotation.y = -simDays * (2 * Math.PI / (4.6 * 365.25));
    }
  }
  if (kuiperBeltMesh) {
    kuiperBeltMesh.visible = kuiperBeltToggle.checked;
    if (kuiperBeltMesh.visible) {
      // Средний период Kuiper ~250 лет → намного медленнее
      kuiperBeltMesh.rotation.y = -simDays * (2 * Math.PI / (250 * 365.25));
    }
  }
  // Jupiter Trojans — anchor вращается чтобы L4 кластер оказался на +60° впереди
  // Jupiter, L5 на 60° позади. Используем актуальную угловую позицию Jupiter
  // (с учётом эксцентриситета и инклинации) через состояние Кеплера.
  if (heliopauseGroup) heliopauseGroup.visible = heliopauseToggle.checked;
  // Apsides markers — обновляем позиции из orbital elements каждый кадр.
  // Они слабо смещаются (precession), но не зависят от времени-в-орбите.
  if (apsidesGroup) {
    apsidesGroup.visible = apsidesToggle.checked && currentMode === 'solar';
    if (apsidesGroup.visible) {
      for (const m of apsidesMarkers) {
        m.peri.position.copy(apsisPosition(m.planet, 0, simDate));
        m.apo.position.copy(apsisPosition(m.planet, Math.PI, simDate));
      }
    }
  }
  // Lagrange points (Sun-Earth) — position обновляется per-frame по Earth's location.
  if (lagrangeGroup) {
    lagrangeGroup.visible = lagrangeToggle.checked;
    if (lagrangeGroup.visible) {
      const earthObj = planetObjects.get('Earth');
      if (earthObj && earthObj.state) {
        const ep = earthObj.state.position;
        // L1: 0.99·earth (между Sun и Earth)
        // L2: 1.01·earth (за Earth по anti-Sun)
        // L3: −1·earth (другая сторона Sun)
        // L4/L5: rotate Earth pos by ±60° в орбитальной плоскости
        const c60 = 0.5, s60 = 0.8660254;
        const positions = {
          L1: [ep.x * 0.99, ep.y * 0.99, ep.z * 0.99],
          L2: [ep.x * 1.01, ep.y * 1.01, ep.z * 1.01],
          L3: [-ep.x, -ep.y, -ep.z],
          L4: [ep.x * c60 - ep.z * s60, ep.y, ep.x * s60 + ep.z * c60],
          L5: [ep.x * c60 + ep.z * s60, ep.y, -ep.x * s60 + ep.z * c60]
        };
        for (const lp of lagrangeSprites) {
          const pos = positions[lp.name];
          lp.sprite.position.set(pos[0], pos[1], pos[2]);
        }
      }
    }
  }
  if (trojansAnchor) {
    trojansAnchor.visible = trojansToggle.checked;
    if (trojansAnchor.visible) {
      const jupObj = planetObjects.get('Jupiter');
      if (jupObj && jupObj.state) {
        const jp = jupObj.state.position;
        // Three.js rotation.y = θ берёт локальный угол α → world (α − θ). Чтобы
        // локальный +60° оказался на (θ_J + 60°), нужно rotation.y = −θ_J.
        const jupiterAngle = Math.atan2(jp.z, jp.x);
        trojansAnchor.rotation.y = -jupiterAngle;
      }
    }
  }

  // ── Comets per-frame update ──────────────────────────────────────────────
  // Позиции nucleus всегда обновляем (для focus camera). Tail orientation/intensity
  // только при видимости. При r > 5 AU хвост скрыт. Видны в обоих режимах.
  const cometsVisible = cometsToggle.checked;
  for (const c of cometObjects) {
    // Всегда обновляем Kepler-state и position — чтобы focus работал даже при toggle off.
    const state = planetState(c.data, simDate);
    c.state = state;
    c.nucleus.position.copy(state.position);
    c.label.position.copy(state.position).add(new THREE.Vector3(0, c.data.radius + 0.5, 0));
    c.label.scale.setScalar(Math.max(0.55, camera.position.distanceTo(c.nucleus.position) * LABEL_SCALE * 0.6));
    const obj = planetObjects.get(c.data.name);
    if (obj) {
      obj.state = state;
      obj.worldPosition.copy(c.nucleus.position);
    }
    // Visibility
    c.nucleus.visible = cometsVisible;
    c.label.visible = cometsVisible && labelsToggle.checked;
    c.trail.line.visible = cometsVisible && trailsToggle.checked;
    if (c.orbit) c.orbit.visible = cometsVisible && trailsToggle.checked;
    if (!cometsVisible) {
      c.tail.visible = false;
      continue;
    }
    c.tail.visible = true;

    // ── Tail orientation: anti-solar + billboard вокруг этой оси ────────────
    const cometPos = state.position;
    const r = cometPos.length() / AU_SCALE; // distance from Sun in AU
    // Скрываем хвост когда комета слишком далеко (нет солнечного нагрева)
    if (r > 5) {
      c.tail.visible = false;
      continue;
    }
    // Anti-solar direction (от Солнца через комету наружу)
    const antiSun = cometPos.clone().normalize();
    // Camera в solarRoot local frame
    const camLocal = camera.position.clone();
    solarRoot.worldToLocal(camLocal);
    let view = camLocal.sub(cometPos);
    if (view.lengthSq() < 1e-6) view.set(0, 0, 1);
    else view.normalize();
    let widthAxis = new THREE.Vector3().crossVectors(antiSun, view);
    if (widthAxis.lengthSq() < 1e-6) {
      // Camera looking exactly along anti-solar — pick arbitrary perpendicular
      widthAxis = Math.abs(antiSun.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      widthAxis.cross(antiSun);
    }
    widthAxis.normalize();
    const zAxis = new THREE.Vector3().crossVectors(widthAxis, antiSun);
    // Compose quaternion from basis: X=width, Y=antiSun, Z=zAxis
    const m = new THREE.Matrix4().makeBasis(widthAxis, antiSun, zAxis);
    c.tail.quaternion.setFromRotationMatrix(m);
    c.tail.position.copy(cometPos);
    // Intensity и длина ∝ 1/r²; clamp на [0, 1].
    const intensity = Math.min(1, 0.8 / (r * r));
    const lengthScale = Math.max(0.15, intensity * 1.4);
    c.tail.scale.set(1, lengthScale, 1);
    c.tail.material.uniforms.intensity.value = intensity;
  }

  // ── Spacecraft per-frame update ──────────────────────────────────────────
  // Линейная экстраполяция (Voyagers/NH) или Kepler (PSP). До launchDate скрыты.
  // Позиции вычисляются всегда — visibility отдельно.
  // В отличие от dwarf planets/belts/comets — spacecraft видны в ОБОИХ модах:
  // Voyagers интересно увидеть в galactic context (далеко за пределами Sun).
  const spacecraftVisible = spacecraftToggle.checked;
  for (const c of spacecraftObjects) {
    const pos = computeSpacecraftPosition(c.data, simDate);
    const existsNow = pos !== null;
    if (existsNow) {
      c.position.copy(pos);
      c.sprite.position.copy(pos);
      c.label.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0));
      c.label.scale.setScalar(Math.max(0.55, camera.position.distanceTo(pos) * LABEL_SCALE * 0.6));
      const obj = planetObjects.get(c.data.name);
      if (obj) {
        obj.worldPosition.copy(pos);
        obj.state = { position: pos, radiusAu: pos.length() / AU_SCALE };
      }
    }
    const visible = spacecraftVisible && existsNow;
    c.sprite.visible = visible;
    c.label.visible = visible && labelsToggle.checked;
    c.trail.line.visible = visible && trailsToggle.checked;
    // Trajectory line от Sun (0,0,0) до текущей позиции
    c.trajLine.visible = visible;
    if (visible && existsNow) {
      const tp = c.trajLine.geometry.attributes.position.array;
      tp[0] = 0; tp[1] = 0; tp[2] = 0;
      tp[3] = pos.x; tp[4] = pos.y; tp[5] = pos.z;
      c.trajLine.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ── Dwarf planets + named asteroids per-frame update ─────────────────────
  // ВАЖНО: позиции всегда обновляются, даже если меш невидим. Иначе при focus
  // на dwarf planet (через dropdown или click) камера прыгает в (0,0,0).
  // Visibility — отдельные toggles: dwarf planets vs named asteroids.
  const asteroidNamesSet = new Set(namedAsteroids.map((p) => p.name));
  for (const planet of [...dwarfPlanets, ...namedAsteroids]) {
    const obj = planetObjects.get(planet.name);
    if (!obj) continue;
    const isAsteroid = asteroidNamesSet.has(planet.name);
    const dwarfsVisible = isAsteroid ? namedAsteroidsToggle.checked : dwarfPlanetsToggle.checked;
    // Always compute Kepler state and update position — visibility separate.
    const state = planetState(planet, simDate);
    obj.state = state;
    obj.mesh.position.copy(state.position);
    obj.label.position.copy(state.position).add(new THREE.Vector3(0, planet.radius + 0.6, 0));
    obj.label.scale.setScalar(Math.max(0.55, camera.position.distanceTo(obj.mesh.position) * LABEL_SCALE * 0.7));
    obj.mesh.getWorldPosition(obj.worldPosition);

    // Visibility
    obj.mesh.visible = dwarfsVisible;
    obj.label.visible = dwarfsVisible && labelsToggle.checked;
    obj.trail.line.visible = dwarfsVisible && trailsToggle.checked;
    if (obj.orbit) {
      obj.orbit.visible = dwarfsVisible && trailsToggle.checked;
      if (obj.orbit.visible) updateOrbitGradient(obj.orbit, state.position);
    }

    // Луны карликовых (Charon, Dysnomia) — позиции тоже всегда обновляем.
    if (obj.moonAnchor) {
      obj.moonAnchor.position.copy(obj.mesh.position);
      obj.moonAnchor.visible = dwarfsVisible;
      for (const moonObj of obj.moons) {
        const angle = (simDays / moonObj.data.period) * Math.PI * 2 + moonObj.data.phase;
        const r = moonObj.data.dist * planet.radius;
        moonObj.mesh.position.set(r * Math.cos(angle), 0, r * Math.sin(angle));
        moonObj.mesh.rotation.y = Math.PI - angle;
        moonObj.mesh.getWorldPosition(moonObj.worldPosition);
        moonObj.label.position.copy(moonObj.mesh.position).add(new THREE.Vector3(0, moonObj.data.radius + 0.18, 0));
        moonObj.label.scale.setScalar(Math.max(0.4, camera.position.distanceTo(moonObj.worldPosition) * LABEL_SCALE * 0.45));
        moonObj.label.visible = dwarfsVisible && labelsToggle.checked;
      }
    }
  }

  if (!paused) appendLiveTrailSamples(previousTrailDate, simDate, referenceFrame);
  refreshAllTrails(simDate.getTime());

  if (focusName !== 'Free') {
    const focused = planetObjects.get(focusName);
    if (focused) {
      const target = focused.worldPosition;
      if (!hasFocusTarget) {
        lastFocusTarget.copy(target);
        hasFocusTarget = true;
      }

      const targetDelta = target.clone().sub(lastFocusTarget);
      if (cameraMode === 'free') {
        camera.position.add(targetDelta);
        controls.target.add(targetDelta);
      } else {
        controls.target.lerp(target, 0.08);
      }

      if (cameraMode !== 'free') {
        const offset = cameraMode === 'top'
          ? new THREE.Vector3(0, 72, 0.01)
          : new THREE.Vector3(36, 24, 40);
        camera.position.lerp(target.clone().add(offset), 0.035);
      }
      lastFocusTarget.copy(target);
    }
  }
}

let tooltipPinned = false;
let tooltipPinTimeout = null;

function positionTooltip(x, y) {
  // Position near cursor, but clamp to viewport with 12px margin.
  const rect = tooltip.getBoundingClientRect();
  const margin = 12;
  let left = x + 14;
  let top = y + 14;
  if (left + rect.width + margin > window.innerWidth) left = x - rect.width - 14;
  if (top + rect.height + margin > window.innerHeight) top = y - rect.height - 14;
  if (left < margin) left = margin;
  if (top < margin) top = margin;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showBodyCard(object, x, y, pinned = false) {
  const ud = object.userData;
  let html;
  if (ud.type === 'constellation') {
    html = formatConstellationCard(ud.constellationId);
  } else if (ud.type === 'population' || ud.type === 'lagrange') {
    // Population (asteroid belt, Kuiper, Trojans, Lagrange points, heliosphere
    // boundaries) — формат тот же что у планет, но без dynamic state.
    html = formatBodyCard(ud.label);
  } else if (ud.type === 'apsis') {
    // Маленькая carb-card: тип apsis + planet + distance
    const planet = planets.find((p) => p.name === ud.planet);
    if (planet) {
      const days = (simDate.getTime() - J2000) / MS_PER_DAY;
      const centuries = days / 36525;
      const a = elementAt(planet.a, centuries);
      const e = elementAt(planet.e, centuries);
      const r = ud.kind === 'perihelion' ? a * (1 - e) : a * (1 + e);
      html = `
        <div class="ic-header"><strong>${ud.kind === 'perihelion' ? 'Perihelion' : 'Aphelion'}</strong></div>
        <div class="ic-body">
          <div class="ic-row"><span>Planet</span><strong>${ud.planet}</strong></div>
          <div class="ic-row"><span>Distance</span><strong>${r.toFixed(3)} AU</strong></div>
          <div class="ic-row"><span>Eccentricity</span><strong>${e.toFixed(4)}</strong></div>
        </div>
        <p style="margin:8px 0 0; font-size:0.74rem; color:#cbd5e1; line-height:1.45;">
          ${ud.kind === 'perihelion'
            ? 'Closest point to the Sun in this planet\'s orbit. Planet moves fastest here (Kepler\'s 2nd law).'
            : 'Farthest point from the Sun in this planet\'s orbit. Planet moves slowest here.'}
        </p>`;
    } else {
      html = `<div class="ic-header"><strong>${ud.label}</strong></div>`;
    }
  } else {
    const label = ud.label;
    const dynState = (ud.type === 'planet')
      ? planetObjects.get(label)?.state
      : null;
    html = formatBodyCard(label, dynState);
  }
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  tooltip.classList.toggle('pinned', pinned);
  // Need to set position after innerHTML so getBoundingClientRect is accurate.
  requestAnimationFrame(() => positionTooltip(x, y));
  if (pinned) {
    tooltipPinned = true;
    if (tooltipPinTimeout) clearTimeout(tooltipPinTimeout);
    tooltipPinTimeout = setTimeout(() => {
      tooltipPinned = false;
      tooltip.hidden = true;
    }, 8000);
  }
}

function hideBodyCard() {
  if (tooltipPinned) return; // запиненную не трогаем — её скроет либо новый клик, либо таймаут
  tooltip.hidden = true;
}

// Tap vs drag tracking. На touch каждый жест начинается с pointerdown — нельзя
// сразу показывать карточку, потому что юзер может начинать drag для орбиты.
// Решение: запоминаем начальную точку. На pointerup проверяем сместился ли палец
// больше TAP_THRESHOLD_PX. Если не сместился → это tap, показываем карточку.
// Сместился → drag, ничего не делаем (камера уже отработала через OrbitControls).
const TAP_THRESHOLD_PX = 6;
let pointerDownInfo = null; // { x, y, moved }

function onPointerMove(event) {
  // Tracking движения между down и up — для tap-vs-drag detection.
  if (pointerDownInfo) {
    const dx = event.clientX - pointerDownInfo.x;
    const dy = event.clientY - pointerDownInfo.y;
    if (dx * dx + dy * dy > TAP_THRESHOLD_PX * TAP_THRESHOLD_PX) {
      pointerDownInfo.moved = true;
    }
  }
  // На touch — не показываем карточку при move (драг для орбиты).
  // На desktop — hover карточка работает только без active pointerdown.
  if (event.pointerType === 'touch') return;
  if (pointerDownInfo) return; // active drag — не дёргаем hover

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectable, false);
  if (!hits.length) {
    hideBodyCard();
    return;
  }
  showBodyCard(hits[0].object, event.clientX, event.clientY, false);
}

function onPointerDown(event) {
  // Просто запоминаем точку, дальше — на pointerup решаем tap vs drag.
  pointerDownInfo = { x: event.clientX, y: event.clientY, moved: false };
}

function onPointerUp(event) {
  if (!pointerDownInfo) return;
  const wasMoved = pointerDownInfo.moved;
  pointerDownInfo = null;
  // Drag — никакой карточки. Камера уже обработана OrbitControls.
  if (wasMoved) return;

  // Tap — старая onPointerDown логика: raycast + show/focus.
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectable, false);
  if (hits.length) {
    const obj = hits[0].object;
    const t = obj.userData.type;
    if (t !== 'constellation' && t !== 'population' && t !== 'lagrange' && t !== 'apsis') {
      const newFocus = obj.userData.label;
      if (newFocus !== focusName) jumpToFocus(newFocus);
    }
    showBodyCard(obj, event.clientX, event.clientY, true);
  } else {
    // Tap в пустоту — закрываем pinned карточку.
    tooltipPinned = false;
    if (tooltipPinTimeout) clearTimeout(tooltipPinTimeout);
    tooltip.hidden = true;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

resetBtn.addEventListener('click', () => {
  simDate = new Date(galacticReferenceDate.getTime());
  clearTrails();
  lastTrailDate = new Date(simDate.getTime());
  hasFocusTarget = false;
});

topBtn.addEventListener('click', () => {
  if (focusName === 'Free') setFocus('Sun', 'top');
  else {
    cameraMode = 'top';
    hasFocusTarget = false;
  }
});

tiltBtn.addEventListener('click', () => {
  if (focusName === 'Free') setFocus('Sun', 'tilt');
  else {
    cameraMode = 'tilt';
    hasFocusTarget = false;
  }
});

followSunBtn.addEventListener('click', () => {
  jumpToFocus('Sun');
});

overviewBtn.addEventListener('click', () => {
  frameSelect.value = 'galactic';
  setFocus('Free', 'free');
  cameraMode = 'free';
  camera.position.set(240, 155, 360);
  controls.target.set(285, 0, 0);
  hasFocusTarget = false;
});

focusSelect.addEventListener('change', (event) => {
  setFocus(event.target.value, 'free');
  if (event.target.value !== 'Free') jumpToFocus(event.target.value);
});

frameSelect.addEventListener('change', () => {
  hasFocusTarget = false;
  clearTrails();
  lastTrailDate = new Date(simDate.getTime());
  // Обновляем позицию Sun под новый фрейм перед jumpToFocus, чтобы камера
  // попала на правильное место (Sun в extragalactic дрейфует к Hydra и т.п.).
  const newFrame = frameSelect.value;
  let mwD = new THREE.Vector3(0, 0, 0);
  if (newFrame === 'extragalactic') {
    mwD = milkyWayDrift(simDate, galacticReferenceDate);
  }
  const sPos = newFrame === 'heliocentric'
    ? new THREE.Vector3(0, 0, 0)
    : sunGalacticPosition(simDate, galacticReferenceDate).add(mwD);
  solarRoot.position.copy(sPos);
  solarRoot.rotation.x = newFrame === 'heliocentric' ? 0 : ECLIPTIC_TO_GALACTIC_TILT;
  galaxyRoot.position.copy(mwD);
  solarRoot.updateMatrixWorld(true);
  galaxyRoot.updateMatrixWorld(true);
  jumpToFocus('Sun');
});

renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);
// pointercancel — палец сорвался с экрана (например swipe в notification bar) →
// тоже сбрасываем состояние, иначе следующий drag начнётся с pre-set moved=false.
renderer.domElement.addEventListener('pointercancel', () => { pointerDownInfo = null; });
window.addEventListener('resize', onResize);

function togglePanel() {
  appEl.classList.toggle('panel-collapsed');
}
panelToggle.addEventListener('click', togglePanel);
// На мобильных стартуем со свёрнутой панелью — пользователь сразу видит сцену.
if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
  appEl.classList.add('panel-collapsed');
}

// --- Mode switching ---------------------------------------------------------
// Solar System mode — планетная шкала (AU), Sun стационарный (heliocentric).
// Galactic mode — kpc-шкала, Sun на реальной круговой орбите 225 Myr вокруг центра МП.
function applyMode(mode) {
  if (!MODE_CONFIG[mode]) return;
  currentMode = mode;
  const cfg = MODE_CONFIG[mode];

  // 1. <body class> для CSS-фильтра .solar-only / .galactic-only.
  document.body.classList.remove('mode-solar', 'mode-galactic');
  document.body.classList.add(`mode-${mode}`);

  // 2. Состояние кнопок-табов.
  modeBtns.forEach((btn) => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  // 3. Slider диапазон + default value + label.
  speedInput.min = cfg.speed.min;
  speedInput.max = cfg.speed.max;
  speedInput.value = cfg.speed.default;
  updateSpeedLabel();

  // 4. Reference frame: в solar mode неявно heliocentric (опции в select нет, она
  // спрятана через .galactic-only). В galactic — всегда галактический по умолчанию
  // если пользователь не выбирал extragalactic.
  if (mode === 'galactic') {
    if (frameSelect.value !== 'galactic' && frameSelect.value !== 'extragalactic') {
      frameSelect.value = 'galactic';
    }
    lastReferenceFrame = frameSelect.value;
  } else {
    lastReferenceFrame = 'heliocentric';
  }

  // 5. Видимость глобальных групп.
  galaxyRoot.visible = cfg.showMW && galaxyToggle.checked;
  starsGroup.visible = cfg.showStars && starsToggle.checked;
  constellationsGroup.visible = cfg.showConstellations && constellationsToggle.checked;

  // 6. Видимость планет и лун.
  for (const planet of planets) {
    const obj = planetObjects.get(planet.name);
    if (!obj) continue;
    obj.mesh.visible = cfg.showPlanets;
    if (obj.orbit) obj.orbit.visible = cfg.showPlanets && trailsToggle.checked && currentMode === 'solar';
    if (obj.label) obj.label.visible = cfg.showPlanets && labelsToggle.checked;
    if (obj.trail) {
      obj.trail.line.visible = cfg.showPlanets && trailsToggle.checked;
    }
    if (obj.moonAnchor) obj.moonAnchor.visible = cfg.showPlanets;
  }
  // Beyond-the-planets objects — видны в обоих режимах (children solarRoot,
  // дрейфуют с Sun в galactic). Visibility привязана к toggle и проверяется
  // per-frame в updateScene (а тут только начальное состояние при mode switch).
  if (asteroidBeltMesh) asteroidBeltMesh.visible = asteroidBeltToggle.checked;
  if (kuiperBeltMesh) kuiperBeltMesh.visible = kuiperBeltToggle.checked;
  if (trojansAnchor) trojansAnchor.visible = trojansToggle.checked;
  const cometsOn = cometsToggle.checked;
  for (const c of cometObjects) {
    c.nucleus.visible = cometsOn;
    c.tail.visible = cometsOn;
    c.label.visible = cometsOn && labelsToggle.checked;
    c.trail.line.visible = cometsOn && trailsToggle.checked;
    if (c.orbit) c.orbit.visible = cometsOn && trailsToggle.checked;
  }
  // Spacecraft видны в обоих режимах (не привязаны к Sun-centric scale).
  const spacecraftOn = spacecraftToggle.checked;
  for (const c of spacecraftObjects) {
    c.sprite.visible = spacecraftOn;
    c.label.visible = spacecraftOn && labelsToggle.checked;
    c.trail.line.visible = spacecraftOn && trailsToggle.checked;
  }

  // Dwarf planets — видны в обоих режимах. cfg.showPlanets gates на mode switch
  // (galactic mode имеет showPlanets=true тоже, проверь MODE_CONFIG если нужно
  // скрывать). По умолчанию: viewable wherever planets are visible.
  const asteroidNamesSetMode = new Set(namedAsteroids.map((p) => p.name));
  for (const planet of [...dwarfPlanets, ...namedAsteroids]) {
    const obj = planetObjects.get(planet.name);
    if (!obj) continue;
    const isAsteroid = asteroidNamesSetMode.has(planet.name);
    const on = cfg.showPlanets && (isAsteroid ? namedAsteroidsToggle.checked : dwarfPlanetsToggle.checked);
    obj.mesh.visible = on;
    if (obj.orbit) obj.orbit.visible = on && trailsToggle.checked;
    if (obj.label) obj.label.visible = on && labelsToggle.checked;
    if (obj.trail) obj.trail.line.visible = on && trailsToggle.checked;
    if (obj.moonAnchor) obj.moonAnchor.visible = on;
  }

  // 7. Обновляем позицию Sun ДО позиционирования камеры — иначе jumpToFocus
  //    прочитает stale координаты с предыдущего фрейма (Sun в новой раме
  //    может быть совсем в другом месте). После этого jumpToFocus положит
  //    камеру в правильную позицию относительно Sun и активирует follow.
  const refFrame = mode === 'solar' ? 'heliocentric' : frameSelect.value;
  let mwDrft = new THREE.Vector3(0, 0, 0);
  if (refFrame === 'extragalactic') {
    mwDrft = milkyWayDrift(simDate, galacticReferenceDate);
  }
  const sunPos = refFrame === 'heliocentric'
    ? new THREE.Vector3(0, 0, 0)
    : sunGalacticPosition(simDate, galacticReferenceDate).add(mwDrft);
  solarRoot.position.copy(sunPos);
  solarRoot.rotation.x = refFrame === 'heliocentric' ? 0 : ECLIPTIC_TO_GALACTIC_TILT;
  galaxyRoot.position.copy(mwDrft);
  // Принудительно обновляем matrixWorld, иначе getWorldPosition в jumpToFocus
  // вернёт stale координаты до следующего рендера.
  solarRoot.updateMatrixWorld(true);
  galaxyRoot.updateMatrixWorld(true);

  // Используем автоматический zoom из jumpToFocus (через радиус Sun = 1.35 →
  // distance ~28) — то же поведение что у кнопки Follow Sun, иначе галактический
  // режим располагал камеру слишком далеко (distance 233) и Sun становился точкой.
  jumpToFocus('Sun');

  // 8. Очистка трейлов — они становятся бессмысленны при смене шкалы.
  clearTrails();
  lastTrailDate = new Date(simDate.getTime());
}

modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => applyMode(btn.dataset.mode));
});

// --- Galactic orbit period slider -------------------------------------------
// Логарифмическая шкала: log10(200) = 2.301 (compressed) → log10(225e6) = 8.352 (real).
function updateOrbitPeriodLabel(years) {
  let label;
  if (years < 1000) label = `${Math.round(years)} years (compressed)`;
  else if (years < 1e6) label = `${(years / 1000).toFixed(1)} kyr`;
  else if (years < 1e9) {
    const myr = years / 1e6;
    label = myr >= 220 && myr <= 230
      ? `${myr.toFixed(0)} Myr (real galactic year!)`
      : `${myr.toFixed(1)} Myr`;
  } else label = `${(years / 1e9).toFixed(2)} Gyr`;
  orbitPeriodLabel.textContent = label;
}
function applyOrbitPeriod() {
  const years = 10 ** Number(orbitPeriodSlider.value);
  setGalacticOrbitPeriod(years);
  updateOrbitPeriodLabel(years);
  // Очистка трейлов — на разной частоте орбиты они визуально несовместимы.
  clearTrails();
  lastTrailDate = new Date(simDate.getTime());
  // Регенерация статического пути с актуальной частотой.
  if (galaxyPath) addGalaxyPath();
}
orbitPeriodSlider.addEventListener('input', applyOrbitPeriod);
applyOrbitPeriod(); // initial 200 yr

// --- Observer location & sky panel ------------------------------------------

function formatCoord(value, posLetter, negLetter) {
  const abs = Math.abs(value);
  const letter = value >= 0 ? posLetter : negLetter;
  return `${abs.toFixed(2)}°${letter}`;
}

function updateLocationLabel() {
  if (observer.lat === null || observer.lon === null) {
    locationLabel.textContent = 'No location set';
    locationLabel.classList.remove('has-location');
    return;
  }
  const coord = `${formatCoord(observer.lat, 'N', 'S')} ${formatCoord(observer.lon, 'E', 'W')}`;
  const name = observer.name ? `<span class="location-name">${observer.name}</span> · ${coord}` : coord;
  locationLabel.innerHTML = name;
  locationLabel.classList.add('has-location');
}

function setObserver(lat, lon, name = null) {
  observer.lat = lat;
  observer.lon = lon;
  observer.name = name;
  updateLocationLabel();
  try {
    localStorage.setItem('solar-galactic-observer', JSON.stringify({ lat, lon, name }));
  } catch (_) { /* private mode */ }
}

function loadObserverFromStorage() {
  try {
    const raw = localStorage.getItem('solar-galactic-observer');
    if (raw) {
      const { lat, lon, name } = JSON.parse(raw);
      if (typeof lat === 'number' && typeof lon === 'number') setObserver(lat, lon, name || null);
    }
  } catch (_) { /* ignore */ }
}

// --- City picker (searchable combobox) --------------------------------------

let cityResults = [];
let highlightedIdx = -1;

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const i = lower.indexOf(q);
  if (i === -1) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, i))}<mark>${escapeHtml(text.slice(i, i + q.length))}</mark>${escapeHtml(text.slice(i + q.length))}`;
}

function filterCities(query) {
  if (!query) return CITIES.slice(0, 12); // top 12 alphabetically by default
  const q = query.toLowerCase().trim();
  // Ранжируем: prefix match → contains в name → contains в country.
  const prefix = [];
  const contains = [];
  const country = [];
  for (const c of CITIES) {
    const n = c.name.toLowerCase();
    const cc = c.country.toLowerCase();
    if (n.startsWith(q)) prefix.push(c);
    else if (n.includes(q)) contains.push(c);
    else if (cc.includes(q)) country.push(c);
  }
  return [...prefix, ...contains, ...country].slice(0, 12);
}

function renderCityDropdown() {
  if (cityResults.length === 0) {
    cityDropdown.innerHTML = '<div class="city-empty">No matches</div>';
    return;
  }
  const q = cityInput.value;
  cityDropdown.innerHTML = cityResults.map((c, i) => {
    const coord = `${formatCoord(c.lat, 'N', 'S')} ${formatCoord(c.lon, 'E', 'W')}`;
    return `
      <div class="city-option ${i === highlightedIdx ? 'highlighted' : ''}" role="option" data-idx="${i}" aria-selected="${i === highlightedIdx}">
        <div>
          <span class="city-name">${highlightMatch(c.name, q)}</span><span class="city-country">${escapeHtml(c.country)}</span>
        </div>
        <span class="city-coord">${coord}</span>
      </div>
    `;
  }).join('');
}

function openDropdown() {
  cityDropdown.hidden = false;
  cityPicker.setAttribute('aria-expanded', 'true');
}

function closeDropdown() {
  cityDropdown.hidden = true;
  cityPicker.setAttribute('aria-expanded', 'false');
  highlightedIdx = -1;
}

function selectCity(city) {
  setObserver(city.lat, city.lon, `${city.name}, ${city.country}`);
  cityInput.value = '';
  closeDropdown();
  cityInput.blur();
}

cityInput.addEventListener('focus', () => {
  cityResults = filterCities(cityInput.value);
  highlightedIdx = -1;
  renderCityDropdown();
  openDropdown();
});

cityInput.addEventListener('input', () => {
  cityResults = filterCities(cityInput.value);
  highlightedIdx = cityResults.length > 0 ? 0 : -1;
  renderCityDropdown();
  openDropdown();
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (cityResults.length === 0) return;
    highlightedIdx = (highlightedIdx + 1) % cityResults.length;
    renderCityDropdown();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (cityResults.length === 0) return;
    highlightedIdx = (highlightedIdx - 1 + cityResults.length) % cityResults.length;
    renderCityDropdown();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlightedIdx >= 0 && cityResults[highlightedIdx]) {
      selectCity(cityResults[highlightedIdx]);
    }
  } else if (e.key === 'Escape') {
    closeDropdown();
    cityInput.blur();
  }
});

cityDropdown.addEventListener('mousedown', (e) => {
  // mousedown (не click) — чтобы успеть до blur input.
  const item = e.target.closest('.city-option');
  if (!item) return;
  e.preventDefault();
  const idx = parseInt(item.dataset.idx, 10);
  if (!isNaN(idx) && cityResults[idx]) selectCity(cityResults[idx]);
});

cityDropdown.addEventListener('mousemove', (e) => {
  const item = e.target.closest('.city-option');
  if (!item) return;
  const idx = parseInt(item.dataset.idx, 10);
  if (!isNaN(idx) && idx !== highlightedIdx) {
    highlightedIdx = idx;
    renderCityDropdown();
  }
});

document.addEventListener('mousedown', (e) => {
  if (!cityPicker.contains(e.target)) closeDropdown();
});

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation API not available in this browser.');
    return;
  }
  geoBtn.textContent = '…';
  geoBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setObserver(pos.coords.latitude, pos.coords.longitude, 'My location');
      geoBtn.textContent = '📍';
      geoBtn.disabled = false;
    },
    (err) => {
      geoBtn.textContent = '📍';
      geoBtn.disabled = false;
      alert(`Geolocation failed: ${err.message}`);
    },
    { timeout: 8000 }
  );
});

loadObserverFromStorage();
updateLocationLabel();

// Real-time mode: блокируем speed-slider & pause, чтобы пользователь
// не путался что они «не работают» при включённом real-time.
realtimeToggle.addEventListener('change', () => {
  const on = realtimeToggle.checked;
  speedInput.disabled = on;
  pauseBtn.disabled = on;
  if (on) paused = false;
});

// Sky panel обновляется раз в секунду (а не каждый кадр) — пересчёт RA/Dec/alt/az
// для 8 тел не дёшев в горячем цикле, а в небе ничего не меняется быстрее.
let lastSkyUpdate = 0;
function maybeUpdateSky(nowMs) {
  if (nowMs - lastSkyUpdate < 1000) return;
  lastSkyUpdate = nowMs;
  updateSkyPanel(simDate);
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    togglePanel();
  }
});

buildScene();
buildUi();
// Применяем default mode (solar) — он установит slider, видимость, камеру.
applyMode('solar');

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  updateScene(delta);
  maybeUpdateSky(performance.now());
  controls.update();
  // Skybox follows camera — стандартный приём для "infinite background".
  // Иначе при focus на удалённый объект (Voyager на 165 AU) камера почти
  // упирается в стенку skybox-сферы радиуса 2200 → текстура искажается.
  if (skyboxMesh) skyboxMesh.position.copy(camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
