# Release QA (Phase 36)

How the final release was checked, so the next release can repeat it.

## Commands (all part of the repository)

| Check              | Command                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format             | `npx prettier --check .`                                                                                                                                           |
| Lint               | `npm run lint` (oxlint, warnings are errors)                                                                                                                       |
| Typecheck          | `npx tsc -b`                                                                                                                                                       |
| Unit / integration | `npx vitest run`                                                                                                                                                   |
| SQL / RLS          | start the local PostgreSQL (see the project state, Security), then `PGHOST=… PGUSER=postgres sh supabase/tests/run.sh`; every migration runs, the newest two twice |
| Build              | `npm run build`                                                                                                                                                    |
| E2E                | `npx playwright test` (tablet, phone and production-flags projects; builds and serves its own server)                                                              |

## Release matrix (`e2e/release-matrix.spec.ts`, tag `@matrix`, tablet project only)

- 13 child places × the nine contract viewports (320×568 … 1920×1080), Russian (the longest words):
  no sideways scroll, no control off the screen, no raw i18n keys on the page.
- 150 % and 200 % text on a 393×852 phone: no sideways scroll, no control off the screen.
- Uzbek and English at 360×800: no raw keys, no sideways scroll.
- Heavy places (Scale Portal, Shadow Lab, Home, Collection) entered and left ten times: canvases,
  intervals and DOM size do not grow (WebGL contexts, timers, detached DOM).

Large-text fixes found this way: sizes that were fixed in `rem` (the Journey stops, story covers, maths
stage tiles, garden mode icons, the tab touch floor) are capped by the screen width
(`size-[min(6rem,26vw)]`, `min-w-[44px]`), and long single words in narrow cards may break
(`[overflow-wrap:anywhere]`) instead of spilling out. The shared Button is not changed on purpose:
breaking anywhere in every button would let tight rows of buttons break words at normal text size.

## Phase 50: final pass

- The matrix now also walks the hubs and the places added after Phase 36: `/learn`, `/explore`,
  `/my-world`, `/learn/my-story`, `/learn/three-words`, `/explore/find-home`, `/learn/help`,
  `/learn/tales`, `/studio`, `/adventure`, `/spaceport`, `/science-lab` (27 places in all).
- Every place at every viewport, and in Uzbek and English, must log no console error and no uncaught
  exception (`watchErrors` in the spec).
- Found and fixed at 200 % text: the Three-language word arrows, the Help-the-mascot mode buttons and
  the Studio bottom bar pushed a button off a 393 px phone. The rows now wrap (`flex-wrap`), and the
  help cards use a medium button with less side padding.
- The printable sheets are checked as a one-page A4 PDF in `e2e/phase49.spec.ts`.

## Owner actions before a cloud release

- Apply migrations `0014` to `0020` to production, in order: `0014_birthday_no_age_ceiling`,
  `0015_age_wardrobe` (without it the server refuses the 12 new outfits), `0016_analytics`,
  `0017_nuts`, `0018_accounts`, `0019_admin`, `0020_security_audit` (Phase 52).
- Put the server keys in the Supabase function secrets, never in `VITE_*`: the Google sign-in client,
  the ElevenLabs key (`tts`, `voice-url`) and, later, the Telegram bot tokens (Phases 56–57).
- Approve the design of the printable sheets (letters, numbers, counting PDFs).
- Have a lawyer read the privacy text and the parents' consent before a public launch.
- The future PRO price (24,990 so‘m / month, 238,990 so‘m / year) is kept in
  `src/features/pro/futurePrices.ts` and is deliberately not read anywhere; live prices are the admin's.
