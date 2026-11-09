# Attention helper, science games and cartoons (Phases 58–61)

## Attention helper (Phase 58)

- **Asked once, answered by a grown-up.** On the first child screen after the
  welcome tour, `AttentionConsent` asks whether the robot may notice when the
  child drifts off. There is no close button and Escape does nothing: the only
  way on is an answer, and both answers are fine. Either button first opens the
  parent gate, so a child's tap is never an answer. The text says what it does,
  why it helps, what the camera does and does not do, and that Free has no voice.
  The answer lives in `store/attentionStore.ts` (`kiddo.attention`, per device);
  a parent changes it in Settings (`AttentionPanel`), consent can be withdrawn.
- **What counts as drifting off** (`features/attention/tracker.ts`, pure):
  leaving the app for 4 s or more (greeted on the way back, never scolded), no
  touch for 25 s on a learning screen (30 s at four; the robot reading aloud
  counts as busy), or a face turned away for 4 s (camera). Menus, the reward
  screen and the cartoons are not watched for touch or gaze (`routes.ts`).
- **What the robot does.** First a gentle call, then a warmer one; the third
  distraction within five minutes becomes an offer of the three science games
  (a dialog with three big cards and "Later"). Never two reminders within 15 s.
  The robot peeks in from the lower left with a bubble; PRO (and the demo build)
  also hear it, Free sees it only. Every line is in `attention.say`, recorded.
- **The camera** (`cameraWatcher.ts`) runs only with consent, only on learning
  screens, only while the app is visible. A tiny face detector (face-api, MIT,
  `/models/face`, ≈ 0.3 MB of models) looks at a 160 px picture about three times
  a second; `gazeOf` turns three points of the face into "screen" or "away". No
  frame is drawn, kept or sent. The detector chunk (≈ 1.3 MB) is downloaded the
  first time the camera is used and cached then, never precached for everyone.
  While it runs a small camera sign is on screen. A browser that refuses the
  camera leaves the helper working without it.
- **AI rule.** The kids app has no AI features; the face detector is the one
  exception, decided by the owner: on-device, opt-in by a grown-up, yes/no only.

## Faster, by name in the parent's voice (children's voices update)

- Turned away 2 s, out of the app 2 s, no touch 15 s at every age (`tracker.ts`). A
  look-away met while the robot reads is not lost: it is tried again every half second
  and the robot calls as soon as it is quiet.
- The name: a parent records it once in the profile (`NameRecorder`, MediaRecorder, up to
  3 s, listen and record again). It is kept only on this device (IndexedDB,
  `nameVoice.ts`), never uploaded or synced, and deleted with the profile. The robot
  plays it, then its own recorded line; without a recording the line is said without
  the name (the bubble still shows it). The device voice no longer says the name.

## Science games (Phase 59)

`/sci/water` (a droplet's trip: the water cycle in taps), `/sci/magnet` (only iron
sticks: 4 of 8 things), `/sci/float` (guess, then watch: 3 float, 3 sink). Content
and scoring in `sciGames/rules.ts`; a finished game is one universe run (strand
science, `sci:<id>`, once a day), so rewards stay idempotent. In the Explore hub
and in the attention helper's offer.

## Cartoons (Phases 60–61)

- `/shorts`: thirteen vertical cartoons (`shorts/catalog.ts`), one opened at a time,
  nothing plays on by itself, four per sitting and then the robot suggests a game.
  Watching counts towards the daily screen time like any child screen.
- **Free** opens two different cartoons (and may rewatch those); the rest show a
  calm PRO note for a grown-up with a link to the parents' area, never a purchase
  pop-up. Entitlement `shorts`; per child in `store/shortsStore.ts`.
- **Made in Remotion** (`marketing/shorts`): `script.json` holds every line in
  three languages, `synth.py` records them (now the app's Piper voices) and writes
  the timings, `render.sh` renders 720 × 1280 cartoons, the web copies
  (`public/video/shorts/<lang>/<id>.mp4`, H.264 CRF 27, faststart) and posters.
- **Premium voice.** Save a premium recording of a line as
  `marketing/shorts/public/vo/<id>/<lang>-<n>.wav`, run `synth.py --timings-only`
  and `render.sh` again: every scene stretches to its line. The app's own new
  sentences (attention, games, cartoons page) are recorded the same way as the
  rest (`scripts/voices`), and can be re-recorded with a premium engine.

## Games page, rules first, top five (Phases 62–65)

- **`/games`** (`features/games`): every game and practice by subject (maths,
  letters and words, nature and science, space, logic, health and friends). A
  catalog, not a copy: buildings come from the world (name, picture, lock), the
  task games from their meta, other pages from their own words. Reached from a
  big yellow button on Home and at the top of O‘rgan and Kashf et (a fifth tab did
  not fit a 320 px phone's labels). A new game is added to `GAMES` once.
- **Rules, then a try** (Phase 63): every mini-game opens with its rules on the
  Learn Before Play deck (two or three cards, read aloud) and a try (find the
  first card again); only then the game starts. "Rules" and the "?" in the top
  bar show them again (`sciGames/lessons.tsx`, lesson ids `sci.*`).
- **When a child keeps drifting** (Phase 64) the robot offers the five most
  unusual games (`TOP_GAMES`) and "All games".
- **New games** (Phase 65), in `sciGames/play/`: the magic scale (number blocks
  even out apples: adding, `scaleRules.ts`) and the robot programmer (arrows
  lead a robot to its battery on a 4 × 4 board: sequences, `robotRules.ts`,
  every level checked solvable). Each mini-game is one file; the shared shell
  (`SciGamePage`) gives rules, play, reward (strand per game, once a day).
- **More games** (Phase 66): the word train (letters into a word's wagons, in
  order; three languages, Uzbek words without two-letter sounds, `trainRules.ts`)
  and the little shop (pay exactly with coins of 1, 2 and 5, then count the
  change, `shopRules.ts`). The "?" for the rules sits above the game, not in the
  top bar (a phone's bar has no room).
- **The last three** (Phase 67): the shape builder (fill a picture's dashed
  outlines with circles, squares, triangles and rectangles, `shapeRules.ts`), and
  two sorting games on one screen (`Sort.tsx`, `sortRules.ts`): who lives where
  (forest, sea, desert, ice) and the healthy plate (food for every day, and treats
  for sometimes; never "bad" food). Ten mini-games in all.

## Cartoons as a feed, seven more cartoons (Phases 68–69)

- Thirteen cartoons now, one about each new game too (`marketing/shorts/src/scenes2.tsx`).
- `/shorts` is a full-screen vertical feed: the cartoon in view plays (with sound
  when the browser allows, else muted with a sound button), the others pause.
  Swiping up brings the next; until a child has swiped once on this device a hand
  shows how (and moving on by tapping it also works, `swipe.ts`). Free's two and
  the four-per-sitting cap stay; a locked card shows the calm note for a grown-up.
- Posters are the opening scene with the robot and no words (`poster-<id>`
  compositions), so one picture serves every language; the app writes the title.
- Robot programmer: rows and columns of the board are equal whatever a cell holds,
  so the robot and the battery sit exactly on their cells (checked on every level).

## The finish of the shape builder, clearer rule cards (Phase 70)

- When every shape is in, the plan grows into the real thing (`ShapeScene.tsx`): the
  picture's world (sky, ground, a companion) with the 3D house, tree, car or rocket
  alive in it; the child's own shapes stay small in the corner. Reduced motion: no
  movement, just the picture.
- Rule cards show what the child will really see (`RulePictures.tsx`): numbered
  blocks, the arrow chips, the green ▶ button, letter tiles, the price tag, coins.

## Faster, by name, with a sound; the reports (Phase 71)

- Looking away counts after 1.5 s (was 4 s; `LOOK_AWAY_MS`), so the robot notices
  at once, but a blink or a glance at a parent does not.
- Every reminder starts with a short call sound (`alert` cue, in every tier: it is
  not speech), then the robot's words; Free sees the words, PRO hears them.
- The robot calls the child by name: "Bek! Hoy, men shu yerdaman!". The name is never
  recorded; the device voice says it, the rest is the recorded line (`planSpeech`).
- **The admin never sees a camera.** The picture never leaves the child's device,
  which is the promise made to parents in the consent and the law's expectation for
  children's images. The admin's Analitika has a "Diqqat yordamchisi" panel with
  counts only: devices that allowed or declined it, used the camera, were called back,
  were offered games and took one (anonymous analytics events `attention_*`, at most
  once a day per device; `admin_attention_stats`, migration `0023_attention.sql`).
- **The parent's report** (Settings → Diqqat yordamchisi): for the active child, the
  last seven days: call-backs, leaving and coming back, games offered and taken, with
  a bar per day. Counts are kept on this device per child (`attentionStore.log`,
  14 days) and forgotten with the child.

## More natural cartoons and voices (Phase 72)

- **The camera films** every scene: a slow push-in drifting to one side, soft dark
  corners and a warm light from above (`Camera`, `Lens` in `Cartoon.tsx`). Captions
  and the robot stay still, outside the camera, so they are always easy to read.
- **Scenes breathe in** from a soft light, carried by a quiet whoosh; the end card
  rings with a few bell notes. The sounds are made here (`sfx.py`), ours to use.
- **The shape cartoon** grows each flat plan into the real 3D picture (a house with
  smoke and a tree, a car driving off on a road, an upright rocket lifting off among
  the stars), as the app's shape builder does.
- Rule cards keep their words inside the card (they wrapped out of it before).
- **The storyteller voice:** more life in melody and rhythm than the app's careful
  words, and a warm close-up sound (EQ, gentle de-essing, a small room); checked
  with a speech recogniser that it stays as clear as before (`synth.py`).
- **The app's own clips** get the same warm, clear sound at a higher quality
  (24 kHz, 48 kbps; `generate.py`): every new clip has it; re-recording all ~11 800
  clips (`generate.py --force`) takes about eight hours on this machine, so it is a
  separate run, best done together with the premium voices.
- **Premium voices, when credits are added:** record each line with MiniMax or
  ElevenLabs (Higgsfield / Flashloop), save it as `public/vo/<short>/<lang>-<n>.wav`,
  then `python3 marketing/shorts/synth.py --timings-only` and `render.sh`: every scene
  stretches to its new line. App clips: `generate.py --engine elevenlabs --force`.

## My Story: twelve of everything (Phase 73)

- Twelve heroes, places, helpers and endings (`myStory/content.ts`), each with its own
  fixed, recorded sentences in uz/ru/en (≤ 8 words; Russian heroes all masculine so
  the shared lines fit). Every place has its own look and things standing in it.
- Two columns of cards on a 320–419 px phone (long names never break), three from
  420 px, four on a tablet.

## My Story on a living 3D stage (Phase 74)

- The story pages play on the tales' 3D stage (`Stage3D` in `TaleScene3D.tsx`, loaded
  only when a story plays); the flat picture stands in while it loads, without WebGL
  or if 3D fails.
- The hero has feelings that follow the story: happy at the start, curious in a new
  place, surprised when trouble comes, joyful at the end (sleepy for "sweet dreams").
  It breathes, squashes when it lands and stretches in the air, leans to look round,
  trembles after a fright; a small face above its head shows the feeling.
- Each place has its weather (falling leaves and petals, snow, bubbles, fireflies,
  stars, desert dust); celebrations end in confetti. Mountains get snowy peaks, the
  bazaar its striped stalls. The motion is pure and tested (`life.ts`).
- Reduced motion: everything stands still, the feeling shows at once.
- Fully rigged 3D animals (real walking and faces) need 3D models: Higgsfield
  `generate_3d` (credits) or bought rigged models can replace the picture cards later.

## Gathered sections, no daily limit (Phase 75)

- **No daily time limit.** The parents decided Kiddo never stops a child with a rest
  screen: the limit setting is gone from the child form, the profile line and the
  report; the time a child spends is still counted for the parents' report. An old
  link to `/rest` goes home. The stored `dailyLimitMinutes` is kept as it was (older
  app versions and the cloud row still read it).
- **Big buttons first.** Every section page starts with its most used places as big
  picture buttons (`QuickTiles`): Home has Games, Cartoons, Stories and My Story right
  under "Davom etish"; O‘rgan has six (Alphabet, Numbers, Words, Writing, Stories,
  Games); Kashf et has the Adventure Map, Cartoons, Dinosaurs and Uzbekistan; My world
  has the Shop, Museum and Art studio before the city.
- The rest of a section waits in short rows by subject that slide sideways
  (`PlaceGroup row`), so no section is five screens long any more. The science games
  are only on the Games page (they were on Kashf et as well).
- The parents' area is a lock at the top of every section page (`ParentLockLink`),
  not a card at the bottom of Home.
- A test checks that O‘rgan and Kashf et still lead to every learning building.
- Reference pictures for the coming 3D work are kept in `docs/reference/`.

## Cartoons, filmed again (Phase 75)

- **No words in the picture.** The app writes the title (first 2.5 s) and the subtitles (`features/shorts/captions.ts`: karaoke,
  word by word from `marketing/shorts/src/timings.json`, at the bottom, at most 20 % of the screen, size button "Aa").
  A cartoon with `bare: true` in the catalog is rendered that way; the app adds nothing over a cartoon without it.
- **Virtualization.** Only the cartoon in view and the next one are `<video>` (`isLive`); the others are posters. Progress and subtitles
  follow the picture with `requestAnimationFrame` and refs, not `timeupdate` state. `prefers-reduced-motion`: nothing starts by itself.
- **The film engine** (`marketing/shorts/src`): `rig.tsx` (Mini = Lumi, Piku = KidoBot cut into head, body, ears, antenna: breathing,
  squash and stretch, nods, follow-through, blinks, mouth by the loudness of the voice), `camera.tsx` (eased push/pull/pan, the sky
  lags behind it), `story.tsx` (dialogue stories from plain scene data, soft dissolves, no flashes), `Cartoon.tsx` (the first twelve,
  same engine, Piku narrates their old recordings, mixed back in by `render-one.sh`).
- **Dialogue lessons.** `water` (16 lines, voiced) and seven new lessons (`crossing bread tree rainbow dayCycle calm teeth`) live in
  `marketing/shorts/dialogue.json` (uz/ru/en per line, who speaks); `docs/shorts/scripts.md` is generated from it. One video serves every
  language (`single`): the voice is Uzbek, the words are the app's. Each lesson ends with a question of two or three pictures
  (`ShortQuiz`, a wrong picture only shakes, the right one counts as activity `short:<id>` once a day).
- **Voices.** `voice_sts.py` (edge-tts + ElevenLabs STS, capped by budget and reserve); the rest and the numbers are in
  `docs/shorts/VOICE-NEXT.md`. Sources and licences of every sound and picture: `docs/shorts/LICENSES.md`.
