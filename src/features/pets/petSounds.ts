import { audio, playTone } from '@/services/audio/synth'
import { useSettingsStore } from '@/store/settingsStore'
import type { PetId } from './pets'

/*
 * Each pet's voice, made on the spot with the Web Audio API (no sound files):
 * a meow for the cat, chirps for the parrot, squeaks for the hamster, the
 * “wheek-wheek” of a guinea pig and the sniff-and-thump of a bunny.
 */

function sniff(ctx: AudioContext, out: AudioNode, at: number) {
  const duration = 0.08
  const length = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3000
  const gain = ctx.createGain()
  gain.gain.value = 0.25
  source.connect(filter).connect(gain).connect(out)
  source.start(ctx.currentTime + at)
}

const VOICES: Record<PetId, (ctx: AudioContext, out: AudioNode) => void> = {
  // “Mi-a-ow”: a buzzy tone through a vowel filter, pitch up then down.
  cat: (ctx, out) =>
    playTone(ctx, out, {
      at: 0,
      duration: 0.75,
      type: 'sawtooth',
      pitch: [
        [0, 520],
        [0.35, 780],
        [1, 430],
      ],
      formant: 1300,
      gain: 0.35,
      vibrato: 12,
    }),
  // Quick bright chirps.
  parrot: (ctx, out) =>
    [0, 0.14, 0.28, 0.5].forEach((at, index) =>
      playTone(ctx, out, {
        at,
        duration: 0.1,
        pitch: [
          [0, 1800 + index * 200],
          [0.5, 3200],
          [1, 2200],
        ],
        gain: 0.18,
      }),
    ),
  // Tiny high squeaks.
  hamster: (ctx, out) =>
    [0, 0.16, 0.3].forEach((at) =>
      playTone(ctx, out, {
        at,
        duration: 0.09,
        pitch: [
          [0, 2600],
          [1, 3400],
        ],
        type: 'triangle',
        gain: 0.16,
      }),
    ),
  // “Wheek-wheek!”: rising whistles.
  'guinea-pig': (ctx, out) =>
    [0, 0.32].forEach((at) =>
      playTone(ctx, out, {
        at,
        duration: 0.26,
        pitch: [
          [0, 900],
          [0.8, 2100],
          [1, 1900],
        ],
        type: 'triangle',
        gain: 0.22,
        vibrato: 30,
      }),
    ),
  // Sniff, sniff, and a soft thump of a back foot.
  bunny: (ctx, out) => {
    sniff(ctx, out, 0)
    sniff(ctx, out, 0.13)
    playTone(ctx, out, {
      at: 0.34,
      duration: 0.18,
      pitch: [
        [0, 140],
        [1, 60],
      ],
      gain: 0.5,
    })
  },
}

/** Plays the pet's own sound at the app's volume (free for everyone: it is not speech). */
export function playPetSound(pet: PetId): void {
  const volume = useSettingsStore.getState().volume
  const ctx = audio()
  if (!ctx || volume <= 0) return
  const out = ctx.createGain()
  out.gain.value = volume
  out.connect(ctx.destination)
  VOICES[pet](ctx, out)
}
