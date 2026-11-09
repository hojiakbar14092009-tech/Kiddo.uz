# Shorts progress (resume file)

STATUS 2026-11-08: stages 1-4 done (4 only for water). Nothing committed or pushed.

## Done
- Stage 1 (app): subtitles, size button, virtualization, rAF, reduced motion, docs. Prod build, 4x CPU, 10 s:
  before 13 videos / 13 mp4 requests / 22.9 FPS (page) / 5 long tasks 568 ms (max 173) / 52 MB heap;
  after 2 / 2 / 30.3 FPS / 3 long tasks 196 ms (max 94) / 57 MB; the video itself 30 fps, 0 dropped frames.
- Stage 2: engine + water sample (`~\shorts-check\1-namuna\`), 12 re-filmed (`~\shorts-check\2-<id>\` before/after + new mp4).
- Stage 3: scripts (`docs/shorts/scripts.md`), 7 lessons filmed (music + subtitles), quiz + rewards, catalog, i18n.
- Stage 4: water voiced (367 credits; 1 119 left of 40 000, reserve kept).
- Checks: tsc app + Remotion, oxlint, eslint (Remotion) clean; shorts vitest 7/7; shorts e2e 3 tests x phone+tablet pass (1 worker);
  full vitest: failures also on clean HEAD (admin x3, MathPage) + load-dependent timeouts.

## Resume / next
- Voices for the 7 lessons: see `docs/shorts/VOICE-NEXT.md` (~2 260 credits).
- 12 older cartoons as Mini/Piku dialogues: needs scripts in `dialogue.json` + scene lists; ~4 000 credits.
- Re-render one cartoon: `sh marketing/shorts/render-one.sh <id>` (old twelve; needs `python lipsync.py` once) or
  `sh marketing/shorts/render-story.sh <id>` (stories; needs `npx remotion bundle --out-dir=out/bundle`).

## Script fixes (rainbow, dayCycle, bread, calm, tree, crossing)
Words fixed in `marketing/shorts/gen_dialogue.py` (scripts.md regenerated); calm has four 3.5 s silent pauses (`pauses` in timings, balloon breathes in them); bread has a round tandoor-bread picture and a combine harvester. The six films are re-rendered and installed. `public/art` and `public/vo` are no longer gitignored (the water voice cost credits); `public/music.wav` stays ignored (`music.py` makes it). Nothing committed or pushed.
