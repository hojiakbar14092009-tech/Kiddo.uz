# Kiddo characters: inventory and production state (Phase 76)

The one list of every character, story animal, object and place the 3D work of
Phases 76–86 covers, taken from the repository (not from concept pictures). Each
row says honestly how far it is. Reference sheets the owner gave are in
`docs/reference/sheets/` (pictures only: they are not meshes, rigs or clips).

States, in order: **Reference** (a picture only) → **Modeled** → **Rigged** →
**Animated** → **Integrated** (used in the app) → **Browser verified** → **Ready**.
Nothing is called Ready because only its front looks right.

## Pipeline

- Blender 4.2 as a Python module: `python3.11 -m pip install bpy==4.2.0`, then
  `python3.11 tools/mascots/build.py [ids]` writes `tools/mascots/out/<id>.glb`
  (models, rig, clips, face shape keys from `tools/mascots/*.py`), and
  `npm run mascots:optimize` compresses, validates (Khronos validator + the Kiddo
  contract: core bones, required clips, face shapes) and copies to `public/mascots`.
- Inspection: `/dev/mascots` (development and e2e builds only, never linked for
  children): front/side/back views, a turntable, drag or arrow keys to turn the
  model (Phase 76), clips, emotions, skeleton, speaking, high/low quality, numbers.
- Quality: `features/mascot/webgl.ts` decides which devices get 3D at all; the
  mascot has a high and a low tier (`Character3D` `quality`); the canvas budget is in
  `components/three/renderBudget.ts`. A third (medium) tier comes with the story
  stage (Phase 81), where the scene, not the character, costs the most.

## The 10 mascots

One registry (`features/mascot/characters/registry.ts`), one model each in
`public/mascots/<id>.glb`: a skinned mesh with a skeleton, a face with 14 shape
keys, and 12+ clips (idle, idle_alt, look_around, wave, point, nod, celebrate,
listen, encourage, jump, and the mascot's own).

| Id       | Name     | Rig         | Own clips                      | State                        | Next (Phase 77)                                          |
| -------- | -------- | ----------- | ------------------------------ | ---------------------------- | -------------------------------------------------------- |
| kidobot  | KidoBot  | robot biped | run                            | Integrated, browser verified | greeting, thinking with hand to chin, LED face changes   |
| astro    | Astro    | robot biped | float                          | Integrated, browser verified | the "Spark" look (owner's decision), low-gravity landing |
| dinoo    | Dinoo    | creature    | happy_hop                      | Integrated, browser verified | tail balance, stomp, sniff, small roar                   |
| ziyo     | Ziyo     | human biped | present                        | Integrated, browser verified | respectful greeting, presenting objects                  |
| lumi     | Lumi     | creature    | hover, illuminate              | Integrated, browser verified | the "Starbit" look (owner's decision), light changes     |
| leafy    | Leafy    | creature    | gardening, bloom, leaf_flutter | Integrated, browser verified | watering, wind response                                  |
| melo     | Melo     | robot biped | dance, headphone_listen        | Integrated, browser verified | rhythm nodding                                           |
| pixel    | Pixel    | robot biped | inspect                        | Integrated, browser verified | fixing, assembling                                       |
| scribble | Scribble | prop        | draw, erase                    | Integrated, browser verified | tracing letters                                          |
| story    | Story    | prop        | page_flutter                   | Integrated, browser verified | opening pages, reading aloud                             |

## The 12 story animals ("O‘z ertagim")

Today each is a flat 3D-rendered picture (`public/3d/<id>.webp`) standing on the
story stage (Phase 74: breathing, squash and stretch, a feeling above its head).
None has its own model yet. Sheets: `docs/reference/sheets/`.

| Id       | Name         | Sheet                    | State     | Body and motion it needs                    |
| -------- | ------------ | ------------------------ | --------- | ------------------------------------------- |
| rabbit   | Quyoncha     | ✓                        | Reference | small hops, nose twitch, ear flick          |
| cat      | Mushukcha    | ✓                        | Reference | soft paw walk, tail sway, stretch, pounce   |
| dog      | Kuchukcha    | ✓                        | Reference | trot, sniff, tail wag, sit                  |
| penguin  | Pingvincha   | ✓ (hat, goggles, scarf)  | Reference | waddle, flipper flap, belly slide           |
| bear     | Ayiqcha      | ✓ (cap, scarf, backpack) | Reference | heavy cute walk, wave, climb                |
| fox      | Tulkicha     | ✓ (bandana)              | Reference | light steps, ear turns, tail flow, sniff    |
| elephant | Filcha       | ✓ (bandana)              | Reference | weighty steps, trunk, ear sway, water spray |
| lion     | Sherbola     | ✓ (bandana)              | Reference | confident walk, crouch, gentle roar         |
| turtle   | Toshbaqacha  | ✓ (cap)                  | Reference | slow steps, neck stretch, hide in shell     |
| owl      | Boyo‘g‘licha | ✓ (cap, glasses, book)   | Reference | head turn, blink, wing flap, short flight   |
| unicorn  | Yakkashox    | ✓                        | Reference | elegant walk, mane, magic sparkle           |
| dinosaur | Dinozavrcha  | ✓ (cap, bandana)         | Reference | walk with tail balance, stomp, small roar   |

## The 12 helpers (objects)

Owner's decisions: objects have **no faces** (only their shape, colours and
motion); the balloon is a **hot-air balloon with a basket** the hero rides in; the
kite is a **flying kite on a string** (the sheet's pinwheel only gives its colours);
the binoculars are two-eyed; the karnay is the national karnay.

| Id         | Name          | Sheet       | State     | Motion it needs                         |
| ---------- | ------------- | ----------- | --------- | --------------------------------------- |
| umbrella   | Soyabon       | ✓           | Reference | open, close, sway in wind               |
| lantern    | Fonar         | ✓           | Reference | light on and off, warm flicker          |
| key        | Kalitcha      | ✓           | Reference | turn in a lock, open a door or chest    |
| balloon    | Havo shari    | ✓           | Reference | rise, drift, land, basket sways         |
| kite       | Varrak        | ✓ (colours) | Reference | fly on the wind, string, tail           |
| telescope  | Durbin        | ✓           | Reference | raised to the eyes, look left and right |
| boat       | Qayiq         | ✓           | Reference | rock on waves, sail, wake               |
| bicycle    | Velosiped     | ✓           | Reference | wheels and pedals turn with the ride    |
| book       | Sehrli kitob  | ✓           | Reference | open, pages turn, sparkle               |
| bell       | Qo‘ng‘iroqcha | ✓           | Reference | swing and ring with its sound           |
| paintbrush | Mo‘yqalam     | ✓           | Reference | paint a stroke that stays               |
| trumpet    | Karnay        | ✓           | Reference | played, sways with the tune             |

## The 12 places

The look reference is `docs/reference/places/` (all twelve, and the soft rounded
forest the owner wants as the style). Today the stage builds each from the tales'
low-poly kit plus a few props (Phase 74). No 360° view is needed: the camera stays
at a child's eye height in front.

| Id        | Name    | State                                      |
| --------- | ------- | ------------------------------------------ |
| forest    | O‘rmon  | Integrated (simple), to rebuild (Phase 81) |
| space     | Koinot  | same                                       |
| sea       | Dengiz  | same                                       |
| city      | Shahar  | same                                       |
| mountains | Tog‘lar | same                                       |
| desert    | Sahro   | same                                       |
| north     | Qutb    | same                                       |
| garden    | Bog‘    | same                                       |
| castle    | Qasr    | same                                       |
| farm      | Ferma   | same                                       |
| bazaar    | Bozor   | same                                       |
| island    | Orol    | same                                       |

## Other characters

- **Pets** (`public/pets/<id>/`, five: bunny, cat, guinea pig, hamster, parrot): flat
  pictures with six feelings each; not part of Phases 76–86.
- **"Bola tarbiyasi"** has no content or characters yet: its page and 30 days come
  in Phase 83; its characters are chosen then from this list.
