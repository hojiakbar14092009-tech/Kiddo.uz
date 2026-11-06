import { useEffect, useRef } from 'react'
import { canUse } from '@/domain/entitlements'
import { audioManager } from '@/services/audio/audioManager'
import { useSettingsStore } from '@/store/settingsStore'
import { setLearnVoiceOn, speakLines } from './voice'

/*
 * What the speaker button reads: the text that is on screen right now (the
 * current question, or the instruction of a menu). Screens register it with
 * `useSpeakable`; the button reads it at the moment it is pressed, so it can
 * never read an earlier question, a cached one or text in another language.
 *
 * Several parts of a screen may register at once: the one with the higher
 * priority wins (a question board, 1, over the page frame's own text, 0), and
 * among equals the one that appeared last. Each part keeps one entry for as
 * long as it is on screen; its text is updated in place.
 */

export const SPEAK_PRIORITY = { page: 0, content: 1 } as const

interface Entry {
  lines: readonly string[]
  priority: number
  order: number
}

const entries = new Set<Entry>()
let mounted = 0
/** Whose text the speaker button read last, and which speech request that was. */
let reading: { entry: Entry; speech: number } | null = null

function top(): Entry | null {
  let best: Entry | null = null
  for (const entry of entries) {
    if (entry.lines.length === 0) continue
    if (
      !best ||
      entry.priority > best.priority ||
      (entry.priority === best.priority && entry.order > best.order)
    ) {
      best = entry
    }
  }
  return best
}

/** The lines the speaker button would read now (empty if the screen has nothing to read). */
export function currentSpeakable(): readonly string[] {
  return top()?.lines ?? []
}

/**
 * For the speaker button: the current text, and `started` to call right
 * after the reading began, so that this text changing (the next question)
 * or leaving the screen stops exactly that reading – and not a reaction of
 * the mascot that came after it.
 */
export function takeCurrentSpeakable(): {
  lines: readonly string[]
  started: () => void
} {
  const entry = top()
  return {
    lines: entry?.lines ?? [],
    started: () => {
      reading = entry ? { entry, speech: audioManager.currentSpeech() } : null
    },
  }
}

/** The text being read changed or went away: that reading (if still playing) stops at once. */
function stopIfReading(entry: Entry) {
  if (reading?.entry !== entry) return
  const still = reading.speech === audioManager.currentSpeech()
  reading = null
  if (still) audioManager.stopSpeech()
}

/*
 * Voice first (Phase 41): a new question or a new screen's instruction is
 * read out on its own, a moment after it appears (the speaker button still
 * reads it again). Only with the voice (PRO or the demo), not muted, and
 * not when a parent turned it off (Settings: "the instructions are read").
 */
const AUTO_DELAY_MS = 450
let autoTimer: ReturnType<typeof setTimeout> | undefined
/** The last text read on its own: the same screen part with the same text is not read twice. */
let lastAuto: { order: number; key: string } | null = null
/** What is waiting to be read: a part's new lines (only those added under its question). */
let scheduled: { entry: Entry; lines: readonly string[] } | null = null

function scheduleAutoRead(entry: Entry, lines: readonly string[]) {
  clearTimeout(autoTimer)
  scheduled = { entry, lines }
  autoTimer = setTimeout(autoRead, AUTO_DELAY_MS)
}

/** For tests: forget what was read on its own and any reading still waiting. */
export function resetAutoRead() {
  clearTimeout(autoTimer)
  lastAuto = null
  scheduled = null
}

function autoRead() {
  const settings = useSettingsStore.getState()
  if (!settings.autoVoice || settings.volume <= 0 || !canUse('audio')) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  const entry = top()
  if (!entry) return
  // only the new lines of the part that changed; any other part is read whole
  const lines = scheduled?.entry === entry ? scheduled.lines : entry.lines
  scheduled = null
  // the same part with the same text again (a screen drawn twice) is not read twice
  const key = JSON.stringify(lines)
  if (lastAuto && lastAuto.order === entry.order && lastAuto.key === key) return
  lastAuto = { order: entry.order, key }
  setLearnVoiceOn(true)
  const before = audioManager.currentSpeech()
  // a reading nobody asked for never flashes an error (an unrecorded line stays quiet)
  void speakLines(lines, settings.language ?? 'uz', { quiet: true })
  const now = audioManager.currentSpeech()
  // only a speech that really started is this text's reading
  reading = now !== before ? { entry, speech: now } : reading
}

function clean(lines: readonly (string | null | undefined | false)[]): string[] {
  return lines.filter((line): line is string => typeof line === 'string' && line.trim() !== '')
}

/**
 * Registers what the speaker button reads on this screen. If the button is
 * reading this text when it changes (the next question, another language) or
 * when it leaves the screen, the reading stops, so an old question is never
 * heard over a new one. The mascot's own short reactions are not cut off.
 */
export function useSpeakable(
  lines: readonly (string | null | undefined | false)[] | null,
  priority: number = SPEAK_PRIORITY.content,
) {
  const list = clean(lines ?? [])
  const key = JSON.stringify(list)
  const entry = useRef<Entry | null>(null)

  useEffect(() => {
    const mine: Entry = { lines: [], priority, order: ++mounted }
    entry.current = mine
    entries.add(mine)
    return () => {
      entries.delete(mine)
      stopIfReading(mine)
      if (entry.current === mine) entry.current = null
    }
  }, [priority])

  useEffect(() => {
    const mine = entry.current
    if (!mine) return
    const next = JSON.parse(key) as string[]
    if (JSON.stringify(mine.lines) === key) return
    stopIfReading(mine)
    // a new question (or a new screen's instruction) is read on its own, whole; words
    // added under the same question (the answer's praise or a kind hint) are read on
    // their own too, without the question again – a child of four cannot read them
    const fresh = next.length > 0 && next[0] !== mine.lines[0]
    let same = 0
    while (!fresh && same < next.length && next[same] === mine.lines[same]) same += 1
    const added = fresh ? next : next.slice(same)
    mine.lines = next
    if (added.length > 0) scheduleAutoRead(mine, added)
  }, [key, priority])
}
