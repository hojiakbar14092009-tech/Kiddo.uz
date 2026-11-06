import { useCallback, useEffect, useRef, useState } from 'react'
import { canUse, useCanUse } from '@/domain/entitlements'
import { speakLines } from '@/features/learn/voice'
import { audioManager, type SpeakOutcome } from '@/services/audio/audioManager'
import { useSettingsStore } from '@/store/settingsStore'
import { afterVoice } from '@/services/audio/afterVoice'

/**
 * Why the last page could not be heard: 'missing' (no recording of this
 * page in this language), 'error', 'muted' or 'locked' (no PRO).
 */
export type NarrationProblem = Exclude<SpeakOutcome, 'done' | 'cancelled'>

export type NarrationState = 'off' | 'reading' | 'done' | 'problem'

/** How long the finished page stays before an automatic page turn (not a time limit). */
export const AUTO_TURN_MS = 1000
/** The quiet before a page is read, so the robot's own line is heard to its end. */
const START_QUIET_MS = 200

/**
 * "Read to me" (PRO): each page is read aloud (the children's voices, the
 * standard recordings, a never recorded line by the device voice), one voice at
 * a time. It starts on by itself and turns the pages by itself – a child of four
 * cannot press a button to hear – unless a parent chose "when the button is
 * tapped" in Settings. Turning the page or leaving stops the voice at once. The
 * page turns only after its narration really played to the end; a page no voice
 * could say stays, quietly, until the child turns it.
 */
export function useNarration({
  lines,
  pageKey,
  canTurn,
  onTurn,
}: {
  lines: readonly string[]
  /** Changes with every page shown (a new page reads again). */
  pageKey: string
  /** The page has a plain "next" (not a choice or the ending). */
  canTurn: boolean
  onTurn: () => void
}) {
  const allowed = useCanUse('audio')
  // read on its own unless a parent asked for "only when tapped" (Settings)
  const [on, setOn] = useState(() => useSettingsStore.getState().autoVoice && canUse('audio'))
  const [autoTurn, setAutoTurn] = useState(() => useSettingsStore.getState().autoVoice)
  const [result, setResult] = useState<{
    key: string
    state: NarrationState
    problem?: NarrationProblem
  }>({ key: '', state: 'off' })
  const run = useRef(0)
  // read at the moment the narration ends, so changing them never restarts the reading
  const later = useRef({ onTurn, canTurn, autoTurn })
  useEffect(() => {
    later.current = { onTurn, canTurn, autoTurn }
  })
  const linesKey = lines.join('\n')

  // read the page while "Read to me" is on; a new page (or leaving) stops the old voice
  useEffect(() => {
    if (!on) return undefined
    const mine = ++run.current
    let timer: ReturnType<typeof setTimeout> | undefined
    // a line the robot is saying (My Story's "ready!") is let finish first: the page
    // is read after it, never cut off by it
    const waiting = new AbortController()
    void afterVoice({ quietMs: START_QUIET_MS }, waiting.signal).then((ok) => {
      if (!ok || mine !== run.current) return
      // speakLines checks canUse('audio') right before any sound (and audioManager once more)
      const language = useSettingsStore.getState().language ?? 'uz'
      return speakLines(linesKey.split('\n'), language).then((outcome) => {
        if (mine !== run.current) return
        if (outcome === 'cancelled') {
          setResult({ key: pageKey, state: 'off' })
          return
        }
        if (outcome === 'missing') {
          // no voice has this page: it stays on screen, without a note and without turning
          setResult({ key: pageKey, state: 'done' })
          return
        }
        if (outcome !== 'done') {
          setResult({ key: pageKey, state: 'problem', problem: outcome })
          return
        }
        setResult({ key: pageKey, state: 'done' })
        if (later.current.autoTurn && later.current.canTurn) {
          timer = setTimeout(() => later.current.onTurn(), AUTO_TURN_MS)
        }
      })
    })
    return () => {
      run.current += 1
      waiting.abort()
      clearTimeout(timer)
      audioManager.stopSpeech()
    }
  }, [linesKey, on, pageKey])

  // the reader goes away: no voice keeps talking
  useEffect(
    () => () => {
      run.current += 1
      audioManager.stopSpeech()
    },
    [],
  )

  const toggle = useCallback(() => {
    if (!canUse('audio')) {
      setOn(false)
      setResult({ key: pageKey, state: 'problem', problem: 'locked' })
      return
    }
    setOn((value) => !value)
  }, [pageKey])

  // this page's outcome; before it arrives the page is being read (or narration is off)
  const current =
    result.key === pageKey
      ? result
      : { key: pageKey, state: on && allowed ? ('reading' as const) : ('off' as const) }
  const state: NarrationState =
    current.state === 'problem' || (on && allowed) ? current.state : 'off'
  return {
    allowed,
    on: on && allowed,
    state,
    problem: current.state === 'problem' ? current.problem : undefined,
    toggle,
    autoTurn,
    setAutoTurn,
  }
}
