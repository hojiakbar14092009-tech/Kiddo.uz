# Sound language (Phase 29)

Every moment of progress has its own short sound, and all of them sound like one instrument.

- **Cues** (`src/services/audio/soundLanguage.ts`): coin (two bright notes up), star (a quick sparkle), grow (three
  warm notes), heart (a soft low-high pair), unlock (a four-note fanfare) and spend (two quiet notes down). All are in
  C major pentatonic with one wooden, marimba-like timbre, shorter than a second, made in the browser with Web Audio
  (`synth.ts`, shared with the pets' voices): no sound files, at the app's volume, in Free and PRO alike.
- **When** (`src/app/SoundBridge.tsx`): coins earned (not a parent's fine or gift), stars, crystals, growth, an
  unlock, a world, an achievement, a building — only for the child at the screen. Cues arriving together are one
  sound (the strongest). Right after the "well done" chime, small cues stay quiet and an unlock or a heart follows
  the chime. Nothing plays before the child has touched the page.
- **Parents** can listen to every cue in the settings (Sound).
