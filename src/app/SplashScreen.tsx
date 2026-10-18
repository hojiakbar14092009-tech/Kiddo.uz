import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { KiddoMark, KiddoWordmark } from '@/components/brand/KiddoLogo'

/** Letters and numbers from all three alphabets that pop up around the logo. */
const ORBIT = [
  { ch: 'A', color: '#13917E' },
  { ch: '1', color: '#FFB020' },
  { ch: 'Б', color: '#F27BA6' },
  { ch: '2', color: '#4FA8E8' },
  { ch: 'Oʻ', color: '#8E6CEF' },
  { ch: '3', color: '#FF8A4C' },
  { ch: 'Ж', color: '#13917E' },
  { ch: '5', color: '#F27BA6' },
  { ch: 'B', color: '#FFB020' },
  { ch: 'Я', color: '#4FA8E8' },
]

const SHOW_MS = 2600
// Unit tests start without it, so screens are testable straight away.
let shownThisLaunch = import.meta.env.MODE === 'test'

/**
 * The opening moment: the robot tile bounces in, the name drops letter by
 * letter, and letters and numbers pop up in a ring around it. Shown once per
 * launch, skipped with a tap, and kept short for children who want to play.
 */
export function SplashScreen() {
  const reduceMotion = useReducedMotion() ?? false
  const [visible, setVisible] = useState(() => !shownThisLaunch)

  useEffect(() => {
    shownThisLaunch = true
    if (!visible) return undefined
    const timer = setTimeout(() => setVisible(false), reduceMotion ? 800 : SHOW_MS)
    return () => clearTimeout(timer)
  }, [visible, reduceMotion])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="presentation"
          onClick={() => setVisible(false)}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#FFFFFF_0%,#FFF8EC_55%,#FFE9C2_100%)]"
        >
          <div className="relative flex size-72 items-center justify-center sm:size-96">
            {ORBIT.map(({ ch, color }, index) => {
              const angle = (index / ORBIT.length) * Math.PI * 2 - Math.PI / 2
              const x = Math.cos(angle) * 46
              const y = Math.sin(angle) * 46
              return (
                <motion.span
                  key={ch}
                  aria-hidden="true"
                  className="absolute font-display text-3xl font-extrabold sm:text-5xl"
                  style={{ color, left: `${50 + x}%`, top: `${50 + y}%`, x: '-50%', y: '-50%' }}
                  initial={reduceMotion ? false : { scale: 0, opacity: 0, rotate: -30 }}
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : {
                          scale: [0, 1.35, 1],
                          opacity: 1,
                          rotate: 0,
                          y: ['-50%', '-50%', '-62%', '-50%'],
                        }
                  }
                  transition={{
                    delay: 0.45 + index * 0.08,
                    duration: 0.9,
                    y: { delay: 1.2 + index * 0.08, duration: 1.2, repeat: Infinity },
                  }}
                >
                  {ch}
                </motion.span>
              )
            })}
            <motion.div
              initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 13 }}
              className="drop-shadow-[0_14px_0_rgba(12,107,93,0.25)]"
            >
              <KiddoMark size={150} className="sm:size-[190px]" />
            </motion.div>
          </div>
          <KiddoWordmark animate={!reduceMotion} delay={0.5} className="text-6xl sm:text-7xl" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
