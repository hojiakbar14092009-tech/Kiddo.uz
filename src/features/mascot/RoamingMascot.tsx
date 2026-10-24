import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'
import type { Wearing } from '@/features/shop/outfits'
import type { MascotModel } from '@/store/familyStore'
import { MascotFigure } from './MascotFigure'
import { PetSprite } from '@/features/pets/PetSprite'
import { useActivePet } from '@/store/progressStore'
import { MascotThoughtBubble } from './MascotThoughtBubble'
import type { MascotMood } from './types'
import { bubbleMaxWidth, clampX, placeGreeting, type Box } from './greetPlacement'
import {
  claim,
  clearStanding,
  crossesAnother,
  freeTargets,
  othersTrips,
  release,
  setStanding,
  type Point,
} from './roamSpace'

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
  /** Say this in a bubble before roaming (in `greetAt`, or in a free spot of the screen). */
  greeting?: string
  /** Called when the greeting shows; `inStage` is true when it is shown in `greetAt`. */
  onGreet?: (inStage: boolean) => void
  /** Called when the greeting bubble goes away. */
  onGreetEnd?: () => void
  /** A `data-roam` spot the page keeps free for the greeting (robot and bubble stand there). */
  greetAt?: string
  /** Wait before the first move, so two robots do not move in step. */
  delayMs?: number
  /** Where it starts: the screen edge, or on top of the first target. */
  start?: 'edge' | 'first'
  /** Starts inside this `data-roam` element instead (e.g. its picture frame). */
  startAt?: string
}

type Pose = 'top' | 'point' | 'hang'

interface GreetBubble {
  text: string
  maxWidth: number
  /** Measured width; the bubble is laid out at exactly this width once placed. */
  width?: number
  /** Offset from the robot's top-left; null while it is only being measured. */
  at: Point | null
  side: 'left' | 'right'
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })

/** Safe-area insets (notch, home bar), read once from a hidden probe. */
let insetsCache: { top: number; right: number; bottom: number; left: number } | null = null
// turning the phone moves the notch to another side
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    insetsCache = null
  })
}
function safeInsets() {
  if (insetsCache) return insetsCache
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  document.body.appendChild(probe)
  const style = getComputedStyle(probe)
  const read = (value: string) => Number.parseFloat(value) || 0
  insetsCache = {
    top: read(style.paddingTop),
    right: read(style.paddingRight),
    bottom: read(style.paddingBottom),
    left: read(style.paddingLeft),
  }
  probe.remove()
  return insetsCache
}

/** Breathing room from the screen edges. */
const MARGIN = 8

/** The visible part of the page (page coordinates), without safe areas and the sticky top bar. */
function visibleArea(): Box {
  const insets = safeInsets()
  const header = document.querySelector('header')?.getBoundingClientRect()
  // the top bar stays on screen while the page scrolls, so nothing goes under it
  const top = Math.max(insets.top, header && header.bottom > 0 ? header.bottom : 0)
  const width = document.documentElement.clientWidth || window.innerWidth
  const left = insets.left + MARGIN
  const right = width - insets.right - MARGIN
  const bottom = window.innerHeight - insets.bottom - MARGIN
  return {
    x: window.scrollX + left,
    y: window.scrollY + top + MARGIN,
    width: right - left,
    height: bottom - top - MARGIN,
  }
}

function pageBox(element: Element): Box {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  }
}

/** What the greeting bubble must not cover: anything to tap, cards and headings. */
function obstacles(except: Element | null): Box[] {
  const selector = 'a, button, input, select, textarea, [role="button"], [data-roam], h1, h2, h3'
  return [...document.querySelectorAll(selector)]
    .filter((element) => !(except && (except === element || except.contains(element))))
    .filter((element) => !element.closest('[data-roaming-robot]'))
    .map(pageBox)
    .filter((rect) => rect.width > 0 && rect.height > 0)
}

/** Headings and lines of text on the page (page coordinates), with their elements. */
function textBoxes(): { element: Element; box: Box }[] {
  return [...document.querySelectorAll('h1, h2, h3, p')]
    .filter((element) => !element.closest('[data-roaming-robot]'))
    .map((element) => ({ element, box: pageBox(element) }))
    .filter(({ box }) => box.width > 0 && box.height > 0)
}

/**
 * Would a robot standing on this card hide a heading or a line of text (the
 * day's plan title above the cards, say)? Such a card is left out of the walk.
 */
function hidesText(
  card: Element,
  spot: Point,
  size: number,
  texts: readonly { element: Element; box: Box }[],
): boolean {
  const robot = { x: spot.x + size * 0.15, y: spot.y, width: size * 0.7, height: size * 1.25 }
  return texts.some(
    ({ element, box }) =>
      !card.contains(element) &&
      robot.x < box.x + box.width &&
      robot.x + robot.width > box.x &&
      robot.y < box.y + box.height &&
      robot.y + robot.height > box.y,
  )
}

/** Is something (a splash, a dialog) on top of the page at this point? */
function coveredAt(point: Point): boolean {
  if (typeof document.elementFromPoint !== 'function') return false
  const hit = document.elementFromPoint(point.x - window.scrollX, point.y - window.scrollY)
  if (!hit) return false
  return !hit.closest('main, header')
}

/** Page coordinates of a spot on an element, for a robot of the given size. */
function spotOn(element: Element, pose: Pose, size: number): Point {
  const rect = element.getBoundingClientRect()
  const height = size * 1.25
  const x = rect.left + window.scrollX
  const y = rect.top + window.scrollY
  let spot: Point
  switch (pose) {
    case 'top':
      // Feet on the top edge, a little off-centre so the card stays readable.
      spot = { x: x + rect.width * 0.78 - size / 2, y: y - height * 0.86 }
      break
    case 'point':
      // Beside the card’s top-right corner, pointing at it.
      spot = { x: x + rect.width - size * 0.35, y: y + rect.height * 0.1 - height * 0.3 }
      break
    case 'hang':
      // Hands on the bottom edge, body below it.
      spot = { x: x + rect.width * 0.25 - size / 2, y: y + rect.height - height * 0.18 }
      break
  }
  // Never past the left or right edge of the screen (the pet sticks out a little on the right).
  const area = visibleArea()
  return { x: clampX(spot.x, size * 1.1, area.x, area.x + area.width), y: Math.max(0, spot.y) }
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
  onGreetEnd,
  greetAt,
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
  const [bubble, setBubble] = useState<GreetBubble | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [facing, setFacing] = useState<1 | -1>(-1)
  const position = useRef<Point>({ x: 0, y: 0 })
  const greetRef = useRef({ greeting, onGreet, onGreetEnd })

  useEffect(() => {
    greetRef.current = { greeting, onGreet, onGreetEnd }
  }, [greeting, onGreet, onGreetEnd])

  useEffect(() => {
    if (reduceMotion) return undefined
    const abort = new AbortController()
    const { signal } = abort
    const me = Symbol(model)
    // Once the page is left, no more moves: the robot is gone.
    const go = (...args: Parameters<typeof body.start>) =>
      signal.aborted ? Promise.resolve() : body.start(...args)

    const place = (point: Point) => {
      position.current = point
      setStanding(me, point)
      return go({ x: point.x, y: point.y, rotate: 0, scaleX: 1, scaleY: 1 }, { duration: 0 })
    }

    /** A hop: up in an arc, a lean into the jump, a squash when it lands. */
    const hop = async (to: Point) => {
      const from = position.current
      const dx = to.x - from.x
      const distance = Math.hypot(dx, to.y - from.y)
      if (Math.abs(dx) > 4) setFacing(dx > 0 ? 1 : -1)
      // A lower arc when another robot stands above, so it never jumps into it.
      const others = othersTrips(me, (card) => spotOn(card, 'top', size)).map(([at]) => at)
      let lift = Math.min(160, 50 + distance * 0.25)
      const peak = () => ({ x: from.x + dx * 0.5, y: Math.min(from.y, to.y) - lift })
      while (
        lift > 12 &&
        others.some((o) => Math.hypot(o.x - peak().x, o.y - peak().y) < size * 1.1)
      ) {
        lift -= 8
      }
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
      setStanding(me, to)
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

    /**
     * Says hello: waits until nothing (the splash, a dialog) covers the page,
     * measures the bubble, then stands where neither of them hides anything.
     */
    const greet = async (text: string) => {
      await sleep(delayMs, signal)
      const stage = greetAt ? document.querySelector(`[data-roam="${greetAt}"]`) : null
      const robot = { width: size, height: size * 1.25 }
      for (let waited = 0; waited < 8000 && !signal.aborted; waited += 200) {
        const area = visibleArea()
        const probe = stage ? pageBox(stage) : area
        if (
          !coveredAt({ x: probe.x + probe.width / 2, y: probe.y + Math.min(probe.height / 2, 40) })
        )
          break
        await sleep(200, signal)
      }
      if (signal.aborted) return
      const area = visibleArea()
      const stageBox = stage ? pageBox(stage) : null
      const maxWidth = bubbleMaxWidth(stageBox ?? area, robot)
      // first drawn hidden, only to measure it
      setBubble({ text, maxWidth, at: null, side: 'right' })
      await sleep(80, signal)
      const measured = bubbleRef.current
      const bubbleSize = {
        width: measured?.offsetWidth ?? maxWidth,
        height: measured?.offsetHeight ?? 120,
      }
      const spot = placeGreeting({
        area,
        robot,
        bubble: bubbleSize,
        obstacles: obstacles(stage),
        stage: stageBox,
      })
      await place(spot.robot)
      setFacing(spot.side === 'right' ? -1 : 1)
      setMood('wave')
      setBubble({
        text,
        maxWidth,
        width: bubbleSize.width,
        at: { x: spot.bubble.x - spot.robot.x, y: spot.bubble.y - spot.robot.y },
        side: spot.side,
      })
      greetRef.current.onGreet?.(spot.inStage)
      await sleep(4200, signal)
      setBubble(null)
      greetRef.current.onGreetEnd?.()
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
        const text = greetRef.current.greeting
        if (text) await greet(text)
        else {
          // Stand at the right edge of the screen, fully inside it.
          const area = visibleArea()
          place({
            x: area.x + area.width - size * 1.1,
            y: Math.min(
              window.scrollY + window.innerHeight * 0.62,
              area.y + area.height - size * 1.25,
            ),
          })
          await sleep(delayMs, signal)
        }
      } else {
        place(spotOn(first, 'top', size))
        await sleep(delayMs, signal)
      }

      let index = 0
      let visits = 0
      while (!signal.aborted) {
        const others = othersTrips(me, (card) => spotOn(card, 'top', size))
        // the page's text is measured once per pass, not once per card
        const texts = textBoxes()
        const all = freeTargets(list(), me).filter((target) => {
          const spot = spotOn(target, 'top', size)
          return (
            !crossesAnother(position.current, spot, others, size) &&
            !hidesText(target, spot, size, texts)
          )
        })
        if (all.length === 0) {
          // every card is taken by another robot: wait for one to be free
          await sleep(800, signal)
          continue
        }
        const target =
          mode === 'tour' ? all[index % all.length]! : all[Math.floor(Math.random() * all.length)]!
        claim(target, me)
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
          const near = othersTrips(me, (card) => spotOn(card, 'top', size)).some(
            ([at]) => Math.hypot(at.x - position.current.x, at.y - position.current.y) < size * 2,
          )
          // it only slips and falls where it cannot fall onto the other robot
          if (visits % 4 === 0 && !near) await tumble()
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
    return () => {
      abort.abort()
      release(me)
      clearStanding(me)
    }
    // facing is read only for the tumble direction; it must not restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, delayMs, greetAt, group, mode, model, reduceMotion, size, start, startAt])

  if (reduceMotion || typeof document === 'undefined') return null

  // Above the page's cards, but under the sticky top bar (z-20) and dialogs, and under
  // anything a page lifts to z-[16] to keep it visible (e.g. the shop's “call it back” button).
  return createPortal(
    <motion.div
      animate={body}
      initial={{ x: -9999, y: -9999 }}
      className="pointer-events-none absolute top-0 left-0 z-[15]"
      style={{ width: size }}
      aria-hidden="true"
      data-roaming-robot=""
    >
      {bubble && (
        <div
          ref={bubbleRef}
          data-testid="roam-greeting"
          className={clsx('absolute', !bubble.at && 'invisible')}
          // An explicit width: an absolute box would otherwise shrink to the
          // (narrow) robot it is placed in, and grow once moved beside it.
          style={{
            left: bubble.at?.x ?? 0,
            top: bubble.at?.y ?? 0,
            width: bubble.width ?? 'max-content',
            maxWidth: bubble.maxWidth,
          }}
        >
          <MascotThoughtBubble
            message={{ text: bubble.text, emoji: '👋' }}
            messageKey={bubble.at ? 2 : 1}
            side={bubble.side}
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
