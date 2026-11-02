# Kiddo ad clip (9:16, 27–32 s)

A Reels / Shorts ad built in Remotion from real Kiddo screens. The hook comes in the first
2 seconds, then the answer (Kiddo), the letter game, the 3-step daily plan, nuts for right answers,
the parent report and the call to action. The words are spoken and shown as captions in the
version's language.

| Version        | Opening (A/B test)                                                      | Length |
| -------------- | ----------------------------------------------------------------------- | ------ |
| `KiddoAd-uz-a` | "Farzandingiz telefonda nima qilyapti?" over an endless video feed      | 27 s   |
| `KiddoAd-uz-b` | "Bir soat multfilm. Bitta ham yangi harf yo‘q." with a running clock    | 28 s   |
| `KiddoAd-uz-c` | "O‘n daqiqa. Bitta yangi harf. Har kuni." on the letter card (positive) | 28 s   |
| `KiddoAd-ru-a` | Russian, opening A                                                      | 31 s   |
| `KiddoAd-en-a` | English, opening A                                                      | 27 s   |

| File          | What it is                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| `script.json` | Every spoken line, per language (three openings, six scenes)                  |
| `capture.cjs` | Real app screens with Playwright (home, letter card, question, parent report) |
| `synth.py`    | Voice-over with the app's own Piper voices; writes `src/script.json` timings  |
| `music.py`    | The music bed, made from numbers (no samples)                                 |
| `src/`        | The Remotion composition: `scenes.tsx` (one component per scene), `parts.tsx` |

```sh
# from the repo root
npm run build && npx vite preview --port 4180 --strictPort &      # the app, for the screenshots
node marketing/ad-clip/capture.cjs marketing/ad-clip/public/shots
KIDDO_VOICE_MODELS=/tmp/tts python3 marketing/ad-clip/synth.py
python3 marketing/ad-clip/music.py
cp public/audio/ui/ui_{click,success,soft}.mp3 marketing/ad-clip/public/

cd marketing/ad-clip && npm i
npx remotion studio                                              # preview
npx remotion render KiddoAd-uz-a out/kiddo-ad-uz-a.mp4 --crf=18
```

`capture.cjs` also saves the splash screen's `symbol.svg` and `wordmark.svg` into `public/`.
`public/fonts/` needs the Rubik and Nunito 700/800 woff2 files (latin, latin-ext, cyrillic) from
`node_modules/@fontsource`. Where Remotion cannot download its own Chrome, set
`REMOTION_BROWSER` to a local headless shell.

## Voices

The voice-over uses the same open Piper voices as the app (Uzbek is read by a Kazakh voice, so
it has an accent). For a premium voice, record the lines in `script.json` with ElevenLabs or
Higgsfield (MiniMax read Uzbek most clearly in the promo clip), save them as
`public/vo/<lang>-<line>.wav` and run the timing part of `synth.py` again: every scene stretches
to its line.
