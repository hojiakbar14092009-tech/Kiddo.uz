import { useEffect } from 'react'
import { audioManager } from '@/services/audio/audioManager'

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"]'

/**
 * Every tap on something interactive answers with the soft wooden click,
 * in Free and PRO alike. One listener for the whole app keeps it consistent.
 */
export function InterfaceSounds() {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return
      audioManager.play('click')
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [])

  return null
}
