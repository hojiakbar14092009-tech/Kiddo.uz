# Voice first (Phase 41)

- **Letter, pause, word.** `useSpeaker.sayLetter` says the letter, waits, then
  says its word (`Utterance.pauseAfterMs`, a pause a stop ends at once). The
  pause is set in one place, `services/audio/pace.ts`: 1100 ms at four, 850 at
  five, 650 from six; a parent's "Longer" setting multiplies it by 1.6. The
  task games (find a letter, memory) meet a new letter the same way.
- **Instructions on their own.** In the learning sections a new question or a
  new screen's instruction is read a moment after it appears
  (`features/learn/speakable.ts`); feedback added under the same question does
  not read the question again. Only with the voice (PRO or the demo), never
  muted, never with an error flash (an unrecorded line stays quiet), and a
  parent can leave it to the speaker button (Settings).
- **Short sentences.** A sentence the robot says to a child has at most 8
  words (`childVoice.test.ts`); lines recorded before keep their wording until
  the next recording.
- **No new silent line.** Every child sentence (`services/audio/childPhrases.ts`,
  also used by `scripts/voices/collect.ts`) must have a recording or be listed
  in `services/audio/pendingRecordings.json`, together with the lines filled in
  at run time (`templates`). The list is the recorder's to-do (Phase 48: about
  1300 sentences per language and ~50 templates, mostly the nut texts and the
  newer sections); a recorded line must leave it.
- **Phase 48: all sentences recorded.** `scripts/voices/generate.py` (Piper:
  ru irina, en cori, uz through the Kazakh ISSAI voice) recorded every
  collected sentence: uz 3710, ru 3687, en 3610 clips. Only the run-time
  templates (filled with numbers and names) and the lone uz "?" (nothing to
  say: it gets no clip and is kept out of the manifest) stay on the list.
  A spot check with Whisper reads the new ru/en clips back as written. With an
  ElevenLabs key the same set can be re-recorded in a warmer, more child-like
  voice (`--engine elevenlabs --force`).
