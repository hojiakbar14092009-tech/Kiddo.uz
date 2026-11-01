# Kiddo roadmap — Phases 37–50 (simplify and grow)

Source of truth for the product decisions: the owner's plan doc "Kiddo: soddalashtirish va o‘sish rejasi"
(https://claude.ai/artifact/3e8H4xhzQ45swnAZ6vQwif, Uzbek). This file is the execution order for Claude Code.
The rules of `.claude/kiddo-contract-phase20-36.md` keep applying (method, gates, i18n, no external LLM,
idempotent rewards via `emitActivity`, child isolation, 320px+, 44px targets, reduced motion, one AudioContext,
migrations written only — the owner applies them, no fake success, commit + push + short Uzbek update per phase).

## Product decisions (owner, 2026-11-01)

1. Core age 4–7; 8+ keeps everything in an "Explorer" mode (no new 8+ content now).
2. Voice first: every child instruction is spoken; text minimal; letter → ~1 s pause → word (picture appears,
   the letter highlighted in the word) → letter again.
3. One daily journey: one big "Davom etish" button, 3 steps, reward, "see you tomorrow".
4. One currency: **yong‘oq** (nut). Coins, crystals, parts, scrolls fold into it; stars stay only as the 1–3 run
   rating; stickers/medals stay as a collection.
5. One main companion: the child's robot; other mascots are guests of their own section.
6. Child navigation: 4 tabs — Bugun, O‘rgan, Kashf et, Mening dunyom; parent area apart behind the gate.
7. Section worlds: each section has its own calm background and colour (system, not per-page randomness).
8. Admin: remove the Navi mascot (→ plain notifications list); clear Uzbek labels; ads only in the parent area.
9. Voices: bright, warm, non-scary youthful voices in uz/ru/en (actor for the mascot + core phrases; AI TTS for
   the rest — Aisha for uz, ElevenLabs for ru/en; native-speaker check). Current uz voice = Kazakh model reading
   transliterated Uzbek (scripts/voices/generate.py) — to be replaced.
10. Tap/reward sounds: playful per-section palettes in one key, short and soft, never a "wrong" buzzer.

## Phases

| Phase | Work                                                                                                                                                                                                                                                                                                                                  | Depends on | Owner input                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| 37    | Anonymous analytics events (onboarding done, first activity start/finish, journey done, day-2/day-7 return, screen at close) → Supabase insert-only table + local queue; admin "Analitika" funnel + "Bildirishnomalar" list; remove AdminMascot                                                                                       | —          | apply migration                                             |
| 38    | Cleanup: merge /learn/math + /math-lab → one "Raqamlar"; /learn/tales + /stories → one library; rename "Bog‘da top"; redirects + progress kept; /dev/mascots dev-only                                                                                                                                                                 | —          | —                                                           |
| 39    | Yong‘oq: one currency, fair one-time conversion (tested), UI words, server migration                                                                                                                                                                                                                                                  | 38         | apply migration                                             |
| 40    | New structure: bottom 4-tab nav, simple Home (Davom etish + 3 steps), section worlds/backgrounds (light SVG/WebP, weak-device + reduced-motion variants)                                                                                                                                                                              | 38, 39     | —                                                           |
| 41    | Voice first: letter→pause→word sequence (pause configurable, longer at 4), auto-spoken instructions, short sentences (≤ 8 words), test fails on unvoiced child phrases                                                                                                                                                                | 40         | —                                                           |
| 42    | Sound palettes: per-section tap sounds (xylophone letters, nut taps for numbers, space blips), nut-earned roll, soft correct tune, no error buzzer, pitch variation, hierarchy kept                                                                                                                                                   | 40         | —                                                           |
| 43    | Mascot: breathing/blink/micro-motion, no back-to-back repeats, look-at taps, anticipation/settle, amplitude lip-sync, emotions mapped to situations, remembers yesterday (local data only), friendship grows with days, reacts to touch, sleepy at rest hours                                                                         | 40         | —                                                           |
| 44    | Backend: guest mode → account (local progress migrates), Google + email magic link (Telegram login via server function later), two-way sync (run ids keep rewards once), private photo bucket + RLS, delete account + data, consent copy                                                                                              | 39         | Google OAuth client, EU Supabase region, migrations, lawyer |
| 45    | Admin: Home KPIs (incl. day-2/day-7), Oilalar, Promokodlar (bulk, usage limit, expiry, used count, disable), Reklama (schedule, on/off, views; parent area only), Ovozlar (status, listen, approve), Kontent & mavsumlar, Telegram status, Sozlamalar (yong‘oq gift, rest hours), admins + audit log; no child photos/answers visible | 37, 44     | —                                                           |
| 46    | Core content: Uzbek Latin alphabet incl. o‘, g‘, sh, ch, ng; syllables → words; numbers 1–20, compare, +/− within 10; 1-min daily review; 8+ Explorer home; parent gate scales with the oldest child (e.g. 23 × 7)                                                                                                                    | 41         | —                                                           |
| 47    | Parent value: no PRO lock shown to children; rest-hours Home state; Telegram weekly report from real data                                                                                                                                                                                                                             | 44         | Telegram bot token                                          |
| 48    | Wire new voices: import actor + TTS clips, manifest, loudness normalisation, native check status in admin                                                                                                                                                                                                                             | 41, 45     | voice files, Aisha/ElevenLabs keys                          |
| 49    | New features: Uyda top missions, printable PDF sheets, seasons (Navro‘z…), own story with recorded voice, trilingual word cards, family mode                                                                                                                                                                                          | 45, 46     | PDF design approval                                         |
| 50    | Final QA + release (contract §36 style gates, release matrix)                                                                                                                                                                                                                                                                         | all        | —                                                           |

Owner can start now in parallel: 5-children test, voice casting + Aisha pricing, ElevenLabs (1 month Pro),
Google OAuth client, Telegram bot, EU Supabase project + apply 0014/0015, lawyer on child data/photos.

## Owner requests 2026-11-02 (doc section "Yangi so‘rovlar") — order after Phase 42

| Phase | What                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| 42b   | Trace bugs: correct letter rejected (desktop R), wrong letter accepted (phone D); help shows finger strokes   |
| 43–50 | As planned above                                                                                              |
| 51    | Admin preview: "Ilovani ochish" from the admin panel, sandbox profile, banner + back                          |
| 52    | Security audit (keys, admin routes, RLS, XSS, rate limits, headers, CORS, deps, leaked secrets) — only needed |
| 53    | Scale: pooler, indexes, cron/edge queue for background jobs, load test (no own LB/servers: Vercel+Supabase)   |
| 54    | Admin V4 glassy animated dashboard + premium icon set (app and admin)                                         |
| 55    | Tools vetting (graphify, ghost-editor, ffmpeg-skill, ECC) + ad clip 9:16 (Reels/Shorts), voices, music        |
