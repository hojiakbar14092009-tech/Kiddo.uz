# Shadow Lab (Phase 34)

- Route `/shadow-lab` (lazy), entered from the Space section; Lumi guides ('/shadow-lab' → light).
- **Real shadows** (`src/features/shadowLab/geometry.ts`): a point light, a flat cut-out object and a
  wall; each corner is projected from the light onto the wall (central projection), with turning in
  the object's plane, turning towards the wall (about the vertical axis) and the lamp's depth. No
  pictures: the wall view and the map from above (`views.tsx`, true top view, +x drawn downwards)
  are computed from the scene. Solids' front/top/side silhouettes come from their sizes (`solids.ts`).
- **Five modes** per mission (`puzzles.ts`, fixed data by `AgeProfile.puzzleDepth`): match the shadow,
  identify from views, build from pieces (places laid out as on the wall), light only, detective
  (maps without rays: infer lamp side and distance from the shadow's place and size).
  simple = one object, one light, one control; spatial = turning + moving the light; multi = several
  controls, three views, four places, turned objects.
- **Checking** (`check.ts`): overlap (IoU on a fixed 64 × 64 grid) ≥ 0.72 / 0.80 / 0.85 by depth;
  builds by exact pieces; a miss gets a hint naming the control and the +/− direction; after three
  misses Lumi can show it (then not independent). Sliders with +/− buttons (touch, mouse, keyboard).
- The intro shows the first mission's scene (wall + map, computed) under the Start button (Phase 36), so the
  lab is not an empty page before it starts. If the active child changes mid-run the lab returns to
  its intro, so a reward always goes to the child who played (same in the Scale Portal).
- Soft shadow edge only when `mascotQuality()` is 'high'. A finished mission → `emitActivity`
  (science strand, `oncePerDay`).
- Follow-ups: two-clue detective for the older band, aria-valuetext on the sliders, a side inset for
  the lamp's height.
