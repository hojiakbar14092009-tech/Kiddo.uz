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

## Science games (Phase 59)

`/sci/water` (a droplet's trip: the water cycle in taps), `/sci/magnet` (only iron
sticks: 4 of 8 things), `/sci/float` (guess, then watch: 3 float, 3 sink). Content
and scoring in `sciGames/rules.ts`; a finished game is one universe run (strand
science, `sci:<id>`, once a day), so rewards stay idempotent. In the Explore hub
and in the attention helper's offer.

## Cartoons (Phases 60–61)

- `/shorts`: six vertical cartoons (`shorts/catalog.ts`), one opened at a time,
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
