import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Wearing } from '@/features/shop/outfits'
import type { MascotModel } from '@/store/familyStore'
import { MascotFigure } from './MascotFigure'
import { PetSprite } from '@/features/pets/PetSprite'
import { useActivePet } from '@/store/progressStore'
import { MascotThoughtBubble } from './MascotThoughtBubble'
import type { MascotMood } from './types'

/**
 * How the robot spends its time on a page:
 *  - `tour`  – walks from card to card (`data-roam`) and points at each one, quietly;
 *  - `play`  – hops from card to card, sometimes slips and tumbles, gets up again;
 *  - `climb` – climbs over cards: sits on top, then hangs below an edge and swings.
 */
export type RoamMode = 'tour' | 'play' | 'climb'

interface RoamingMascotProps {
  model: MascotModel
  wearing?: Wearing
  mode: RoamMode
  /** Which `data-roam="…"` elements it visits. */
  group: string
  /** Robot width in px. */
  size?: number
  /** Say this in a bubble while peeking in from the screen edge, before roaming. */
  greeting?: string
  onGreet?: () => void
  /** Wait before the first move, so two robots do not move in step. */
  delayMs?: number
  /** Where it starts: the screen edge, or on top of the first target. */
  start?: 'edge' | 'first'
  /** Starts inside this `data-roam` element instead (e.g. its picture frame). */
  startAt?: string
}

interface Point {
  x: number
  y: number
}

type Pose = 'top' | 'point' | 'hang'

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })

/** Page coordinates of a spot on an element, for a robot of the given size. */
function spotOn(element: Element, pose: Pose, size: number): Point {
  const rect = element.getBoundingClientRect()
  const height = size * 1.25
  const x = rect.left + window.scrollX
  const y = rect.top + window.scrollY
  switch (pose) {
    case 'top':
      // Feet on the top edge, a little off-centre so the card stays readable.
      return { x: x + rect.width * 0.78 - size / 2, y: y - height * 0.86 }
    case 'point':
      // Beside the card’s top-right corner, pointing at it.
      return { x: x + rect.width - size * 0.35, y: y + rect.height * 0.1 - height * 0.3 }
    case 'hang':
      // Hands on the bottom edge, body below it.
      return { x: x + rect.width * 0.25 - size / 2, y: y + rect.height - height * 0.18 }
  }
}

function targets(group: string): Element[] {
  return [...document.querySelectorAll(`[data-roam="${group}"]`)].filter((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })
}

/**
 * A robot that leaves its frame and moves about the page like a small,
 * curious toy: soft hops with a squash on landing, a turn towards where it
 * goes, a pause to look and point. It never blocks taps on the page.
 */
export function RoamingMascot({
  model,
  wearing,
  mode,
  group,
  size: baseSize = 120,
  greeting,
  onGreet,
  delayMs = 0,
  start = 'edge',
  startAt,
}: RoamingMascotProps) {
  const reduceMotion = useReducedMotion() ?? false
  const pet = useActivePet()
  // Smaller on phones, so the robot never hides a whole card.
  const [size] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640
      ? Math.round(baseSize * 0.7)
      : baseSize,
  )
  const body = useAnimationControls()
  const [mood, setMood] = useState<MascotMood>('idle')
  const [bubble, setBubble] = useState<string | null>(null)
  const [facing, setFacing] = useState<1 | -1>(-1)
  const position = useRef<Point>({ x: 0, y: 0 })
  const greetRef = useRef({ greeting, onGreet })

  useEffect(() => {
    greetRef.current = { greeting, onGreet }
  }, [greeting, onGreet])

  useEffect(() => {
    if (reduceMotion) return undefined
    const abort = new AbortController()
    const { signal } = abort
    // Once the page is left, no more moves: the robot is gone.
    const go = (...args: Parameters<typeof body.start>) =>
      signal.aborted ? Promise.resolve() : body.start(...args)

    const place = (point: Point) => {
      position.current = point
      return go({ x: point.x, y: point.y, rotate: 0, scaleX: 1, scaleY: 1 }, { duration: 0 })
    }

    /** A hop: up in an arc, a lean into the jump, a squash when it lands. */
    const hop = async (to: Point) => {
      const from = position.current
      const dx = to.x - from.x
      const distance = Math.hypot(dx, to.y - from.y)
      if (Math.abs(dx) > 4) setFacing(dx > 0 ? 1 : -1)
      const lift = Math.min(160, 50 + distance * 0.25)
      const duration = Math.min(1.5, 0.55 + distance / 900)
      setMood('happy')
      await go({
        x: [from.x, from.x + dx * 0.5, to.x],
        y: [from.y, Math.min(from.y, to.y) - lift, to.y],
        rotate: [0, dx > 0 ? 8 : -8, 0],
        scaleY: [0.88, 1.06, 1],
        scaleX: [1.08, 0.96, 1],
        transition: { duration, times: [0, 0.5, 1], ease: ['easeOut', 'easeIn'] },
      })
      if (signal.aborted) return
      await go({
        scaleY: [0.8, 1.08, 1],
        scaleX: [1.15, 0.97, 1],
        transition: { duration: 0.35, ease: 'easeOut' },
      })
      position.current = to
      setMood('idle')
    }

    /** Several small hops along the way look like walking. */
    const travel = async (to: Point) => {
      const from = position.current
      const steps = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 420))
      for (let step = 1; step <= steps && !signal.aborted; step += 1) {
        await hop({
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        })
      }
    }

    /** Slips, falls on its back, lies a moment, gets up and shakes it off. */
    const tumble = async () => {
      const at = position.current
      setMood('oops')
      await go({
        rotate: [0, facing * -25, facing * -95],
        y: [at.y, at.y - 30, at.y + size * 0.5],
        transition: { duration: 0.7, ease: 'easeIn' },
      })
      await sleep(900, signal)
      setMood('happy')
      await go({
        rotate: [facing * -95, facing * 10, 0],
        y: [at.y + size * 0.5, at.y - 40, at.y],
        transition: { duration: 0.8, ease: 'easeOut' },
      })
      setMood('idle')
    }

    /** Hanging from an edge: a gentle swing, like on monkey bars. */
    const swing = async () => {
      setMood('celebrate')
      await go({
        rotate: [0, 10, -8, 6, -3, 0],
        transition: { duration: 2.6, ease: 'easeInOut' },
      })
      setMood('idle')
    }

    const run = async () => {
      // Wait for the page to lay out before measuring it.
      await sleep(60, signal)
      const list = () => targets(group)
      const first = list()[0]
      const home = startAt ? document.querySelector(`[data-roam="${startAt}"]`) : null
      if (home) {
        const rect = home.getBoundingClientRect()
        place({
          x: rect.left + window.scrollX + rect.width / 2 - size / 2,
          y: rect.top + window.scrollY + rect.height / 2 - (size * 1.25) / 2,
        })
        setMood('wave')
        await sleep(700 + delayMs, signal)
      } else if (start === 'edge' || !first) {
        // Peek in from the right edge of the screen, at the height of the view.
        place({
          x: window.scrollX + window.innerWidth - size * 0.55,
          y: window.scrollY + window.innerHeight * 0.62,
        })
        await sleep(delayMs, signal)
        if (greetRef.current.greeting) {
          setMood('wave')
          setBubble(greetRef.current.greeting)
          greetRef.current.onGreet?.()
          await sleep(4200, signal)
          setBubble(null)
        }
      } else {
        place(spotOn(first, 'top', size))
        await sleep(delayMs, signal)
      }

      let index = 0
      let visits = 0
      while (!signal.aborted) {
        const all = list()
        if (all.length === 0) {
          await sleep(1000, signal)
          continue
        }
        const target =
          mode === 'tour' ? all[index % all.length]! : all[Math.floor(Math.random() * all.length)]!
        index += 1
        visits += 1

        if (mode === 'tour') {
          await travel(spotOn(target, 'top', size))
          setFacing(-1)
          setMood('wave')
          await sleep(2600, signal)
          setMood('idle')
          await sleep(500, signal)
        } else if (mode === 'climb') {
          const hang = visits % 2 === 0
          await travel(spotOn(target, hang ? 'hang' : 'top', size))
          if (hang) await swing()
          else {
            setMood('wave')
            await sleep(1800, signal)
          }
          setMood('idle')
          await sleep(700, signal)
        } else {
          await travel(spotOn(target, 'top', size))
          if (visits % 4 === 0) await tumble()
          else {
            setMood(visits % 3 === 0 ? 'celebrate' : 'wave')
            await sleep(1400 + Math.random() * 1200, signal)
          }
          setMood('idle')
          await sleep(600 + Math.random() * 900, signal)
        }
      }
    }

    void run()
    return () => abort.abort()
    // facing is read only for the tumble direction; it must not restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, delayMs, group, mode, reduceMotion, size, start, startAt])

  if (reduceMotion || typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      animate={body}
      initial={{ x: -9999, y: -9999 }}
      className="pointer-events-none absolute top-0 left-0 z-30"
      style={{ width: size }}
      aria-hidden="true"
    >
      {bubble && (
        <div className="absolute right-full bottom-1/2 w-80 pr-2">
          <MascotThoughtBubble
            message={{ text: bubble, emoji: '👋' }}
            messageKey={1}
            side="right"
          />
        </div>
      )}
      <div style={{ transform: `scaleX(${facing})` }} className="transition-transform duration-300">
        <MascotFigure
          model={model}
          wearing={wearing}
          mood={mood}
          followPointer={false}
          tint={false}
          className="h-auto w-full drop-shadow-[0_10px_8px_rgba(58,46,77,0.18)]"
        />
      </div>
      {/* The pet keeps close to the robot's feet wherever it goes. */}
      {pet && <PetSprite pet={pet} className="absolute -bottom-1 left-[62%] w-[46%]" />}
    </motion.div>,
    document.body,
  )
}
