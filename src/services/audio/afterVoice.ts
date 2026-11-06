import { useCallback, useEffect, useRef } from 'react'
import { audioManager, type SpeechStatus } from './audioManager'

/*
 * Moving on by itself (a child of four cannot read "Next"): after an answer the
 * robot's praise or encouragement is said, and once Kiddo's voice has been quiet
 * for a short moment the game goes on to the next question. Without a voice (Free,
 * muted) it goes on after `minMs`. The "Next" buttons stay for whoever is faster.
 */

/** How long the voice must be quiet before moving on. */
export const QUIET_MS = 800
/**
 * After an answer with a panel of words under it: without a voice they stay this long
 * before the next question comes (with the voice, until it has said them).
 */
export const AUTO_NEXT_MIN_MS = 2_500
/** Never waits longer than this, whatever the voice does. */
const MAX_WAIT_MS = 15_000
/** A clip that has not started after this long (a slow network, no audio): go on without it. */
export const LOADING_MAX_MS = 3_500

/**
 * Resolves once at least `minMs` has passed and the voice has then been quiet for
 * `quietMs` (a sentence that starts meanwhile restarts the quiet wait). `false` when
 * cancelled first.
 */
export function afterVoice(
  { minMs = 0, quietMs = QUIET_MS }: { minMs?: number; quietMs?: number } = {},
  signal?: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false)
    let quietTimer: ReturnType<typeof setTimeout> | undefined
    let loadingTimer: ReturnType<typeof setTimeout> | undefined
    // loading for longer than LOADING_MAX_MS counts as quiet; speaking never does
    let stuck = false
    let ready = minMs <= 0
    const end = (result: boolean) => {
      clearTimeout(quietTimer)
      clearTimeout(loadingTimer)
      clearTimeout(minTimer)
      clearTimeout(maxTimer)
      unsubscribe()
      signal?.removeEventListener('abort', abort)
      resolve(result)
    }
    const abort = () => end(false)
    const check = () => {
      clearTimeout(quietTimer)
      const status: SpeechStatus = audioManager.getStatus()
      if (status !== 'loading') {
        clearTimeout(loadingTimer)
        loadingTimer = undefined
        stuck = false
      } else if (loadingTimer === undefined) {
        loadingTimer = setTimeout(() => {
          stuck = true
          check()
        }, LOADING_MAX_MS)
      }
      const busy = status === 'speaking' || (status === 'loading' && !stuck)
      if (!ready || busy) return
      quietTimer = setTimeout(() => end(true), quietMs)
    }
    const unsubscribe = audioManager.subscribe(check)
    const minTimer = setTimeout(() => {
      ready = true
      check()
    }, minMs)
    const maxTimer = setTimeout(() => end(true), Math.max(minMs, 0) + MAX_WAIT_MS)
    signal?.addEventListener('abort', abort)
    check()
  })
}

/** Like setTimeout, but also waits for the voice to finish (see afterVoice); returns the cancel. */
export function whenVoiceDone(run: () => void, minMs = 0): () => void {
  const controller = new AbortController()
  void afterVoice({ minMs }, controller.signal).then((ok) => {
    // cancelled just as the wait ended: it stays cancelled
    if (ok && !controller.signal.aborted) run()
  })
  return () => controller.abort()
}

/**
 * For a screen: `goOn(run, minMs)` runs `run` once the voice is done (see afterVoice);
 * a newer `goOn`, `cancel()` or leaving the screen drops the waiting one.
 */
export function useAfterVoice() {
  const pending = useRef<(() => void) | null>(null)
  const cancel = useCallback(() => {
    pending.current?.()
    pending.current = null
  }, [])
  useEffect(() => cancel, [cancel])
  const goOn = useCallback(
    (run: () => void, minMs = 0) => {
      cancel()
      pending.current = whenVoiceDone(() => {
        pending.current = null
        run()
      }, minMs)
    },
    [cancel],
  )
  return { goOn, cancel }
}
