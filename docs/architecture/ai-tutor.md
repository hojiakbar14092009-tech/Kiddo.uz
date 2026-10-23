# AI tutor and learning memory (Phase 10)

Kiddo's tutor helps the child think after a mistake. It is not a chat window.
Kiddo owns the learning memory, so it stays even if the AI provider changes or
is switched off. The AI only adds wording. Kiddo's own hints always work, with
no internet and no data leaving the device.

## 1. Provider check (2026-10-24)

| Question                          | Finding                                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current free Gemini Flash models  | `gemini-3.8-flash` (stable, newest Flash), `gemini-3.6-flash` (stable), `gemini-3.5-flash-lite` (stable). `gemini-2.0-*` are shut down and `gemini-2.5-*` are limited to recent users ([models](https://ai.google.dev/gemini-api/docs/models)).                                                                           |
| Free tier and rate limits         | Every project has its own limits, shown in AI Studio. Third-party tracking puts 3.x Flash at about 10 requests/min and about 1,500 requests/day; Google does not guarantee these numbers.                                                                                                                                 |
| Automatic billing                 | No. A project with no billing account gets HTTP 429 when the free quota is used up. Linking a billing account moves the project to paid usage, which is why the adapter requires `GEMINI_FREE_TIER_ONLY=true` from the owner (see §2).                                                                                    |
| Use of submitted data (free tier) | "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop" its products. "Human reviewers may read, annotate, and process your API input and output." The terms also say: "Do not submit sensitive, confidential, or personal information to the Unpaid Services." |
| **Age (blocker)**                 | "You must be 18 years of age or older to use the APIs." API clients may not be "directed towards or … likely to be accessed by individuals under the age of 18" ([Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms), effective 2026-03-23).                                                            |
| EEA / Switzerland / UK            | Only paid services may be used for API clients offered to users in these regions.                                                                                                                                                                                                                                         |

**Owner blocker B5 (extended).** Kiddo is for 4–6 year olds. Under Google's
current terms, Gemini cannot be used for Kiddo, and the free tier's data use
conflicts with a children's product. The adapter is built and tested, but **AI
stays off in production**: do not set `AI_PROVIDER` until Google allows this
use in writing or the terms change, or until a free provider that allows
children's apps is chosen. The provider abstraction (§2) means swapping
providers does not touch the learning system. Until then the child gets Kiddo's
own hints, and the parent area says plainly that the AI helper is not
connected.

## 2. Architecture

```
AI provider layer      supabase/functions/_shared/ai/{types,gemini}.ts   (server only)
        ↓
Tutor handler          _shared/ai/{handler,request,policy,reply,safety}.ts  → tutor/index.ts
        ↓
Context builder        src/domain/tutor/context.ts (client: what the tutor may see)
        ↓
Learning memory        src/domain/learningMemory (client) + migration 0008 (server)
        ↓
Mastery / review       memory.ts (pure rules) = record_learning_evidence() (SQL, same rules)
        ↓
UI                     features/tutor (TutorPanel, useTutorReply) inside Math Lab
```

- **AIProvider** (`types.ts`) has `generateTutorResponse`, `generateHint`,
  `explainMistake`, `generatePracticeItem` and `healthCheck`.
  `GeminiFreeProvider` implements it. `selectAiProvider` returns a provider
  only when `AI_PROVIDER=gemini-free`, `GEMINI_API_KEY` is set,
  `GEMINI_FREE_TIER_ONLY=true` is set, and the model is in
  `GEMINI_FREE_MODELS`. There is no paid model, no other provider and no
  fallback. A 429 means the quota is used up: the provider cools down
  (`AI_COOLDOWN_S`, 15 min; also after a settings error such as a bad key) and the client uses Kiddo's hints.
- **The key stays on the server.** Provider settings are Edge Function secrets.
  Nothing is in `VITE_*` or browser code.
- **The game engine is the authority.** `generators.ts` decides what is right.
  The AI gets the answer and only explains it. It never scores and never
  decides correctness. For a worked example, the server picks the numbers and
  computes the answer; the AI only puts it into words.
- **Policy** (`policy.ts`): one versioned system prompt
  (`KIDDO_TUTOR_PROMPT_VERSION = '1'`) covering identity, teaching, tone,
  length per band, language rules for uz/ru/en, safety, no emotional
  dependency, uncertainty, and the output JSON. The mascot (`persona`) changes
  only the tone line; the rules are the same for every mascot (tested).
- **Prompt-injection defence:** the child has no free-text input. Every request
  field must match a strict pattern (numbers and signs) or a closed list of
  what the game engine makes (skill families, tasks, error codes).
  Unknown keys are refused, not cleaned. The data goes in a fenced JSON block
  that the policy calls data, not instructions.

### `POST /functions/v1/tutor`

Checks in order: CORS, method (405), token, body ≤ 4 KB, user (401), `auth`
rate count (429), **PRO** (403 `not_pro`), strict request (400), **parent
consent for this child** (`ai_consent_ok`, 403 `no_consent`), free provider
configured (503), cool-down (503 + `retryAfter`), global daily cap
`AI_DAILY_CAP` (default 1000, below the free tier) (429), per-user
`AI_RATE_LIMIT` per `AI_RATE_WINDOW_S` (20 per 10 min) (429). Then the cache,
then the provider (timeout `AI_TIMEOUT_MS` 8 s, one retry for a transient error
or an unusable reply), then the reply check, then 200 `{ reply, cached }`.

Request (client → server):
`{ v: 1, childId, language, band, persona, intent, hintLevel, item: { skill, task, expression, answer, learnerAnswer?, errorCode? }, memory?: { mastery, misconceptions[≤3]: { code, count, status }, preferredHint? } }`.
`childId` is used only for the consent check and never reaches the provider
(tested).

Reply checks (`reply.ts`):

- JSON shape.
- Length per band: early 150, intermediate 210, advanced 280 characters.
- Language: Cyrillic for ru; Latin with Uzbek or English markers for uz/en.
- Child safety (`safety.ts`): no links, e-mail or phone numbers; no violence,
  sex, drugs or insults; no labels for the child; no dependency phrases; no
  policy leak; at most one emoji.
- No answer before hint step 4: not as digits, not as a number word (0–20 in
  uz/ru/en), and for a sign question not as a stated comparison.

The browser checks the shape and the answer leak again.

### Cost and quota protection

The AI is called only on hint step 2 and above, and only for tasks written in
symbols. Correct answers, praise, stars, scoring and navigation never call it.
Generic replies (requests without memory) are cached for 30 days in `ai_cache`.
Personal ones are never cached. The client rests for `retryAfter`, or for 5 min
after a 503 and 2 min after a 429.

### Telemetry

`ai_usage` stores provider, model, outcome, a latency bucket, token counts,
the policy version and the reply problem code. It stores no user, child,
prompt or reply text.

## 3. Learning memory

- **Layer 1, session:** the current question, its wrong answers and hint steps
  (component state, never stored).
- **Layer 2, learning memory:** per skill, the misconceptions (engine error
  codes), the items they happened on (≤ 5), a status and a review schedule.
- **Layer 3, mastery:** a score from 0 to 1 per skill. It moves 30 % towards
  each finished question's score: 1 if right on the first try alone, 0.6 if
  right after opening help, 0.5 if solved with hint step ≤ 2, otherwise 0.25.

Evidence threshold:

- One mistake is `observed`. It is forgotten after 14 days if it never repeats.
- The same mistake on the same item again is still `observed`.
- The same error code on **two different items in two different sessions**
  becomes `confirmed`, and a review is scheduled for the next day. A few
  hurried taps in one sitting stay `observed`.
- An independent success makes it `improving`.
- Three independent successes in a row, including a **spaced review answered
  alone at least 20 h after the last error**, make it `resolved`.
- A slip after `resolved` starts again as a single observation.
- Reviews follow 1, 3, 7 and 14 days. A failed review goes back to 1 day.
- Positive memory: `masteredAt` (score ≥ 0.85 after ≥ 5 questions),
  `correctedAfterHint`, and `hintTrend` (fewer hints than before).
- Limits: 120 skills per child, 6 codes per skill. No labels such as "weak",
  "lazy" or "slow" are ever stored or shown (tested).

**Spaced revisit** (Math Lab): when a reviewed skill is due and its level is no
higher than today's level, one question of the session becomes a related item
of that skill. The items the child got wrong are avoided. The mascot says
"let's try one like this again". **Mistake Garden** (Phase 16) reads
`gardenStage`: confirmed is a seed, improving is a sprout or a plant, and
resolved is a bloom.

**Hint ladder** (Math Lab):

1. A tiny clue for the error code. If the memory knows this mistake, the clue
   starts with "we practised this before".
2. The picture help.
3. One wrong card is taken away.
4. The worked solution, with the right card glowing.

Each mistake goes up one step from where the ladder is, and "More help" goes
up one step. The answer is
never shown before step 4.

**Server (migration 0008):** `learning_memory`, `learning_misconceptions` and
`learning_evidence` (ids only, for idempotency and a cap of 3,000 per child per
day). RLS lets a family read only its own rows. Clients have **no write
privileges**. The only way in is `record_learning_evidence()`, which runs the
same rules as `memory.ts`. A browser can only send evidence, never a score or
a status. A parent's own client could send made-up evidence, but that only
affects that family's own child. A device clock ahead of the server is clamped
to the server's time, and evidence over the daily cap is ignored, so neither
fills the sync dead-letter list. A parity scenario gives the same status and mastery
(0.88) in Vitest and in the SQL harness. In cloud mode every new evidence goes
through the sync queue (`recordLearningEvidence`). The browser never sends a
score or a status. Consent is stored in `ai_consent` and written through
`set_ai_consent()`. The tutor reads it with `ai_consent_ok(uid, child,
version)` (service role only). Consent counts only for the policy version the
parent agreed to, so a new policy needs consent again. `audio_rate_ok` and `audio_daily_count` now accept the kind `ai`.

## 4. Privacy

- Sent to the AI provider: the exercise in symbols, the right answer, the
  child's last answer, the error code, the band, the mascot, and at most three
  misconception codes with counts and status, plus the mastery and the hint
  style for **this one skill**.
- Never sent: name, age, birth date, child or parent id, school, location,
  voice, photos, conversations or the rest of the memory.
- Raw chat is not kept anywhere: there is no chat. The memory is structured
  evidence.
- Retention: `ai_housekeeping()` deletes cached replies after 30 days,
  telemetry after 90 days and evidence ids after 180 days. Run it daily.

## 5. Owner steps (only after B5 is resolved)

1. Apply migration `0008_learning_memory.sql` (after 0005–0007).
2. `supabase functions deploy tutor`. `verify_jwt = true` is set in
   `config.toml`.
3. Build flag `VITE_AI_TUTOR=true` (Vercel). Without it the app never asks the
   server and the parent area offers no AI switch. Set it only when B5 is
   resolved.
4. Secrets: `ALLOWED_ORIGINS`, and optionally `AI_DAILY_CAP`, `AI_RATE_LIMIT`,
   `AI_RATE_WINDOW_S`, `AI_TIMEOUT_MS` and `AI_COOLDOWN_S`. **Only when B5
   allows it:** `AI_PROVIDER=gemini-free`, `GEMINI_API_KEY` (a project with no
   billing account) and `GEMINI_FREE_TIER_ONLY=true`.
5. Schedule `select public.ai_housekeeping();` daily.
6. Before the first live call: check the request against the current Gemini
   reference. `responseSchema` and `thinkingConfig.thinkingLevel` were taken
   from the docs but could not be called from this environment.

## 6. Known limits

- AI replies are not read aloud: the learning voice plays recorded clips only.
  Kiddo's own hint sentences can be recorded with the Piper pipeline.
- The local hint texts in uz/ru/en need a native-speaker review, like the story
  texts.
- On a new device the server memory is not yet read back. That comes with the
  Phase 14 sync. Evidence from before signing in stays on the device.
- Resetting a child's progress clears the device memory only. The server copy
  stays until the child is deleted; Phase 14 must handle this when it reads
  memory back.
- "Free only" depends on the owner: `GEMINI_FREE_TIER_ONLY=true` cannot be
  checked in code. A key from a project with billing would be charged, capped
  only by `AI_DAILY_CAP`.
- AI and memory are wired into Math Lab. The other activities record
  `mistake.made` only, until they get the tutor.
