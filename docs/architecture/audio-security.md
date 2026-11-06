# Audio security (Phase 7)

Goal: voice is a PRO feature that the server enforces, not only the button.
The working voice system (recorded clips by phrase hash, one voice at a time,
`audioManager.say` outcomes, `canUse('audio')` right before playback) stays.

## Modes

| Mode      | When                                                       | Where clips come from                                                                                                                  |
| --------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `public`  | default; device mode; until the owner finishes the rollout | `/audio/voice/<lang>/<key>.mp3` in the build (as today)                                                                                |
| `private` | cloud mode **and** build flag `VITE_VOICE_PRIVATE=true`    | short-lived signed URLs from the private Storage bucket `voice`, issued by the `voice-url` Edge Function after a server-side PRO check |

With `VITE_VOICE_PRIVATE=true` the build leaves `public/audio/voice` out of
`dist`, so the clips are no longer downloadable from the site.

Children's voices (ElevenLabs, a girl's and a boy's: `scripts/voices/kid_voices.py`,
`src/services/audio/kidVoices.ts`) live in the same folder, at
`/audio/voice/kid/<girl|boy>/<lang>/<key>.mp3`, so the private build drops them too
and the service worker caches them like any clip. A girl hears the girl's recording
and a boy the boy's where one exists; a guest, or a profile without a gender, hears
the voice of the robot on screen (`kidVoiceOf`). Any other sentence, and private mode,
use the standard clips, and a sentence recorded nowhere goes to the device voice (only
in its own language); the app never shows "the voice could not be played" for it.

Sentences with numbers, maths signs or lists ("Savatda 3 ta olma bor edi.", "3 − 1 = 2",
"Dasturxonga osh, non va choy qo‘y!") are not recorded whole: they are said from recorded
pieces in the child's voice (`pieces.ts`: the fixed words, each number's words, the signs'
words "minus", "teng", each named thing, 100 ms apart). `collect.ts` lists exactly those
pieces. The phrase key keeps the maths operators (U+2200–22FF), so "3 − 1 = 2" is not
"3 1 = 2". The table round names its foods always in the same order.

The child's name in a parent's own voice (attention helper, `features/attention/nameVoice.ts`)
is a recording made in the profile and kept only in this device's IndexedDB: never
uploaded, never synced, deleted with the profile. It is played as it is
(`Utterance.recording`), before the robot's recorded line.

## Server contract (Supabase Edge Functions)

Both functions: `Authorization: Bearer <user access token>` + `apikey: <anon key>`.
`supabase/config.toml` keeps `verify_jwt = true` for both, so the gateway
already refuses a request without a valid Supabase JWT. The function then
verifies the token itself and checks PRO with the service role
(`public.is_pro_active`): **PRO = a `public.subscriptions` row with
`status = 'active'` and `expires_at` null (lifetime) or in the future** – never
trusting the client.

Rate limits (`public.audio_rate_ok`, per user, sliding window; refused calls are
not counted), in this order:

| kind    | counted                                                      | default     | secrets                                   |
| ------- | ------------------------------------------------------------ | ----------- | ----------------------------------------- |
| `auth`  | every signed-in call, **before** the PRO check (Free too)    | 300 / 60 s  | `AUTH_RATE_LIMIT`, `AUTH_RATE_WINDOW_S`   |
| `voice` | `voice-url` calls of a PRO account                           | 120 / 60 s  | `VOICE_RATE_LIMIT`, `VOICE_RATE_WINDOW_S` |
| `tts`   | `tts` calls of a PRO account                                 | 30 / 3600 s | `TTS_RATE_LIMIT`, `TTS_RATE_WINDOW_S`     |
| global  | all users' `tts` calls since 00:00 UTC (`audio_daily_count`) | 2000 / day  | `TTS_DAILY_CAP`                           |

`POST /functions/v1/voice-url` body `{ "keys": ["uz/000cef41", …] }` (1–20 keys,
each `^(uz|ru|en)/[0-9a-f]{8}$`)

- 200 `{ "urls": { "<key>": "<signed url>" }, "expiresIn": 300 }` (keys without a
  stored clip are left out)
- 400 `{ "error": "bad_request" }` (bad body, over 4 KB – counted on the stream,
  with or without `Content-Length` – or not JSON) · 401 `{ "error": "not_signed_in" }` ·
  403 `{ "error": "not_pro" }` · 405 `{ "error": "bad_request" }` with
  `Allow: POST, OPTIONS` for any other method · 429 `{ "error": "rate_limited" }` ·
  500 `{ "error": "server_error" }`

`POST /functions/v1/tts` body `{ "language": "uz" | "ru" | "en", "text": "…" }`
(1–200 characters after normalising)

- 200 `{ "url": "<signed url>", "expiresIn": 300, "cached": true|false }`
- 503 `{ "error": "unavailable" }` when no provider is configured **or the
  provider has no real voice for that language** (this rule is about remote TTS
  only: the `tts` endpoint never reads an Uzbek sentence with a Russian, Kazakh
  or Turkish voice; the recorded clips are a separate matter, see "Recorded
  clips" below)
- 429 `{ "error": "rate_limited" }` also when the global daily cap is reached
- 400 / 401 / 403 / 405 / 429 / 500 as above

Provider settings are Edge Function secrets only (`TTS_PROVIDER`, `TTS_API_KEY`,
`TTS_VOICE_UZ`, `TTS_VOICE_RU`, `TTS_VOICE_EN`); nothing is in browser code.
Generated audio is cached in the private bucket under `tts/<lang>/<sha256>.mp3`
for **30 days** (`public.tts_cache_expired` + `scripts/voices/cleanup-tts.mjs`,
scheduled as in `supabase-verification.md` §7).

### Remote TTS reads generic sentences only

The `tts` text goes to a third-party provider and is stored (audio + hash) in the
cache, so it must never carry personal data – in particular **the child's name**.

- **Client guarantee (the real control).** `planSpeech` gives every unrecorded
  sentence a `remoteText` (`remoteSafeText` in `phrases.ts`): the sentence itself
  if it does not contain the active child's name (matched ignoring case); if it
  does, the `withoutName` variant – only when that is still a natural sentence
  of at least two words; otherwise `null`. `audioManager.say` sends only
  `remoteText` to `requestTts`; a `null` sentence is never sent: the device voice
  reads it if the caller allows the device voice, else it is `missing`. Unit
  tests (`audioManagerPrivate.test.ts`) prove a sentence with the name never
  reaches `requestTts`.
- **Server restriction (defence in depth – the client cannot be fully trusted).**
  `parseTtsRequest` accepts only letters (with combining marks), digits,
  punctuation, single spaces and `+ − = × ÷ %`; no control characters, emoji or
  other symbols, no `@` and no `://` (400 otherwise). The server cannot tell a
  name from any other word, so this narrows what the endpoint reads; it does not
  replace the client guarantee. The per-user and daily limits bound the cost and
  volume of any misuse.
- **Owner blocker B5.** Sending sentences to the provider and keeping their audio
  for 30 days needs the owner's decision on consent text and data location
  (provider region, Supabase region) before `TTS_PROVIDER` is set in production.

### Recorded clips

The recorded clips (`public/audio/voice/<lang>/<key>.mp3`, recorded offline by
`scripts/voices/generate.py`) are a different source from the remote `tts`
endpoint above:

- `ru` and `en` are read by native Piper voices (ru_RU irina, en_GB cori).
- **Uzbek** is read by AI-generated children's voices (ElevenLabs, a girl's and a
  boy's, `kid_voices.py`) wherever a sentence has been recorded in them; the rest
  still uses the older standard clips, synthesised with a Kazakh Piper model via
  transliteration (`scripts/voices/uzbek.py`), until they are recorded month by
  month. The app says so openly – next to "Read to me" in the stories
  (`stories.syntheticVoice`), on the PRO screen (`pro.uzVoiceNote`) and in the
  parent settings (`parent.settings.voiceNote`): AI-generated children's voices,
  and the earlier synthetic voice for lines not recorded yet. It never claims a
  human speaker.

## Client

`src/services/audio/voiceSource.ts` resolves a planned clip to a playable URL:
public path, or a signed URL (memory cache until shortly before expiry, never the
service worker). The PRO check in `audioManager.say` still runs before any sound;
a server `not_pro` turns into the `locked` outcome, a failure into `error` – never
a different-language voice. `speech.say` reports whether the device actually
spoke: a sentence with no device voice for the language counts as `missing`, so
an outcome is never `done` without sound. Failure logs strip the query string,
so signed URLs and their tokens never reach the console.

A private build (`VITE_VOICE_PRIVATE=true`) deletes the `kiddo-voice` Cache
Storage (the service worker's clip cache of an earlier public build) on startup.
Device-mode users of a private build therefore have **no recorded voice** (only
the device voice where allowed) – intended: the clips are not shipped with that
build and must not survive in old caches.
