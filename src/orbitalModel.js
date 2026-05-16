import * as THREE from 'three';

export const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
export const MS_PER_DAY = 86_400_000;
export const DEG = Math.PI / 180;
export const AU_SCALE = 11;
export const GALACTIC_RADIUS_SCENE = 180;
export const LOCAL_GALACTIC_ARC = 58;
// Период круговой орбиты Sun вокруг центра МП — настраивается через слайдер.
// По умолчанию РЕАЛЬНЫЙ — 225 миллионов лет. На нормальных скоростях симуляции
// Sun визуально неподвижен (физически верно: 1 год = 4.4×10⁻⁹ от оборота).
// Чтобы увидеть оборот, нужна sim-скорость 10⁸-10¹⁰ days/sec (slider 8-10).
// Слайдер периода позволяет сжать до 200 лет для образовательной визуализации,
// но это уже художественное упрощение.
let galacticOrbitPeriodYears = 225_000_000;
export function setGalacticOrbitPeriod(years) {
  galacticOrbitPeriodYears = years;
}
export function getGalacticOrbitPeriod() {
  return galacticOrbitPeriodYears;
}
export const REAL_GALACTIC_PERIOD_YEARS = 225_000_000;
export const GALACTIC_DRIFT_PER_YEAR_SCENE = 0; // legacy, unused

// Угол наклона плоскости эклиптики к плоскости Галактики ≈ 60.19°.
// Без него спираль планет в галактическом фрейме лежит в плоскости XZ
// и читается только сверху — с боку схлопывается в линию.
export const ECLIPTIC_TO_GALACTIC_TILT = 60.19 * DEG;
const TILT_COS = Math.cos(ECLIPTIC_TO_GALACTIC_TILT);
const TILT_SIN = Math.sin(ECLIPTIC_TO_GALACTIC_TILT);

export function applyEclipticTilt(vec) {
  const y = vec.y * TILT_COS - vec.z * TILT_SIN;
  const z = vec.y * TILT_SIN + vec.z * TILT_COS;
  return new THREE.Vector3(vec.x, y, z);
}

// Keplerian elements from NASA "Approximate Positions of the Planets" — Table 2a
// (valid 3000 BC – 3000 AD; replaces the narrower 1800-2050 fit). Outer planets
// (Jupiter+) also carry b/c/s/f correction terms from Table 2b which add a
// quadratic + periodic term to mean anomaly to capture Jupiter-Saturn near-resonance.
// Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
//
// Format per element: [value at J2000, rate per Julian century]. T = centuries
// past J2000 (computed in planetState).
//
// "correction" object on outer planets adds:
//   M_corrected = M + b·T² + c·cos(f·T) + s·sin(f·T)    (everything in degrees)
//
// Earth row is for Earth-Moon barycentre — fine for visualisation; the Sun-Earth
// vector differs from EM-Bary by ~5e-5 AU (<0.01 of an Earth radius).
export const planets = [
  {
    name: 'Mercury',
    color: 0xb7a99a,
    radius: 0.14,
    actualRadiusKm: 2440,
    textureBands: [0x8f8175, 0xd7cabd],
    a: [0.38709843, 0.00000000],
    e: [0.20563661, 0.00002123],
    i: [7.00559432, -0.00590158],
    L: [252.25166724, 149472.67486623],
    longPeri: [77.45771895, 0.15940013],
    longNode: [48.33961819, -0.12214182]
  },
  {
    name: 'Venus',
    color: 0xd8b66a,
    radius: 0.22,
    actualRadiusKm: 6052,
    textureBands: [0xb78b4c, 0xf1d08a],
    a: [0.72332102, -0.00000026],
    e: [0.00676399, -0.00005107],
    i: [3.39777545, 0.00043494],
    L: [181.97970850, 58517.81560260],
    longPeri: [131.76755713, 0.05679648],
    longNode: [76.67261496, -0.27274174]
  },
  {
    name: 'Earth',
    color: 0x4f9cff,
    radius: 0.24,
    actualRadiusKm: 6371,
    textureBands: [0x2563eb, 0x22c55e, 0xdbeafe],
    a: [1.00000018, -0.00000003],
    e: [0.01673163, -0.00003661],
    i: [-0.00054346, -0.01337178],
    L: [100.46691572, 35999.37306329],
    longPeri: [102.93005885, 0.31795260],
    longNode: [-5.11260389, -0.24123856]
  },
  {
    name: 'Mars',
    color: 0xd16a3a,
    radius: 0.19,
    actualRadiusKm: 3390,
    textureBands: [0x8f3a1f, 0xe06b39, 0xf2ad7c],
    a: [1.52371243, 0.00000097],
    e: [0.09336511, 0.00009149],
    i: [1.85181869, -0.00724757],
    L: [-4.56813164, 19140.29934243],
    longPeri: [-23.91744784, 0.45223625],
    longNode: [49.71320984, -0.26852431]
  },
  {
    name: 'Jupiter',
    color: 0xd7b083,
    radius: 0.58,
    actualRadiusKm: 69911,
    textureBands: [0x8b5e34, 0xd9b382, 0xf2dcc2, 0xb87943],
    a: [5.20248019, -0.00002864],
    e: [0.04853590, 0.00018026],
    i: [1.29861416, -0.00322699],
    L: [34.33479152, 3034.90371757],
    longPeri: [14.27495244, 0.18199196],
    longNode: [100.29282654, 0.13024619],
    correction: { b: -0.00012452, c: 0.06064060, s: -0.35635438, f: 38.35125000 }
  },
  {
    name: 'Saturn',
    color: 0xe6c98f,
    radius: 0.52,
    actualRadiusKm: 58232,
    textureBands: [0x8d7447, 0xf1dca6, 0xcaa66a],
    rings: true,
    a: [9.54149883, -0.00003065],
    e: [0.05550825, -0.00032044],
    i: [2.49424102, 0.00451969],
    L: [50.07571329, 1222.11494724],
    longPeri: [92.86136063, 0.54179478],
    longNode: [113.63998702, -0.25015002],
    correction: { b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125000 }
  },
  {
    name: 'Uranus',
    color: 0x8ee7ef,
    radius: 0.38,
    actualRadiusKm: 25362,
    textureBands: [0x5ed0d8, 0xb8fbff],
    a: [19.18797948, -0.00020455],
    e: [0.04685740, -0.00001550],
    i: [0.77298127, -0.00180155],
    L: [314.20276625, 428.49512595],
    longPeri: [172.43404441, 0.09266985],
    longNode: [73.96250215, 0.05739699],
    correction: { b: 0.00058331, c: -0.97731848, s: 0.17689245, f: 7.67025000 }
  },
  {
    name: 'Neptune',
    color: 0x476cff,
    radius: 0.37,
    actualRadiusKm: 24622,
    textureBands: [0x1e3a8a, 0x477bff, 0x93c5fd],
    a: [30.06952752, 0.00006447],
    e: [0.00895439, 0.00000818],
    i: [1.77005520, 0.00022400],
    L: [304.22289287, 218.46515314],
    longPeri: [46.68158724, 0.01009938],
    longNode: [131.78635853, -0.00606302],
    correction: { b: -0.00041348, c: 0.68346318, s: -0.10162547, f: 7.67025000 }
  }
];

export function normalizeAngle(rad) {
  return ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export function solveKepler(meanAnomaly, eccentricity) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let k = 0; k < 10; k += 1) {
    const delta = (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-9) break;
  }
  return eccentricAnomaly;
}

export function elementAt([base, rate], centuries) {
  return base + rate * centuries;
}

export function planetState(planet, date) {
  const days = (date.getTime() - J2000) / MS_PER_DAY;
  const centuries = days / 36525;
  const a = elementAt(planet.a, centuries);
  const e = elementAt(planet.e, centuries);
  const inclination = elementAt(planet.i, centuries) * DEG;
  const meanLongitude = elementAt(planet.L, centuries) * DEG;
  const longitudePerihelion = elementAt(planet.longPeri, centuries) * DEG;
  const longitudeNode = elementAt(planet.longNode, centuries) * DEG;
  const argumentPerihelion = longitudePerihelion - longitudeNode;
  // Mean anomaly + Table 2b periodic correction for outer planets (3000BC-3000AD).
  // Coefficients in degrees, f in deg/century — applied as: b·T² + c·cos(f·T·DEG) + s·sin(f·T·DEG).
  let meanAnomaly = meanLongitude - longitudePerihelion;
  if (planet.correction) {
    const { b, c, s, f } = planet.correction;
    const T = centuries;
    const ft = f * T * DEG;
    meanAnomaly += (b * T * T + c * Math.cos(ft) + s * Math.sin(ft)) * DEG;
  }
  meanAnomaly = normalizeAngle(meanAnomaly);
  const eccentricAnomaly = solveKepler(meanAnomaly, e);

  const xv = a * (Math.cos(eccentricAnomaly) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly);
  const trueAnomaly = Math.atan2(yv, xv);
  const radiusAu = Math.sqrt(xv * xv + yv * yv);
  const u = trueAnomaly + argumentPerihelion;

  const cosO = Math.cos(longitudeNode);
  const sinO = Math.sin(longitudeNode);
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);

  const x = radiusAu * (cosO * cosU - sinO * sinU * cosI);
  const z = radiusAu * (sinO * cosU + cosO * sinU * cosI);
  const y = radiusAu * (sinU * sinI);

  return {
    position: new THREE.Vector3(x * AU_SCALE, y * AU_SCALE, z * AU_SCALE),
    radiusAu,
    meanAnomaly,
    eccentricAnomaly,
    trueAnomaly,
    a,
    e
  };
}

// Мягкое насыщение через tanh — оставлено для milkyWayDrift (extragalactic
// frame). На коротких временах ведёт линейно, асимптотически стремится к ±max.
function softSaturate(value, max) {
  return max * Math.tanh(value / max);
}

// Положение Солнца — чистая круговая орбита вокруг центра МП с физически
// точным радиусом (180 ед. = 8 kpc) и плоскостью (XZ = галактическая плоскость).
// Период искусственно сжат до GALACTIC_ORBIT_PERIOD_YEARS = 200 лет (реальный
// 225 Myr невидим в любой симуляции). Это даёт:
//   • Спиральную траекторию планет вокруг дрейфующего Солнца на разумных
//     скоростях (1 оборот = 200 sim лет = 200 сек при 1 year/sec).
//   • Sun никогда не останавливается (нет saturation).
//   • Sun никогда не покидает МП (круг радиуса 180 < disk radius 560).
//   • Физически верная ФОРМА орбиты (круг, не дрейф) — только время масштабировано.
export function sunGalacticPosition(date, referenceDate = new Date(J2000)) {
  const days = (date.getTime() - referenceDate.getTime()) / MS_PER_DAY;
  const years = days / 365.25;
  const theta = (years / galacticOrbitPeriodYears) * Math.PI * 2;
  return new THREE.Vector3(
    Math.sin(theta) * GALACTIC_RADIUS_SCENE,
    0,
    Math.cos(theta) * GALACTIC_RADIUS_SCENE - GALACTIC_RADIUS_SCENE
  );
}

// Движение центра Млечного Пути относительно реликтового излучения (CMB rest frame).
// Получено как (Sun vs CMB) − (Sun vs MW center): диполь CMB даёт Sun ≈ 369 км/с
// к (l=264°, b=48°); вычитаем галактическое вращение Sun ≈ 230 км/с к (l=90°, b=0°);
// результат: **MW vs CMB ≈ 552 км/с к (l≈267°, b≈29°)** — направление в сторону
// Hydra-Centaurus (Великий Аттрактор + Шепли тянут всю Local Group).
//
// Реально за 17 лет симуляции это ~3·10^11 км — на нашей шкале ничтожно мало.
// Амплифицируем до 10 ед./год: сохраняет пропорцию ~1.7× к
// GALACTIC_DRIFT_PER_YEAR_SCENE=6 (реальное соотношение 552/230 ≈ 2.4×, но
// при таком масштабе галактика в extragalactic-фрейме уходила бы слишком быстро).
//
// Соответствие галактических координат сцене:
//   l = 0°  → -Z (Sun → центр МП, Sagittarius A*)
//   l = 90° → +X (направление галактического вращения Sun)
//   b = +90° → +Y (северный галактический полюс)
export const MW_DRIFT_PER_YEAR_SCENE = 10;
const MW_APEX_L = 267 * DEG;
const MW_APEX_B = 29 * DEG;
const MW_DRIFT_DIR = new THREE.Vector3(
  Math.cos(MW_APEX_B) * Math.sin(MW_APEX_L),
  Math.sin(MW_APEX_B),
  -Math.cos(MW_APEX_B) * Math.cos(MW_APEX_L)
).normalize();

export function milkyWayDrift(date, referenceDate = new Date(J2000)) {
  const days = (date.getTime() - referenceDate.getTime()) / MS_PER_DAY;
  const years = days / 365.25;
  // То же насыщение — чтобы вся галактика не улетала за skybox при высокой скорости.
  const drift = softSaturate(years * MW_DRIFT_PER_YEAR_SCENE, GALACTIC_RADIUS_SCENE * 5);
  return MW_DRIFT_DIR.clone().multiplyScalar(drift);
}

// ============================================================================
// Astronomy helpers: ecliptic → equatorial → horizontal coords для sky map.
// Используют ту же Кеплеровскую кинематику (точность ~0.5° за 17 лет — норма
// для NASA approximation). Подходит для stargazing, не для arcsec-точности.
// ============================================================================

// Наклон эклиптики к экватору (obliquity of ecliptic) на J2000.
export const OBLIQUITY = 23.4393 * DEG;

// Greenwich Mean Sidereal Time в радианах для UT даты.
// Формула из Astronomical Almanac (упрощённая, точность ~1 arcsec за 21 век).
export function gmstRadians(date) {
  // Unix epoch (1970-01-01 00:00 UT) = JD 2440587.5.
  const jd = date.getTime() / MS_PER_DAY + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const gmstDeg = 280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T
    - T * T * T / 38710000;
  return (((gmstDeg % 360) + 360) % 360) * DEG;
}

// Сценический Cartesian heliocentric (XZ — эклиптика, Y — северный эклиптический
// полюс) → (longitude λ, latitude β, distance в исходных единицах).
// Соответствие: scene X = направление на точку весеннего равноденствия (γ),
// scene Z = в плоскости эклиптики при λ=90°, scene Y = эклиптический полюс.
export function eclipticFromCartesian(pos) {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  const beta = Math.asin(pos.y / r);
  const lambda = Math.atan2(pos.z, pos.x);
  return { lambda, beta, r };
}

// Эклиптические координаты (λ, β) → экваториальные (RA α, Dec δ) с учётом
// наклона эклиптики ε.
export function eclipticToEquatorial(lambda, beta) {
  const sinB = Math.sin(beta);
  const cosB = Math.cos(beta);
  const sinL = Math.sin(lambda);
  const cosL = Math.cos(lambda);
  const sinE = Math.sin(OBLIQUITY);
  const cosE = Math.cos(OBLIQUITY);
  const dec = Math.asin(sinB * cosE + cosB * sinE * sinL);
  const ra = Math.atan2(
    -sinB * sinE + cosB * cosE * sinL,
    cosB * cosL
  );
  return { ra: ((ra + Math.PI * 2) % (Math.PI * 2)), dec };
}

// Матрица перехода J2000 экваториальные → галактические координаты (IAU 1958).
// Источник: Hipparcos and Tycho Catalogues, Vol. 1, Section 1.5.3.
//   l = 0°, b = 0°  → направление на центр Галактики (Sgr A*)
//   l = 90°, b = 0° → направление галактического вращения
//   b = +90°        → северный галактический полюс
const EQ_TO_GAL = [
  -0.054876, -0.873437, -0.483835,
  +0.494109, -0.444830, +0.746982,
  -0.867666, -0.198076, +0.455984
];

// Экваториальный единичный вектор (RA, Dec в радианах) → галактический единичный.
export function equatorialToGalacticUnit(ra, dec) {
  const cd = Math.cos(dec);
  const xe = cd * Math.cos(ra);
  const ye = cd * Math.sin(ra);
  const ze = Math.sin(dec);
  return {
    x: EQ_TO_GAL[0] * xe + EQ_TO_GAL[1] * ye + EQ_TO_GAL[2] * ze,
    y: EQ_TO_GAL[3] * xe + EQ_TO_GAL[4] * ye + EQ_TO_GAL[5] * ze,
    z: EQ_TO_GAL[6] * xe + EQ_TO_GAL[7] * ye + EQ_TO_GAL[8] * ze
  };
}

// Галактический Cartesian (стандарт: x→центр, y→l=90°, z→полюс) → координаты сцены.
// В нашей сцене: l=0° = -Z, l=90° = +X, b=+90° = +Y.
export function galacticToScene(g, radius) {
  return {
    x: g.y * radius,
    y: g.z * radius,
    z: -g.x * radius
  };
}

// Удобный one-stop: (RA, Dec) в радианах → THREE.Vector3 на сфере radius (галактический фрейм).
export function radecToSceneVec3(ra, dec, radius) {
  const g = equatorialToGalacticUnit(ra, dec);
  const s = galacticToScene(g, radius);
  return new THREE.Vector3(s.x, s.y, s.z);
}

// Экваториальные (RA, Dec) + наблюдатель (lat, lon в радианах, lon East+) →
// горизонтальные (altitude, azimuth — от севера через восток).
export function equatorialToHorizontal(ra, dec, latRad, lonRad, date) {
  const gmst = gmstRadians(date);
  const lst = gmst + lonRad;
  let ha = lst - ra;
  // Нормализуем HA в [-π, π].
  ha = ((ha + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const cosHA = Math.cos(ha);
  const sinAlt = sinDec * sinLat + cosDec * cosLat * cosHA;
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAlt = Math.cos(alt);
  let az = 0;
  if (cosAlt > 1e-6) {
    const cosAz = (sinDec - sinAlt * sinLat) / (cosAlt * cosLat);
    az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
    if (Math.sin(ha) > 0) az = Math.PI * 2 - az;
  }
  return { alt, az };
}
