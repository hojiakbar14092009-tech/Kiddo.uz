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
  provider has no real voice for that language** (an Uzbek sentence is never read
  by a Russian/Kazakh/Turkish voice)
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
