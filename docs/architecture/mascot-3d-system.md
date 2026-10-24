# 3D mascot system (Phase 19)

Ten rigged 3D characters, one runtime. The owner's character sheets are the visual source; the
models are built from code, so every character can be reviewed, rebuilt and changed as text.

```text
tools/mascots (Blender Python)  →  tools/mascots/out/<id>.glb  →  scripts/mascots-optimize.mjs
  model · skeleton · skin weights      raw export                   static channels dropped, keys
  face morph targets · named clips                                    resampled, sparse morphs,
                                                                      meshopt, glTF validator,
                                                                      contract check
                                    →  public/mascots/<id>.glb  (+ posters/<id>.webp)
runtime: registry → MascotFigure → Character3D (lazy) → director + controller → three.js
```

## Pipeline

- `npm run mascots:build` (`python3 tools/mascots/build.py [ids] [--poster] [--render]`) needs the
  Blender Python module (`pip install bpy`, Blender 5.2). `--render` writes Cycles turnaround and
  face close-ups for modelling review (not shipped); `--poster` renders the still pictures.
- `npm run mascots:optimize [ids]` writes `public/mascots` and fails on any glTF validator error or
  warning, or a broken contract (core bones, required clips, morph targets). A bone that moves in
  any clip keeps a channel in every clip, so each clip sets the whole pose (nothing stays stuck
  from the clip before); bones that never move lose their channels.
- Source files are the Python modules (`kit.py` primitives/skin/face/export, `robots.py`,
  `creatures.py`, `human.py`, `props.py`, `clips.py`, `mascots.py`). No `.blend` files are kept: the
  scripts are the source. `tools/mascots/out` is a build folder (git-ignored).
- Modelling is procedural (rounded primitives, lathes, tubes, extruded outlines, leaves), not
  sculpted or AI-generated: a stylised match of each sheet's silhouette, colours, costume parts and
  accessories, without sculpted micro detail (see Limitations).

## Rig families and bones

All bones rest with their axes on the world axes and share their names, so one clip library
(`clips.py`) is authored once and baked onto every character's skeleton with that character's
amplitudes; this is a shared library by bone name, not runtime retargeting.

| Family      | Mascots                     | Notes                                                                         |
| ----------- | --------------------------- | ----------------------------------------------------------------------------- |
| robot-biped | KidoBot, Astro, Melo, Pixel | every part 100 % on one bone: rigid segments, dark joint balls, no rubber     |
| human-biped | Ziyo                        | sleeves and trouser legs blend at elbow / knee; doppi, sash knot, boots rigid |
| creature    | Dinoo, Leafy, Lumi          | body blends Hips→Chest; tail / ear chains with smooth weights                 |
| prop        | Scribble, Story             | the prop is the rigid body on `Head`; Story opens with `Cover_L/R`            |

Core bones: `Root, Hips, Spine, Chest, Neck, Head, Shoulder_*, UpperArm_*, Forearm_*, Hand_*,
UpperLeg_*, LowerLeg_*, Foot_*` (`_L` is the character's left, +X in Blender). Extra bones: tails,
ears, sprout, antenna, sash, tool, covers, pages, bookmark, and KidoBot's outfit sockets
(`Socket_Head`, `Socket_Face`, `Socket_Neck`, sized like the earlier robot so the shop's clothes fit).

Root motion: every clip is in place (only the hips go up and down); moving a mascot across the
screen is the app's job (`RoamingMascot`). A contract test checks this.

## Animation semantics

Shared commands (`registry.ts GESTURES`): idle, idle_alt, look_around, wave, point, point_up, nod,
shake_head, celebrate, jump, think, surprised, encourage, listen, talk, walk, run, turn, sit,
sleep (+ `celebrate_calm` for reduced motion). A mascot may perform a command its own way
(`MASCOTS[id].style`): `celebrate` is a hop with a tail wag for Dinoo, shining for Lumi, a bloom
for Leafy, a dance for Melo; `wave` is Ziyo's welcome; Astro floats in space (`idleIn`).

Crossfade 0.25 s (AnimationMixer). The director (`director.ts`) is the one authority:

| Priority      | What                                      | Interrupts              |
| ------------- | ----------------------------------------- | ----------------------- |
| 5 critical    | world unlocked                            | everything              |
| 4 reaction    | answers, rewards, quests, finds           | lower; equal ones queue |
| 3 speaking    | a layer while speech plays (talk)         | idle gestures           |
| 2 interaction | a tap (rate-limited: 1 / 1.2 s, 3 / 10 s) | idle gestures           |
| 1 context     | spontaneous idle gestures (lively pages)  | idle                    |
| 0 idle        | the page's base pose                      | –                       |

Bursts: reactions within 350 ms merge (the strongest plays), the queue keeps at most 3, sequences
(`then`) play in order, and the mascot always returns to its base.

## Emotions and face

13 emotions (`emotions.ts`) are weights of 17 shared morph targets (eyes, look, mouth, brows),
blended over the mascot's `blendMs` (150–400 ms). Robots have glowing screen faces (emissive bands
on the visor, no brows); organic faces have layered eyes (white, iris, pupil, two highlights, a
lid that closes for blinks and ^^ smiles), brows, a mouth with a tongue and blush. Blinks come at
bounded pseudo-random 2.2–6 s intervals (sometimes double), never through closed eyes, stepped by
the render loop (no timers). Speaking: the TTS gives no timing or phonemes, so the mouth opens on
irregular syllable-like beats while speech plays; this is not lip-sync. Glow (Lumi, robot lights,
Melo's note) breathes slowly and brightens in celebrations.

Wrong answers make a mascot think or encourage, never sad (`reactions.ts`); `gentle_sad` exists
only for a story's own sad moment. The 2D robot's red "mistake" tint was removed.

## Events (Phase 18)

`bridge.ts` (MascotEventBridge) subscribes to `subscribeDomainEvents` only while a mascot is shown,
filters to the playing child, and hands signals to each mascot's resolver. Mapping:
activity.completed → encourage (3 stars: celebrate); resource earned (crystal/part) → surprised →
celebrate (Pixel: thumbs up for a part), stars → nod, spending → nothing; quest/achievement/skill →
celebrate; journey.step → point; world.unlocked → surprised → excited (critical); artifact →
surprised → celebrate; building.upgraded → Pixel wrench → thumbs up; Leafy: seed → gardening,
plant grew → leaf flutter, bloom / mistake.resolved → bloom, mistake.confirmed → encourage.
mistake.made and level changes → nothing. Mascots never pay, unlock or complete anything.

## Pages

Config, not code: `CONTEXT_ROUTES` (route prefix → context) and each mascot's `contexts`.
Home and everything else → KidoBot (in the child's colours: blue, or pink for `girl`, with the
shop's outfits on its sockets); space and Mars → Astro; Spaceport → Pixel (new guide beside the
rocket); dinosaurs → Dinoo (the guide, not the species models); Uzbekistan → Ziyo; Practice
Garden, garden lessons, Science Lab → Leafy; alphabet, letter games, tracing, studio → Scribble;
tales and words → Story. Melo (music) and Lumi (light) have no page yet: they are complete in the
registry and the Mascot Lab for the future Music room and Shadow Lab. One mascot per figure; a
figure shows one model at a time.

## Responsive, accessibility

`MascotFigure` keeps the 5:6 box and the width classes of the earlier robot, so every placement
that was checked at 320–1920 px and 200 % text stays the same; the mascot never grows with text.
The 3D canvas is decorative (`aria-hidden`, or `role="img"` with a label when given); a tap is a
fun extra with no function. Reduced motion: the base pose holds still (idle time scale 0), no
blinking, no glow pulse, a still open mouth while speaking, and big moves become
`celebrate_calm`; the contact shadow stays still.

## Performance and memory

- Models are runtime assets, never in the JS bundle; `Character3D` is a lazy chunk.
- One model per shown mascot, fetched when shown; the next quest's guide is prefetched (one
  low-priority request, no parsing) from the journey card.
- `assets.ts` counts users per model: a model nobody shows is kept 20 s, then geometry and
  materials are disposed. Each mascot owns copies of its materials (palette, glow) and disposes
  them; mixers are uncached on unmount. Unmounting releases the WebGL context (not a failure).
- Render on demand at 30 fps (10 with reduced motion), nothing off screen or in a hidden tab;
  `useFrame` steps the director, the mixer, blinking and the mouth, so all of it pauses together.
- Quality tiers (`webgl.ts`): very weak devices (≤ 2 cores or < 2 GB) get the still picture;
  modest ones (≤ 4 cores or ≤ 4 GB) get `low` (pixel ratio 1, 20 fps, no reflections, a still
  shadow, no spontaneous idle gestures); others `high`. LOD: one optimised mesh per mascot (8–24 k triangles) is cheap enough at mascot
  sizes, so there are no extra LOD meshes; the tiers reduce cost instead.
- Offline: posters are precached; GLBs are cached on first use (`kiddo-mascots`,
  StaleWhileRevalidate: a rebuilt model replaces the cached one on the next visit; the runtime
  tolerates an older model meanwhile: unknown clips fall back to idle, missing sockets are skipped).

## Fallback

WebGL missing, a failed load (logged once as `[mascot] … did not load`, never retried in a loop)
or a lost context → the still picture: the 2D robot for KidoBot, a poster rendered from the same
3D model for the others. The picture also holds the box while the model loads.

## Mascot Lab

`/dev/mascots` exists only in development and e2e builds: mascot selector, 0–315° views and a 360°
turntable, rotate and zoom, every clip, every emotion, skeleton lines, speaking, reduced motion,
quality tier, and numbers (triangles, vertices, meshes, materials, textures, clips, bones, morph
targets, asset size, playing clip, models in memory). `?m=<id>&yaw=<deg>&e=<emotion>&clean` makes
a bare stage for validation screenshots.

## Asset manifest

| Mascot   | Rig         | GLB    | Clips | Own clips                              | Extra bones                            | Morphs | Poster |
| -------- | ----------- | ------ | ----- | -------------------------------------- | -------------------------------------- | ------ | ------ |
| KidoBot  | robot-biped | 250 KB | 21    | –                                      | Antenna, Socket_Head/Face/Neck         | 14     | 10 KB  |
| Astro    | robot-biped | 274 KB | 23    | float, telescope                       | Antenna, sockets                       | 14     | 10 KB  |
| Dinoo    | creature    | 371 KB | 25    | happy_hop, sniff, stomp, tail_wag      | Tail_1–3                               | 17     | 7 KB   |
| Ziyo     | human-biped | 400 KB | 23    | present, welcome                       | Sash                                   | 17     | 9 KB   |
| Lumi     | creature    | 349 KB | 23    | hover, illuminate                      | Ear_L/R, Sprout (curl), Tail_1 (wings) | 17     | 8 KB   |
| Leafy    | creature    | 392 KB | 24    | bloom, gardening, leaf_flutter         | Ear_L/R, Sprout, Tail_1–2              | 17     | 9 KB   |
| Melo     | robot-biped | 272 KB | 24    | dance, headphone_listen, rhythm        | sockets                                | 14     | 11 KB  |
| Pixel    | robot-biped | 292 KB | 25    | inspect, repair, thumbs_up, wrench     | Antenna, Tool (wrench), sockets        | 14     | 11 KB  |
| Scribble | prop        | 235 KB | 24    | draw, erase, write                     | –                                      | 17     | 7 KB   |
| Story    | prop        | 269 KB | 25    | page_flutter, present, read, storytell | Cover_L/R, Page_1–2, Bookmark          | 17     | 9 KB   |

Shared clips in every model: idle, idle_alt, look_around, wave, point, point_up, nod, shake_head,
celebrate, celebrate_calm, jump, think, surprised, encourage, listen, talk, walk, run, turn, sit,
sleep. Textures: none (material zones only, e.g. Ziyo's ikat belbog' is bands of blue, indigo and
white with gold diamonds), so no KTX2 is needed.
Budget (contract test): < 450 KB per GLB; the optimize step fails on any Khronos validator error
or warning (all ten: 0 / 0).

## Limitations (honest)

- Procedural models are stylised approximations of the sheets: the silhouettes, colours, costume
  parts and accessories match, but there is no sculpted detail (no fingers beyond a mitten and a
  thumb, no fabric folds, the doppi and vest ornaments are simple gold shapes, Dinoo's spots and
  plates are fewer). A sculpted pass by a 3D artist on the same rigs would raise the finish.
- No phoneme lip-sync (the TTS gives no timing); the mouth follows speech on/off only.
- Music room and Shadow Lab do not exist yet, so Melo and Lumi appear only in the Lab.
- Look-at follows a touch for 3 s (no constant mouse tracking), added on top of the animated head
  each frame without accumulating; there is no look at a UI target.
