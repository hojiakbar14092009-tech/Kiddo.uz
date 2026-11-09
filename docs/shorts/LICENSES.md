# Shorts: where every sound, picture and font comes from

| What | Source | Licence / status |
|---|---|---|
| Background music (`marketing/shorts/public/music.wav`, not in git) | Made from numbers by `marketing/shorts/music.py` (no samples) | Our own work; rebuild with `python marketing/shorts/music.py` |
| Sound effects (`marketing/shorts/public/sfx/*.wav`) | Made from numbers by `marketing/shorts/sfx.py` | Our own work |
| Pictures (`marketing/shorts/public/art`, now tracked in git) | Copies of the app's own 3D pictures (`public/3d`) and the mascots' posters (`public/mascots/posters`) | Kiddo's own assets; recreate with `cp -n public/3d/*.webp marketing/shorts/public/art/` and the `kidobot`/`lumi` posters |
| Fonts (`marketing/shorts/public/fonts`) | Nunito and Rubik (Fontsource subsets) | SIL Open Font License 1.1 |
| Narration of the first twelve cartoons | The recordings already in the shipped videos (Piper voices of the app, Phase 61/72) | Kept bit for bit (`out/old-audio`, never re-encoded) |
| Mini and Piku (water cartoon, later the seven lessons) | edge-tts Uzbek neural voice (input only) turned into the child's voice by ElevenLabs Speech-to-Speech (`voice_sts.py`) | ElevenLabs output under the account's plan terms (check the commercial-use terms of the plan before release) |
| Provisional voices while a lesson has no recording | edge-tts (Microsoft neural voices), used only to time the film | Not shipped: replaced by the ElevenLabs recording |

No music or sound effect was downloaded from outside; nothing from Kenney, Freesound or other CC0 sites was needed.
Whenever one is added, put its URL, author and licence in this table.
