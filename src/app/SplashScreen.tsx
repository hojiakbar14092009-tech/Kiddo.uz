import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { KiddoWordmark } from '@/components/brand/KiddoLogo'
import { Robot } from '@/features/mascot/Robot'
import { PetSprite } from '@/features/pets/PetSprite'
import type { PetId } from '@/features/pets/pets'

/** Letters and numbers from all three alphabets: they fly in from the edges and settle around the logo. */
const GLYPHS = [
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
  { ch: 'Gʻ', color: '#8E6CEF' },
  { ch: '7', color: '#FF8A4C' },
]

/** Pets peek in at the bottom, each from its own side. */
const PETS: { pet: PetId; x: string; delay: number; flip: boolean }[] = [
  { pet: 'cat', x: '6%', delay: 1.5, flip: false },
  { pet: 'bunny', x: '24%', delay: 1.7, flip: false },
  { pet: 'parrot', x: '64%', delay: 1.6, flip: true },
  { pet: 'hamster', x: '82%', delay: 1.8, flip: true },
]

const SHOW_MS = 3600
// Unit tests start without it, so screens are testable straight away.
let shownThisLaunch = import.meta.env.MODE === 'test'

/**
 * The opening every time Kiddo starts: the name draws itself stroke by stroke
 * (the coin drops onto the i, the d's open their robot eyes and smile), the
 * two robots jump up from behind it, letters and numbers swoop in from the
 * edges to circle it, and the pets peek in at the bottom. A tap skips it.
 */
export function SplashScreen() {
  const reduceMotion = useReducedMotion() ?? false
  const [visible, setVisible] = useState(() => !shownThisLaunch)

  useEffect(() => {
    shownThisLaunch = true
    if (!visible) return undefined
    const timer = setTimeout(() => setVisible(false), reduceMotion ? 900 : SHOW_MS)
    return () => clearTimeout(timer)
  }, [visible, reduceMotion])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="presentation"
          data-splash=""
          onClick={() => setVisible(false)}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(6px)' }}
          transition={{ duration: 0.45 }}
          className="fixed inset-0 z-[100] overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#FFFFFF_0%,#F3FBF8_45%,#D9F2EA_100%)]"
        >
          {/* a soft ring of light behind the name */}
          <motion.div
            aria-hidden="true"
            className="absolute top-[42%] left-1/2 size-[min(90vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,195,166,0.22),transparent_65%)]"
            initial={reduceMotion ? false : { scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          <div className="absolute top-[42%] left-1/2 w-[min(86vw,560px)] -translate-x-1/2 -translate-y-1/2">
            {/* robots jump up from behind the logo */}
            {(['girl', 'boy'] as const).map((model, index) => (
              <motion.div
                key={model}
                aria-hidden="true"
                className="absolute bottom-[62%] w-[22%]"
                style={{ left: index === 0 ? '-4%' : '82%' }}
                initial={
                  reduceMotion ? false : { y: 140, opacity: 0, rotate: index === 0 ? -20 : 20 }
                }
                animate={{ y: 0, opacity: 1, rotate: index === 0 ? -8 : 8 }}
                transition={{
                  delay: 1.3 + index * 0.15,
                  type: 'spring',
                  stiffness: 240,
                  damping: 11,
                }}
              >
                <Robot model={model} mood="wave" followPointer={false} className="h-auto w-full" />
              </motion.div>
            ))}

            <KiddoWordmark
              animate={!reduceMotion}
              delay={0.15}
              className="relative h-auto w-full drop-shadow-[0_10px_18px_rgba(11,111,98,0.18)]"
            />

            {/* letters and numbers swoop in from far away and circle the name */}
            {GLYPHS.map(({ ch, color }, index) => {
              const angle = (index / GLYPHS.length) * Math.PI * 2 - Math.PI / 2
              const rx = 62
              const ry = 105
              const from = index % 2 === 0 ? 1 : -1
              return (
                <motion.span
                  key={ch}
                  aria-hidden="true"
                  className="absolute font-display text-3xl font-extrabold sm:text-5xl"
                  style={{
                    color,
                    left: `${50 + Math.cos(angle) * rx}%`,
                    top: `${50 + Math.sin(angle) * ry}%`,
                    x: '-50%',
                    y: '-50%',
                  }}
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          scale: 2.4,
                          rotate: from * 200,
                          // rounded: a tiny float like 8.6e-15 is not a valid CSS length
                          translateX: `${Math.round(Math.cos(angle) * 1400) / 10}vw`,
                          translateY: `${Math.round(Math.sin(angle) * 900) / 10}vh`,
                        }
                  }
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 1,
                          scale: 1,
                          rotate: 0,
                          translateX: '0vw',
                          translateY: ['0vh', '0vh', '-1.2vh', '0vh'],
                        }
                  }
                  transition={{
                    delay: 0.9 + index * 0.06,
                    duration: 1.1,
                    ease: [0.2, 0.9, 0.3, 1.1],
                    translateY: {
                      delay: 0.9 + index * 0.06,
                      duration: 2.2,
                      times: [0, 0.5, 0.75, 1],
                    },
                  }}
                >
                  {ch}
                </motion.span>
              )
            })}
          </div>

          {/* pets peek in at the bottom */}
          {PETS.map(({ pet, x, delay, flip }) => (
            <motion.div
              key={pet}
              aria-hidden="true"
              className="absolute bottom-0 w-[min(18vw,150px)]"
              style={{ left: x, scaleX: flip ? -1 : 1 }}
              initial={reduceMotion ? false : { y: '110%' }}
              animate={{ y: '8%' }}
              transition={{ delay, type: 'spring', stiffness: 200, damping: 13 }}
            >
              <PetSprite pet={pet} emotion="happy" className="w-full" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
