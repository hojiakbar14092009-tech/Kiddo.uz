import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { KiddoWordmark } from '@/components/brand/KiddoLogo'
import { KiddoSymbol } from '@/components/brand/KiddoSymbol'
import { OPENING_SECONDS } from '@/components/brand/opening'

/** The opening plus a short moment on the settled symbol (contract: 2.8–4.0 s). */
const SHOW_MS = Math.round(OPENING_SECONDS * 1000) + 300
/** Leaving takes this long (the whole thing stays within 4 s). */
const EXIT_S = 0.35
const REDUCED_MS = 900
// Unit tests start without it, so screens are testable straight away.
let shownThisLaunch = import.meta.env.MODE === 'test'

/**
 * The cinematic opening, once per launch (never on route changes): light
 * appears, the star forms, the blue world enters, the gold orbit joins and
 * interlocks, the centre light activates and the symbol settles, then the
 * name fades in beneath it and Home is there. Vector only: nothing else is
 * loaded for it. A tap skips it; reduced motion gets a short fade.
 */
export function SplashScreen() {
  const reduceMotion = useReducedMotion() ?? false
  const [visible, setVisible] = useState(() => !shownThisLaunch)
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    shownThisLaunch = true
    if (!visible) return undefined
    const timer = setTimeout(() => setVisible(false), reduceMotion ? REDUCED_MS : SHOW_MS)
    // a key skips it too (Escape, Enter, Space), as a tap does
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        // the key only skips the opening (Space must not scroll the page behind)
        event.preventDefault()
        setVisible(false)
      }
    }
    document.addEventListener('keydown', onKey)
    // the screen behind is not reachable (Tab, screen readers) while the opening plays
    const others = [...(layer.current?.parentElement?.children ?? [])].filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== layer.current,
    )
    for (const node of others) node.inert = true
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      for (const node of others) node.inert = false
    }
  }, [visible, reduceMotion])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          ref={layer}
          role="presentation"
          data-splash=""
          onClick={() => setVisible(false)}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: reduceMotion ? 0.2 : EXIT_S }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_50%_44%,#FFFFFF_0%,#F1F5FF_48%,#DCE6FF_100%)]"
        >
          {/* a slow wash of light behind the symbol */}
          <motion.div
            aria-hidden="true"
            className="absolute top-[44%] left-1/2 size-[min(110vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,196,84,0.22),rgba(58,108,244,0.10)_45%,transparent_70%)]"
            initial={reduceMotion ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
          <motion.div
            className="relative w-[min(58vw,300px)]"
            initial={reduceMotion ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            // the symbol settles after the centre light activates
            transition={{ delay: OPENING_SECONDS - 0.4, duration: 0.4, ease: 'easeInOut' }}
          >
            <KiddoSymbol play label="Kiddo" className="h-auto w-full" />
          </motion.div>
          <motion.div
            className="relative w-[min(46vw,240px)]"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : OPENING_SECONDS - 0.5, duration: 0.5 }}
            aria-hidden="true"
          >
            <KiddoWordmark className="h-auto w-full" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
