# Scale Portal (Phase 33)

- Route `/scale-portal` (lazy), entered from the Space section; Astro guides (`CONTEXT_ROUTES`
  '/scale-portal' → space).
- **Science values** live only in `src/features/scalePortal/scales.ts` with their sources: blood cell
  8 µm, ant 5 mm, child 1.2 m, Tashkent Tower 375 m, a big city ~30 km, Earth 12 742 km, Jupiter
  142 984 km, Sun ~1 392 700 km, Solar System = 2 × 30.07 AU, Milky Way 100 000–200 000 ly (range
  kept); AU and light-year exact. Ratios and sizes are rounded to 1–2 significant figures.
- **Continuous journey**: a logarithmic camera `z` (log10 metres across the view) and every stop drawn
  at its true size for it (2D vector, no WebGL), so the last place shrinks into the next; a dashed
  ring marks a place too small to see; the sky turns to space past Earth. Zooms are framer-motion
  tweens stopped on leave; reduced motion jumps.
- **Rail**: evenly spaced stops (`camera.ts` maps rail ↔ camera), a 0.05-step slider for free
  exploration (keyboard friendly), "Kichik ↔ Katta" ends, the size of the place in view.
- **Age** (`AgeProfile.scaleDetail`): 3–6 compare (pictures, bigger/smaller), 7–9 ratios with everyday
  units, 10–12 powers of ten (steps = difference of the powers shown), 13+ scientific notation, AU,
  light-years.
- **Gameplay**: a guess before every portal (`questions.ts`, deterministic, the right value's place
  varies), the jump, then the comparison; a finished journey goes through `emitActivity` (space
  strand, `oncePerDay`); exploring pays nothing.
- Follow-up: "near/far" questions for 3–6.
