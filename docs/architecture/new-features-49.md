# New features (Phase 49): find at home, printable sheets, own story, three-language word

The owner's roadmap line "Uyda top, PDF varaqlar, mavsumlar, o‘z ertagi, uch
tilli so‘z". Seasons were already done in Phase 45 (`src/features/seasons`) and
are not touched here. The other four are below.

| Feature                         | Route                  | Entry                                     | Code                      |
| ------------------------------- | ---------------------- | ----------------------------------------- | ------------------------- |
| Uyda top (Find at home)         | `/explore/find-home`   | tile in Kashf et (`ExploreHub`)           | `src/features/findHome`   |
| O‘z ertagim (My own story)      | `/learn/my-story`      | tile in O‘rgan, "Yana nima qilamiz?"      | `src/features/myStory`    |
| Uch tilli so‘z (3-language)     | `/learn/three-words`   | tile in O‘rgan, "Yana nima qilamiz?"      | `src/features/threeWords` |
| PDF varaqlar (printable sheets) | `/parent/print/:sheet` | "Uy vazifasi" tab of the parent dashboard | `src/features/worksheets` |

All four routes are lazy, so the child's first screen only gains the tiles and
the Uzbek strings (the performance budget in `e2e/performance.spec.ts` is
unchanged). The print route sits behind the parent gate and the parent session
(`RequireParentGate` → `RequireParentSession`).

## Uyda top (Find at home)

- The robot asks the child to **show** one real thing at home (point to it,
  not fetch it); the child presses the big "Topdim!" / "Нашёл!" (a girl:
  "Нашла!") / "Found it!" and is praised. No camera, no photos, no uploads:
  the child's word is enough.
- Safety: every prompt is "show me …" / "point to …", and the robot says
  `findHome.say.safe` with each one («Ko‘rsatib ber, ko‘tarma!» / «Просто
  покажи пальчиком!» / "Just point to it!"); the first prompt is introduced
  with `findHome.say.intro`. The screen also says "we only point at things,
  no picking up, no going outside", plus a short line for grown-ups.
- 20 prompts (`prompts.ts`): four colours, something square, something soft
  and fourteen soft or small everyday things (spoon, book, socks, ball,
  favourite toy, a fruit, a hat, a crayon, a chair – "point to a chair" –, a
  box, a notebook, a pillow, slippers, a blanket; the last three drawn as
  SVG). Nothing sharp, hot, breakable, ticking, electric, medicinal or outside
  the home (cups, clocks and "something round" were taken out); a test checks
  every prompt's id, picture and sentence (in all three languages) against
  `BANNED_WORDS`.
- Today's order starts at a place that changes from day to day
  (`promptsForDay`, a stable hash of the day; no randomness).
- **Nuts, idempotently and capped**: `reward.ts` pays `FIND_HOME_NUTS` (2)
  through the existing ledger, `grantReward({ reason: 'learn', refId:
'find-home|<promptId>|<YYYY-MM-DD>' })`. The ledger pays a (reason, ref) only
  once per child, so each prompt pays at most once a day per child; a second
  press shows "you found this one today". Only the first
  `FIND_HOME_PAID_PER_DAY` (3) finds of a day pay (counted from today's
  `find-home|…|<day>` entries in the child's ledger), so at most 6 nuts a day;
  after that the robot only praises and a calm note says today's nuts are
  collected. The day is the device's local day (`dayKey`, as daily plans),
  fixed when the page opens. The server accepts reason `learn` with any ref
  and its daily cap (500) still applies, so no migration is needed. The coin
  sound comes from `SoundBridge` as for every reward.
- The result is shown in an always-present `role="status"` region, and only
  for the child it was given to.

## O‘z ertagim (My own story)

- Four picture steps: hero (bunny, kitten, puppy, penguin), place (forest,
  space, sea, city), helper (umbrella, lantern, little key, balloon) and ending
  (party, home, a new friend). Then the story plays as four picture cards
  (`StoryPicture` and the stories' backdrops) with back / next.
- **Voice rule**: every spoken sentence is a fixed, complete sentence that can
  be recorded once: no template is filled in at run time. Each choice has its
  own sentences in the locales (`myStory.say.<step>.<id>[.a|.b]`); the shared
  sentences speak of "our friend" / "Do‘stimiz" / "Наш друг", so they fit every
  hero, and all Russian heroes are masculine nouns. Every line is at most 8
  words (tested).
- "Read to me" reuses the stories' `useNarration` (PRO, recordings only,
  `clipsOnly`; Free shows the calm PRO note).
- The last three stories of each child are kept in their own store
  (`kiddo.myStories`, keyed by child id, guests not kept) and can be replayed
  from the first step. `familyStore.removeChild` forgets them, and a new
  guest (`progressStore.startGuest`) never sees the last guest's (both load
  the store on demand, like the studio gallery).

## Uch tilli so‘z (Three-language word)

- A picture and its word in Uzbek, Russian and English side by side; pressing
  a word says it in that word's own language (`speakLines([word], language)`:
  the one audio manager, recordings only, PRO). The interface stays in the
  child's language; only the three word labels are in their own languages,
  each with its `lang` attribute.
- 30 words (`content.ts`), written exactly as Kiddo's alphabets and «Birinchi
  so‘zim» already write them (Uzbek with the alphabet's ʻ), so most are
  recorded already; a test requires at least 20 per language to come from that
  existing content. The rest (e.g. soyabon, maymun, yoʻlbars, молоко, зебра)
  are everyday words added to reach 30.

## PDF varaqlar (printable sheets)

- In the parent dashboard's "Uy vazifasi" tab: "Printable sheets". The parent
  picks letter tracing (the alphabet of a chosen language; the Uzbek tutuq
  belgisi is a mark, not a letter, so it is left out), numbers 1–20 or count
  and circle, optionally with the child's first name at the top.
- **Decision: the browser's print dialog, no PDF library.** The sheet is one
  SVG drawn in millimetres (`viewBox="0 0 210 297"`): vector only, dashed
  letter outlines, writing guide lines, outline pictures to colour. The print
  page renders its own `<style>` (only while it is open): `@page { size: A4
portrait; margin: 0 }`, and in print only the sheet is visible, at exactly
  210 × 297 mm; html and body are one A4 high with nothing overflowing, so it
  prints as exactly one page (the e2e test checks this with `page.pdf`).
  `window.print()` opens the dialog, where "Save as PDF" makes the
  PDF. No heavy dependency, nothing added to the first screen.
- On screen the sheet scales to the page width (from 320px, no sideways
  scrolling). The child's first name travels in the router's navigation state,
  never in the address. The sheet's own words are in the parent's interface
  language.
- **Open**: the owner still needs to approve the sheets' design (layout,
  sizes, fonts) before it is announced; until then it is a working first
  version.

## Rules followed

- Every new interface string is in `src/i18n/locales/{uz,ru,en}.ts` (no plural
  keys; Uzbek uses ‘ in o‘ / g‘). New top-level groups: `findHome`, `myStory`,
  `threeWords`, `worksheets`.
- Child-spoken lines: `findHome.say`, `myStory.say` and `threeWords.say` are
  listed in `SPOKEN_PARTS` (`src/services/audio/childPhrases.ts`) and the 30
  words in `src/features/threeWords/spoken.ts` (added in `childPhrases`, not in
  `LEARN_SPOKEN`, whose lines must already be recorded), so
  `scripts/voices/collect.ts` lists them for the recorder. All of them were
  recorded in Phase 49 with the Piper voices of `scripts/voices/generate.py`
  (Uzbek: the temporary Kazakh-model voice, see audio-security.md), so
  `pendingRecordings.json` is back to its earlier state. A changed line waits
  there until it is recorded again (`UPDATE_PENDING=1 npx vitest run
src/services/audio` rewrites the list).
- Touch targets ≥ 44px, works from 320px, animations only with
  `motion-safe:` (reduced motion honoured), the one audio manager, no AI
  calls, rewards idempotent, child data kept per child id.
