# Accuracy, limitations & future work

A frank assessment of what this simulation gets right scientifically, where it
makes deliberate visual compromises, and what is genuinely missing.

## What is scientifically accurate

| Aspect | Implementation | Accuracy |
|---|---|---|
| **Planet positions** | Full 6-element Keplerian orbits with secular rates per century (NASA Planetary Approximate Elements) | Sub-arcminute for inner planets, ~1–2 arcmin for gas giants, valid for 1800–2050 |
| **Orbital eccentricities** | Real values (Mercury 0.206, Earth 0.0167, Mars 0.0934, …) | Exact match to JPL table |
| **Orbital inclinations** | Real values relative to the ecliptic | Visible in 3D as orbital tilt |
| **Orbital periods** | Derived from Kepler's third law via semi-major axis | Exact |
| **Sun's galactic orbit** | Real radius 8 kpc, plane (galactic XZ), tilt 60.19° ecliptic↔galactic | Geometry correct; period compressible via slider, real 225 Myr available |
| **Milky Way drift through CMB rest frame** | 552 km/s toward Hydra-Centaurus (l=267°, b=29°) | Direction correct, magnitude amplified for visibility |
| **Tonight's sky panel** | GMST + ecliptic↔equatorial↔horizontal transforms | ~0.5° for civil stargazing |
| **Star catalogue** | Hipparcos ≤ mag 6 (ESA) | Real catalogue data |
| **Constellation lines** | IAU official | Real |
| **Coordinate transforms** | GMST (Astronomical Almanac), IAU 1958 equatorial→galactic matrix | ~1 arcsec per century |

## Deliberate visual compromises

These are conscious tradeoffs — a literal-scale model would be unreadable.

| Object | Real ratio | In demo | Factor |
|---|---|---|---|
| Earth radius vs orbit | 1 : 23 481 | 1 : 46 | 510× enlarged |
| Moon distance from Earth | 60 Earth radii | 2.5 | 24× closer |
| Io distance from Jupiter | 5.9 Jupiter radii | 2.0 | 3× closer |
| Planet sizes relative to each other | Jupiter 11× Earth radius | 2.4× in scene | non-proportional |
| Milky Way drift speed | 552 km/s | ~10 scene units/year | amplified for visibility |
| Galactic orbital period (default) | 225 Myr | 200 yr (slider) | explicit user-controlled compression |

If we honored these ratios, Earth would render at less than one pixel and
Neptune's orbit would be a circle the size of a stadium relative to the bodies.
This is the same compromise made by Celestia, Stellarium, SpaceEngine and every
planetarium presentation.

## What is missing — future work

### Orbital mechanics

- **N-body perturbations.** Each planet currently moves independently. Jupiter's
  pull on Saturn (and vice versa) is the largest effect; over centuries this
  diverges from reality. Migration paths:
  - **VSOP87** — analytical Fourier series, sub-arcsec accuracy back to 4000 BC
  - **JPL DE441** — modern numerical ephemerides, the de-facto standard for
    deep-space navigation
- **Relativistic corrections.** Mercury's perihelion advances 43 arcsec/century
  from general relativity. Negligible visually, mentioned for completeness.
- **Range of validity.** NASA's approximate elements degrade outside 1800–2050.
  For "show the sky in year 3000" or "back to the dinosaurs" we'd need VSOP87
  or a long-term integrator.

### Bodies not modelled

- **Dwarf planets**: Pluto, Ceres, Eris, Makemake, Haumea, Sedna.
- **Asteroid belt and Kuiper belt** as visual populations.
- **Comets**: at minimum Halley (P=76 yr) and Hale-Bopp would be educational.
- **Trojans** at Jupiter L4/L5 — physics-pedagogically interesting (Lagrange
  points).
- **Spacecraft**: Voyager 1/2, New Horizons, Parker Solar Probe — show humanity
  beyond Earth orbit.

### Moons

- Moon orbits are simplified circles around their parent with a single
  semi-major axis, period and phase. Missing:
  - **Real lunar orbital elements** — eccentricity (e=0.0549 for Earth's Moon),
    inclination, argument of pericentre, nodal precession.
  - **Librations and Cassini state** for Earth's Moon (the visible "wobble").
  - **Tidal locking direction** is not enforced; spin and orbital period
    coincide by data but are not coupled.
  - **Resonances**: Io–Europa–Ganymede 4:2:1 (the Laplace resonance) is implicit
    in the periods but not visually highlighted.
- Many real moons not represented: Enceladus, Mimas, Iapetus, Rhea, Hyperion,
  Miranda, Triton, Charon.

### Galactic dynamics

- **Vertical oscillation of the Sun through the disk** — Sun bobs ±70 pc above
  and below the galactic midplane with a period of ~70 Myr. Currently the Sun
  sits at y = 0. Adding this is straightforward (sinusoidal Z) but cosmetically
  significant only at compressed orbital periods.
- **Real galactic spiral arms.** The disk is rendered as smooth radial gradient.
  Modelling Sagittarius, Carina, Perseus, Scutum-Centaurus arms would require
  procedural texture or vertex shader.
- **Local Interstellar Cloud / Local Bubble.** The Sun is currently traversing
  a low-density region — could be visualized as faint nebulosity.
- **Galactic bar** (the central elongated structure) is approximated by the
  bulge but not directionally oriented.

### Reference frames

- **Barycentric vs heliocentric.** All positions are heliocentric. The Solar
  System barycentre wobbles inside the Sun (mostly due to Jupiter) — relevant
  for spacecraft navigation, irrelevant for visualization.
- **ICRS proper motion of stars.** Stars are rendered at fixed positions. Over
  geological time scales the constellations deform — Hipparcos has proper
  motion data that could be integrated.

### Sky and time

- **Lunar phases on the sky panel.** Currently Tonight's sky lists planets;
  adding the Moon with its current phase would round it out.
- **Eclipses.** Predicting solar/lunar eclipse geometry is a natural extension
  of the existing Kepler model + parallax math.
- **Twilight bands.** Civil/nautical/astronomical twilight markers on the sky
  panel.
- **Refraction near horizon.** Atmospheric refraction shifts apparent altitude
  by ~0.5° at horizon — not modelled.

### Visualization features

- **Tour mode** — auto-fly between bodies with narration overlays.
- **Time travel slider** with named events: "Galileo's 1610 Jupiter
  observations", "voyager flybys", "Halley's next perihelion (2061)".
- **Multi-language support** — currently English only.
- **Accessibility**: keyboard-only navigation, screen-reader labels, reduced
  motion preference.
- **Recording mode** — export simulation as video for sharing.

## What would shift this from "educational visualizer" to "research tool"

These changes are out of scope but worth noting:

1. Switch the kinematic core to **JPL DE441 + SPICE toolkit** for arcsec
   accuracy across 13 000 years.
2. Add **proper relativistic ephemerides** and barycentric reference frame.
3. Wire **real-time astronomical data feeds** (asteroid orbits from MPC, comet
   ephemerides from JPL Small-Body Database).
4. Switch coordinate handling to **double-precision** in shaders for arcsec
   precision at AU scale (current single-precision is ~50 km).

This would also mean the project becomes a JavaScript port of a navigation
toolkit rather than a learning aid — which would be a different project.

## Resources

- NASA JPL Approximate Positions of the Planets — used here
  https://ssd.jpl.nasa.gov/planets/approx_pos.html
- IAU SOFA (Standards of Fundamental Astronomy) — reference implementations
  https://www.iausofa.org/
- VSOP87 theory (Bretagnon & Francou 1988) — next step up in accuracy
- JPL Horizons system — live ephemerides for any Solar System body
  https://ssd.jpl.nasa.gov/horizons/
- Hipparcos and Tycho Catalogues, ESA SP-1200 — used here for stars
- Solar System Scope textures (CC BY 4.0) — used here for planet maps
