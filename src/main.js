import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { formatBodyCard } from './bodyData.js';
import {
  AU_SCALE,
  DEG,
  ECLIPTIC_TO_GALACTIC_TILT,
  GALACTIC_RADIUS_SCENE,
  J2000,
  MS_PER_DAY,
  applyEclipticTilt,
  eclipticFromCartesian,
  eclipticToEquatorial,
  equatorialToHorizontal,
  milkyWayDrift,
  planetState,
  planets,
  radecToSceneVec3,
  setGalacticOrbitPeriod,
  sunGalacticPosition
} from './orbitalModel.js';
import { CITIES } from './cities.js';

const canvas = document.querySelector('#scene');
const speedInput = document.querySelector('#timeScale');
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
    { name: 'Moon', dist: 2.5, period: 27.32, radius: 0.075, color: 0xcfcfcf, phase: 0.5 }
  ],
  Jupiter: [
    { name: 'Io', dist: 2.0, period: 1.769, radius: 0.10, color: 0xf5d97a, phase: 0.1 },
    { name: 'Europa', dist: 2.55, period: 3.551, radius: 0.09, color: 0xe5dbc6, phase: 1.7 },
    { name: 'Ganymede', dist: 3.25, period: 7.155, radius: 0.13, color: 0xa89b86, phase: 3.2 },
    { name: 'Callisto', dist: 4.25, period: 16.689, radius: 0.115, color: 0x7a6a55, phase: 4.5 }
  ],
  Saturn: [
    { name: 'Titan', dist: 4.5, period: 15.945, radius: 0.13, color: 0xe6a560, phase: 2.1 }
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

const raycaster = new THREE.Raycaster();
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
  focused.mesh.getWorldPosition(focused.worldPosition);

  // Автоматический zoom: расстояние камеры подбирается из размера тела.
  // Sun остаётся дальше (glow + сам источник света — близко неудобно).
  // Планеты и луны зумятся гораздо ближе: Земля заполняет ~55% высоты экрана.
  let radius = 1;
  if (focused.data && focused.data.radius) radius = focused.data.radius;
  else if (focused.mesh.geometry?.parameters?.radius) radius = focused.mesh.geometry.parameters.radius;

  const isSun = name === 'Sun';
  const offset = offsetOverride || (isSun
    ? new THREE.Vector3(radius * 12, radius * 8, radius * 16)   // distance ~29, ~5% экрана
    : new THREE.Vector3(radius * 2, radius * 1.5, radius * 3)); // distance ~3.8r, ~55% экрана
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

function addMilkyWayDisk() {
  // ── Слой 1 (плоская ESO-текстура) — УДАЛЁН ─────────────────────────────
  // Плоский PlaneGeometry со sticker-видом галактики не имел физического смысла
  // (вид сверху на 3D-объект в 3D-сцене даёт ощущение «наклейки»). Оставлены
  // только volumetric-слои ниже, которые физически репрезентируют структуру МП:
  // балдж (сфера), тонкий диск, толстый диск, гало.

  // ── Слой 2: сферический балдж ────────────────────────────────────────────
  // Реалистичный размер: ~3 kpc радиус → 180 × 3/8 ≈ 68 ед.
  const bulgeRadius = 70;
  const bulgeGeom = new THREE.SphereGeometry(bulgeRadius, 64, 32);
  const bulgeMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
    fog: false,
    uniforms: {
      bulgeColor: { value: new THREE.Color(0xffd8a0) }
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
      uniform vec3 bulgeColor;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 viewDir = normalize(-vViewPos);
        // Брайтнесс падает к силуэту (fresnel) — даёт мягкий glowing-шарик
        // вместо матового шара. Внутренние пиксели ярче, края растворяются.
        float ndv = abs(dot(vNormal, viewDir));
        float a = pow(ndv, 1.5) * 0.85;
        gl_FragColor = vec4(bulgeColor, a);
      }
    `
  });
  const bulge = new THREE.Mesh(bulgeGeom, bulgeMat);
  bulge.position.set(0, 0, -GALACTIC_RADIUS_SCENE);
  bulge.name = 'Milky Way bulge';
  bulge.renderOrder = 4;
  galaxyRoot.add(bulge);

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

  // ── Слой 5: сферическое гало ─────────────────────────────────────────────
  // Очень разреженные старые звёзды (Population II + globular clusters) в сфере
  // радиуса 600 ед. (~27 kpc). Реалистичная пропорция к диску: 1:1.
  const haloCount = 2000;
  const haloPositions = new Float32Array(haloCount * 3);
  const haloColors = new Float32Array(haloCount * 3);
  const haloRadius = 600;
  for (let i = 0; i < haloCount; i += 1) {
    // Распределение r^0.5 — больше плотность ближе к центру, отдалённое гало разреже.
    const u = Math.random();
    const r = haloRadius * Math.pow(u, 0.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    haloPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    haloPositions[i * 3 + 1] = r * Math.cos(phi);
    haloPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    // Холодные старые красные карлики + жёлтые гиганты, в среднем теплее тонкого диска.
    color.setHSL(0.08 + Math.random() * 0.05, 0.35, 0.5);
    haloColors[i * 3] = color.r;
    haloColors[i * 3 + 1] = color.g;
    haloColors[i * 3 + 2] = color.b;
  }
  const haloGeom = new THREE.BufferGeometry();
  haloGeom.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
  haloGeom.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
  const halo = new THREE.Points(haloGeom, new THREE.PointsMaterial({
    size: 0.9,
    vertexColors: true,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false,
    fog: false
  }));
  halo.position.set(0, 0, -GALACTIC_RADIUS_SCENE);
  halo.name = 'Milky Way halo';
  halo.renderOrder = 6;
  halo.frustumCulled = false;
  galaxyRoot.add(halo);
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
      group.add(line);
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

function buildScene() {
  addSkybox();
  addMilkyWayDisk();
  addGalaxyPath();
  loadSkyCatalog(); // async — звёзды и созвездия появятся когда загрузятся

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
        // Только у Луны Земли есть реальная текстура — у остальных fallback на цвет.
        const moonMatOpts = { roughness: 0.94, metalness: 0.0 };
        if (moon.name === 'Moon') moonMatOpts.map = loadTex('/textures/moon.jpg', true);
        else moonMatOpts.color = moon.color;
        const moonMat = new THREE.MeshStandardMaterial(moonMatOpts);
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
}

function buildUi() {
  const focusOptions = ['Free', 'Sun'];
  for (const p of planets) {
    focusOptions.push(p.name);
    const moonsForPlanet = MOONS[p.name] || [];
    for (const m of moonsForPlanet) focusOptions.push(`  ↳ ${m.name}`);
  }
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

function computeSky(date) {
  // Геоцентрические позиции: planet_helio - earth_helio. Всё в сценических ед.
  const earthHelio = planetState(earthPlanet, date).position;
  const entries = [];

  // Sun: геоцентрически — направление от Земли к началу координат (Солнце).
  const sunGeo = earthHelio.clone().negate();
  const sunEntry = skyEntryForBody('Sun', sunGeo, date);
  entries.push(sunEntry);

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
  const entries = computeSky(date).filter((e) => e.name !== 'Sun');
  if (observer.lat === null || observer.lon === null) {
    skyList.innerHTML = '<div class="sky-empty">Set location to see horizon visibility</div>';
    return;
  }
  // Отсортировать по высоте: сначала видимые над горизонтом, потом самые высокие.
  entries.sort((a, b) => (b.alt || -Math.PI) - (a.alt || -Math.PI));
  skyList.innerHTML = entries.map((e) => {
    const above = e.alt !== null && e.alt > 0;
    const altDeg = (e.alt * 180 / Math.PI).toFixed(0);
    const compass = compassFromAz(e.az);
    const elongDeg = (e.elongation * 180 / Math.PI).toFixed(0);
    const colorHex = `#${e.color.toString(16).padStart(6, '0')}`;
    return `
      <div class="sky-row ${above ? 'above-horizon' : 'below-horizon'}" title="${e.name}: RA ${(e.ra*12/Math.PI).toFixed(1)}h, Dec ${(e.dec*180/Math.PI).toFixed(0)}°, ${e.distanceAu.toFixed(2)} AU, elongation ${elongDeg}° from Sun">
        <i style="background:${colorHex}"></i>
        <span>${e.name}</span>
        <span class="sky-coord">${above ? `${compass} ${altDeg}°` : 'below horizon'}</span>
      </div>
    `;
  }).join('');
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
  galaxyRoot.visible = galaxyToggle.checked;
  // Градиент галактической орбиты: подсветить дугу впереди Солнца, гасить хвост.
  if (galaxyPath && galaxyPath.visible && inGalacticView) {
    const sunLocal = sunGalacticPosition(simDate, galacticReferenceDate);
    sunLocal.y = -0.02; // путь лежит на y=-0.02, выравниваем для корректного поиска
    updateOrbitGradient(galaxyPath, sunLocal);
  }
  starsGroup.visible = starsToggle.checked;
  constellationsGroup.visible = constellationsToggle.checked;
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

  const simDays = (simDate.getTime() - J2000) / MS_PER_DAY;
  for (const planet of planets) {
    const obj = planetObjects.get(planet.name);
    const state = planetState(planet, simDate);
    obj.state = state;
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
        const r = moonObj.data.dist * planet.radius;
        moonObj.mesh.position.set(r * Math.cos(angle), 0, r * Math.sin(angle));
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
  const label = object.userData.label;
  const dynState = (object.userData.type === 'planet')
    ? planetObjects.get(label)?.state
    : null;
  tooltip.innerHTML = formatBodyCard(label, dynState);
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

function onPointerMove(event) {
  // На touch-устройствах pointermove приходит во время drag — игнорируем, чтобы
  // карточка не мелькала. На touch info показываем по pointerdown.
  if (event.pointerType === 'touch') return;

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
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectable, false);
  if (hits.length) {
    const obj = hits[0].object;
    setFocus(obj.userData.label, 'free');
    // На touch — закрепляем карточку чтобы пользователь успел прочитать.
    // На desktop тоже закрепим — пока не кликнут в пустое место.
    showBodyCard(obj, event.clientX, event.clientY, true);
  } else {
    // Клик в пустоту — сбрасываем закрепление.
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
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
