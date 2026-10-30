import { useEffect } from 'react'
import { audioManager } from '@/services/audio/audioManager'
import { playBack, playConfirm } from '@/services/audio/soundLanguage'

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"]'
/** Taps closer together than this make one click (a fast child never makes a clatter). */
const TAP_GAP_MS = 70

/**
 * Every tap on something interactive answers with the soft wooden click,
 * in Free and PRO alike (back and confirm buttons, marked `data-sound`, with
 * their own cue). One listener for the whole app keeps it consistent.
 */
export function InterfaceSounds() {
  useEffect(() => {
    let lastTap = -Infinity
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return
      // the sound language: a back step and a confirmation have their own soft sound
      const kind = target.getAttribute('data-sound')
      if (kind === 'back') return playBack()
      if (kind === 'confirm') return playConfirm()
      const now = performance.now()
      if (now - lastTap < TAP_GAP_MS) return
      lastTap = now
      audioManager.play('click')
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [])

  return null
}
