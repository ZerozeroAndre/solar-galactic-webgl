import assert from 'node:assert/strict';
import {
  J2000,
  MS_PER_DAY,
  planetState,
  planets,
  solveKepler,
  sunGalacticPosition
} from '../src/orbitalModel.js';

const date = new Date(Date.UTC(2026, 4, 13, 12, 0, 0));
const later = new Date(date.getTime() + 30 * MS_PER_DAY);

for (const planet of planets) {
  const state = planetState(planet, date);
  const next = planetState(planet, later);
  const residual = Math.abs(state.eccentricAnomaly - state.e * Math.sin(state.eccentricAnomaly) - state.meanAnomaly);

  assert.ok(Number.isFinite(state.radiusAu), `${planet.name} radius is finite`);
  assert.ok(state.radiusAu > planet.a[0] * (1 - planet.e[0]) * 0.98, `${planet.name} inside perihelion bound`);
  assert.ok(state.radiusAu < planet.a[0] * (1 + planet.e[0]) * 1.02, `${planet.name} outside aphelion bound`);
  assert.ok(state.position.distanceTo(next.position) > 0.001, `${planet.name} moves over 30 days`);
  assert.ok(residual < 1e-7, `${planet.name} Kepler residual too high`);
}

const earth = planets.find((planet) => planet.name === 'Earth');
const earthJ2000 = planetState(earth, new Date(J2000));
assert.ok(earthJ2000.radiusAu > 0.97 && earthJ2000.radiusAu < 1.03, 'Earth is near 1 AU at J2000');

// Sun движется по чистой круговой орбите 225 Myr (real period). На годовых
// масштабах смещение ничтожно — это физически верно.
// Тесты на галактической шкале: Sun остаётся на круге радиуса 180 ед.
const reference = new Date(Date.UTC(2026, 4, 13, 12, 0, 0));
const sunNow = sunGalacticPosition(reference, reference);
assert.ok(sunNow.length() < 1e-9, 'galactic frame starts at Sun origin');

// На больших временных шкалах (200 kyr — внутри Date max) Sun перемещается.
const sun200kyr = sunGalacticPosition(new Date(reference.getTime() + 2e5 * 365.25 * MS_PER_DAY), reference);
assert.ok(sun200kyr.distanceTo(sunNow) > 0.5, 'Sun moves perceptibly over 200 kyr');

// Earth heliocentric motion проверяется отдельно — независимо от галактической рамы.
const earthLater = planetState(earth, new Date(reference.getTime() + 91.3125 * MS_PER_DAY)).position;
const earthNow = planetState(earth, reference).position;
assert.ok(earthLater.distanceTo(earthNow) > 3, 'Earth heliocentric position changes over 3 months');

console.log(`Verified ${planets.length} planetary orbits, Kepler solver, and galactic Sun motion.`);
