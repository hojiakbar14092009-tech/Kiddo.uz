# Kiddo promo clip (30 s)

Seven scenes, two bars each at 109 BPM: logo, letters, ages 4–6, robots cheering,
shop and pets, parents, call to action. Three languages (uz, ru, en), two formats
(16:9 and 9:16).

| File          | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `Promo.tsx`   | Every frame as a function of the time `t`, using the app's own components  |
| `copy.ts`     | On-screen words per language and the scene timing                          |
| `capture.mjs` | Renders frames with Playwright under a fake clock and pipes them to ffmpeg |
| `music.py`    | The music bed and sound effects (numpy, no samples)                        |
| `mix.sh`      | Voice-over + ducked music, loudness to −14 LUFS, muxed onto the video      |

```sh
npx vite --config marketing/promo/vite.config.ts            # http://localhost:5190/?lang=uz&fmt=portrait&t=3
node marketing/promo/capture.mjs --lang uz --fmt landscape --out out
python3 marketing/promo/music.py out/music.wav
bash marketing/promo/mix.sh uz out/uz-landscape.mp4 out/music.wav voices out/kiddo-uz-16x9.mp4
```

Voice-over lines (one per scene) were generated in Higgsfield with the voice
"Chloe": ElevenLabs for English and Russian, MiniMax for Uzbek (it read Uzbek most
clearly). Each line is trimmed of silence and saved as `<lang><scene>.wav`.
