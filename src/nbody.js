// N-body Newtonian gravity integration of the major planets + Sun.
// Used as an optional "real physics" alternative to the Kepler formula.
//
// Why Velocity Verlet?
//   • 2nd-order accurate, symplectic — conserves the orbital invariants over
//     long integrations (energy doesn't secularly drift, unlike forward Euler
//     or RK4).
//   • Two acceleration evaluations per step but only one position update —
//     cheaper than RK4 (4 evals) for similar accuracy on Keplerian-like orbits.
//
// Units used throughout this module:
//   • Positions in AU (astronomical units)
//   • Velocities in AU/day
//   • Time in days
//   • Masses in solar masses
//   • Gravitational parameter k² where k = Gauss gravitational constant —
//     gives G·M_sun = k² exactly when distances are in AU, time in days, mass in M_sun.
//     This is the standard astrodynamics unit system.

import { J2000, MS_PER_DAY, AU_SCALE, planets, planetState } from './orbitalModel.js';

// Gauss gravitational constant squared. With AU/day/M_sun units, G·M_sun = k².
// Source: IAU 1976. k = 0.01720209895 rad/day → k² ≈ 2.9591e-4 AU³/day²/M_sun.
const K_SQ = 2.959122082855911e-4;

// Planet masses in solar masses (NASA Planetary Fact Sheets, rounded).
const PLANET_MASSES = {
  Mercury: 1.66012e-7,
  Venus:   2.44784e-6,
  Earth:   3.00348e-6, // Earth + Moon combined (we treat EM-Bary as point)
  Mars:    3.22716e-7,
  Jupiter: 9.54791e-4,
  Saturn:  2.85886e-4,
  Uranus:  4.36624e-5,
  Neptune: 5.15139e-5
};

// State layout: parallel arrays sized N = number of bodies. Index 0 is the Sun.
// Storing flat Float64Arrays — faster than object access in tight integration loop.
class NBodyState {
  constructor() {
    this.names = ['Sun', ...planets.map((p) => p.name)];
    this.n = this.names.length;
    this.mass = new Float64Array(this.n);
    this.x = new Float64Array(this.n);
    this.y = new Float64Array(this.n);
    this.z = new Float64Array(this.n);
    this.vx = new Float64Array(this.n);
    this.vy = new Float64Array(this.n);
    this.vz = new Float64Array(this.n);
    this.ax = new Float64Array(this.n);
    this.ay = new Float64Array(this.n);
    this.az = new Float64Array(this.n);
    this.mass[0] = 1.0;
    for (let i = 1; i < this.n; i += 1) {
      this.mass[i] = PLANET_MASSES[this.names[i]] || 0;
    }
    this.date = new Date(J2000);
  }

  // Initialize positions + velocities from Kepler at the given date.
  // Velocity via finite difference: planetState at date and date+dt, divide by dt.
  // dt = 0.01 days = 14.4 min → numerical noise well below physical signal.
  initFromKepler(date) {
    const dt = 0.01; // days
    this.x[0] = 0; this.y[0] = 0; this.z[0] = 0;
    this.vx[0] = 0; this.vy[0] = 0; this.vz[0] = 0;
    const dateFwd = new Date(date.getTime() + dt * MS_PER_DAY);
    for (let i = 0; i < planets.length; i += 1) {
      const planet = planets[i];
      const p1 = planetState(planet, date);
      const p2 = planetState(planet, dateFwd);
      // Convert scene units back to AU.
      const x1 = p1.position.x / AU_SCALE;
      const y1 = p1.position.y / AU_SCALE;
      const z1 = p1.position.z / AU_SCALE;
      const x2 = p2.position.x / AU_SCALE;
      const y2 = p2.position.y / AU_SCALE;
      const z2 = p2.position.z / AU_SCALE;
      const idx = i + 1;
      this.x[idx] = x1; this.y[idx] = y1; this.z[idx] = z1;
      this.vx[idx] = (x2 - x1) / dt;
      this.vy[idx] = (y2 - y1) / dt;
      this.vz[idx] = (z2 - z1) / dt;
    }
    // Remove momentum of the system relative to the Sun. Otherwise the Sun
    // slowly drifts due to numeric errors in heliocentric coordinates.
    // Actually we keep Sun fixed at origin in heliocentric frame — for that we
    // need to subtract the Sun's induced motion, but since planets are tiny
    // perturbers (Jupiter is 1/1047 of Sun) the drift is negligible per orbit.
    this.computeAccelerations();
  }

  // a_i = sum over j != i of  k² · m_j · (r_j - r_i) / |r_j - r_i|³
  computeAccelerations() {
    const { n, mass, x, y, z, ax, ay, az } = this;
    for (let i = 0; i < n; i += 1) { ax[i] = 0; ay[i] = 0; az[i] = 0; }
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = x[j] - x[i];
        const dy = y[j] - y[i];
        const dz = z[j] - z[i];
        const r2 = dx * dx + dy * dy + dz * dz;
        const r = Math.sqrt(r2);
        const inv_r3 = 1 / (r2 * r);
        const k_inv_r3 = K_SQ * inv_r3;
        const mj = mass[j] * k_inv_r3;
        const mi = mass[i] * k_inv_r3;
        ax[i] += dx * mj; ay[i] += dy * mj; az[i] += dz * mj;
        ax[j] -= dx * mi; ay[j] -= dy * mi; az[j] -= dz * mi;
      }
    }
  }

  // One Velocity Verlet step. `dt` in days, can be negative for backward integration.
  step(dt) {
    const { n, x, y, z, vx, vy, vz, ax, ay, az } = this;
    const halfDt = 0.5 * dt;
    // Half-kick using current accelerations
    for (let i = 0; i < n; i += 1) {
      vx[i] += halfDt * ax[i];
      vy[i] += halfDt * ay[i];
      vz[i] += halfDt * az[i];
    }
    // Drift
    for (let i = 0; i < n; i += 1) {
      x[i] += dt * vx[i];
      y[i] += dt * vy[i];
      z[i] += dt * vz[i];
    }
    // Recompute accelerations at new positions
    this.computeAccelerations();
    // Half-kick using new accelerations
    for (let i = 0; i < n; i += 1) {
      vx[i] += halfDt * ax[i];
      vy[i] += halfDt * ay[i];
      vz[i] += halfDt * az[i];
    }
  }

  // Advance state to targetDate. Step size is 1 day; clamps total per call so
  // a single frame never takes more than `maxStepsPerCall` substeps even if the
  // user cranks simulation speed up. Beyond that, missing time accumulates and
  // catches up over subsequent frames (acceptable visual drift while user is
  // dragging the speed slider).
  advanceTo(targetDate, maxStepsPerCall = 4000) {
    const dtTotalDays = (targetDate.getTime() - this.date.getTime()) / MS_PER_DAY;
    if (Math.abs(dtTotalDays) < 1e-9) return;
    // Choose step: 1 day for normal speeds, larger if user is running insanely fast.
    const absTotal = Math.abs(dtTotalDays);
    let stepDays = 1;
    if (absTotal / stepDays > maxStepsPerCall) {
      stepDays = absTotal / maxStepsPerCall;
    }
    const sign = Math.sign(dtTotalDays);
    let remaining = absTotal;
    let steps = 0;
    while (remaining > 1e-9 && steps < maxStepsPerCall) {
      const stepSize = Math.min(stepDays, remaining);
      this.step(sign * stepSize);
      remaining -= stepSize;
      steps += 1;
    }
    this.date = new Date(this.date.getTime() + sign * (absTotal - remaining) * MS_PER_DAY);
  }

  // Get position of named body in scene units.
  getScenePosition(name, out) {
    const idx = this.names.indexOf(name);
    if (idx < 0) return null;
    out.set(this.x[idx] * AU_SCALE, this.y[idx] * AU_SCALE, this.z[idx] * AU_SCALE);
    return out;
  }
}

let state = null;

// Reinit state from Kepler at the given date.
export function resetNBody(date) {
  if (!state) state = new NBodyState();
  state.initFromKepler(date);
  state.date = new Date(date.getTime());
}

// Advance the integration to targetDate. If `state` doesn't exist yet or
// `targetDate` differs from current state.date by more than `jumpThresholdDays`,
// reinitialise from Kepler (avoids trying to integrate 1000 years in one frame
// when the user clicks "Reset date").
export function advanceNBody(targetDate, jumpThresholdDays = 365 * 5) {
  if (!state) {
    resetNBody(targetDate);
    return;
  }
  const dt = (targetDate.getTime() - state.date.getTime()) / MS_PER_DAY;
  if (Math.abs(dt) > jumpThresholdDays) {
    resetNBody(targetDate);
    return;
  }
  state.advanceTo(targetDate);
}

// Read scene-space position of a planet from current N-body state.
export function getNBodyPosition(name, outVector3) {
  if (!state) return null;
  return state.getScenePosition(name, outVector3);
}

export function isNBodyReady() {
  return state !== null;
}

// Energy + angular momentum diagnostics, useful for verifying the integrator.
// Returns null if state not initialized.
export function nBodyDiagnostics() {
  if (!state) return null;
  const { n, mass, x, y, z, vx, vy, vz } = state;
  let ke = 0;
  let pe = 0;
  for (let i = 0; i < n; i += 1) {
    ke += 0.5 * mass[i] * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
    for (let j = i + 1; j < n; j += 1) {
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      const dz = z[j] - z[i];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      pe -= K_SQ * mass[i] * mass[j] / r;
    }
  }
  return { ke, pe, total: ke + pe, date: new Date(state.date.getTime()) };
}
