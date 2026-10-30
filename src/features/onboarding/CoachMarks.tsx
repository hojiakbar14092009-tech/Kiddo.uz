import clsx from 'clsx'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Robot } from '@/features/mascot/Robot'
import { tDynamic } from '@/lib/tDynamic'
import { audioManager } from '@/services/audio/audioManager'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { childAge, useActiveChild } from '@/store/familyStore'
import { markTourSeen, stepsFor, useToursSeen, type TourId, type TourStep } from './tour'

/** Space kept around the spotlight and between it and the bubble (px). */
const PAD = 8
const GAP = 12
/** How long a tour waits for its screen to settle before giving up (until the next visit). */
const MAX_WAIT_MS = 20_000

/** Something else has the child's attention: the opening, a dialog, a celebration. */
function busy(ignoreVoice = false): boolean {
  const voice = audioManager.getStatus()
  if (!ignoreVoice && (voice === 'speaking' || voice === 'loading')) return true
  return (
    document.querySelector(
      '[data-splash], [data-testid="roam-greeting"], [role="dialog"]:not([data-coach]), [role="alertdialog"]',
    ) !== null
  )
}

/** The first anchor of a step that is on the page and has a size. */
function findAnchor(step: TourStep): HTMLElement | null {
  for (const selector of step.anchors) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element && element.getBoundingClientRect().width > 0) return element
  }
  return null
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Guided discovery on the real screen (Phase 25): a soft spotlight on each
 * thing in turn and a bubble from KidoBot with Next / Back / Skip. It never
 * traps the child — the page stays usable, Escape or Skip ends it, and
 * leaving the page ends it too. Steps whose thing is not on the page are
 * left out. Young children hear each step; older ones get a short line.
 */
export function CoachMarks({ tour, delayMs = 900 }: { tour: TourId; delayMs?: number }) {
  const seenNow = useToursSeen(tour)
  // chosen once, when the screen opens (the count rises as soon as the tour is shown)
  const [seen] = useState(seenNow)
  const [steps] = useState(() => stepsFor(tour, seen))
  const [ready, setReady] = useState(false)
  // it starts once the page has settled and the first of its things is on screen
  // (a game may first show a short lesson: the tour waits for the answers)
  useEffect(() => {
    if (steps.length === 0) return undefined
    let timer = 0
    let waited = 0
    const check = () => {
      // a voice that never says it has ended (a browser bug) is not waited for forever
      const stuck = waited > MAX_WAIT_MS / 2
      // the tour begins with its first thing (a game's answers come after its short
      // lesson); if that never shows, the tour waits for another visit
      if (!busy(stuck) && findAnchor(steps[0]!) !== null) setReady(true)
      else if ((waited += 500) < MAX_WAIT_MS) timer = window.setTimeout(check, 500)
    }
    timer = window.setTimeout(check, delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, steps])
  if (!ready || steps.length === 0) return null
  return <Tour tour={tour} steps={steps} brief={seen > 0} />
}

function Tour({
  tour,
  steps,
  brief,
}: {
  tour: TourId
  steps: readonly TourStep[]
  brief: boolean
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const child = useActiveChild()
  const young = !child || childAge(child) <= 6
  const { sayText } = useSpeaker()
  // only the steps whose thing is on this page right now
  const [shown] = useState(() => steps.filter((step) => findAnchor(step) !== null))
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(shown.length === 0)
  const [box, setBox] = useState<Box | null>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const bubble = useRef<HTMLElement>(null)
  const [bubbleHeight, setBubbleHeight] = useState(0)
  const step = shown[index]

  // counted as soon as it is shown (a child who just taps on and leaves has seen it too)
  const counted = useRef(false)
  useEffect(() => {
    if (counted.current || shown.length === 0) return
    counted.current = true
    markTourSeen(tour)
  }, [shown.length, tour])

  // focus goes back where it was (a game's first answer) when the tour ends
  const before = useRef<Element | null>(
    typeof document === 'undefined' ? null : document.activeElement,
  )
  const finish = useCallback(() => {
    setDone(true)
    // a skipped step stops talking at once
    if (audioManager.getStatus() !== 'idle') audioManager.stopSpeech()
    const target = before.current
    if (target instanceof HTMLElement && target.isConnected) target.focus()
  }, [])

  // the spotlight follows its thing (scrolled into view first, then kept in place)
  useLayoutEffect(() => {
    if (done || !step) return undefined
    const anchor = findAnchor(step)
    if (!anchor) return undefined
    anchor.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
    const measure = () => {
      const rect = anchor.getBoundingClientRect()
      setBox((old) =>
        old &&
        old.top === rect.top &&
        old.left === rect.left &&
        old.width === rect.width &&
        old.height === rect.height
          ? old
          : { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      )
      setBubbleHeight(bubble.current?.offsetHeight ?? 0)
    }
    measure()
    const timer = window.setInterval(measure, 250)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [done, reduceMotion, step])

  const text = step ? tDynamic(t, `tour.${tour}.${step.id}.${young ? 'text' : 'short'}`) : ''
  const heading = step ? tDynamic(t, `tour.${tour}.${step.id}.title`) : ''

  // each step: focus on its words; a young child also hears them
  useEffect(() => {
    if (done || !step) return
    title.current?.focus()
    if (young) void sayText(`${heading}. ${text}`)
  }, [done, heading, sayText, step, text, young])

  // Escape ends the tour; arrows step through it
  useEffect(() => {
    if (done) return undefined
    const onKey = (event: KeyboardEvent) => {
      // keys meant for something else (a parent gate, a field, a dialog above) are left alone
      if (event.defaultPrevented) return
      const target = event.target instanceof Element ? event.target : null
      if (
        target?.closest(
          'input, textarea, select, [role="dialog"]:not([data-coach]), [role="alertdialog"]',
        )
      )
        return
      if (event.key === 'Escape') finish()
      else if (event.key === 'ArrowRight') {
        if (index < shown.length - 1) setIndex(index + 1)
        else finish()
      } else if (event.key === 'ArrowLeft' && index > 0) setIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, finish, index, shown.length])

  if (done || !step) return null
  const last = index === shown.length - 1
  const viewH = typeof window === 'undefined' ? 800 : window.innerHeight
  // the bubble sits on the side of its thing with more room, and always fully on screen
  // (a tall thing: the bubble overlaps its edge rather than leaving the screen)
  const bubbleH = bubbleHeight || 220
  const below = !box || viewH - (box.top + box.height) >= box.top
  const wanted = !box
    ? (viewH - bubbleH) / 2
    : below
      ? box.top + box.height + PAD + GAP
      : box.top - PAD - GAP - bubbleH
  const bubbleTop = Math.max(16, Math.min(wanted, viewH - bubbleH - 16))

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40"
      data-testid="coach-marks"
      data-step={step.id}
    >
      {box && (
        <div
          aria-hidden="true"
          className={clsx(
            'absolute rounded-[28px] ring-4 ring-coin',
            !reduceMotion && 'transition-[top,left,width,height] duration-300',
          )}
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            // the rest of the screen is dimmed softly; the thing itself stays bright
            boxShadow: '0 0 0 9999px rgb(30 24 48 / 0.45)',
          }}
        />
      )}
      <section
        role="dialog"
        data-coach=""
        aria-modal="false"
        aria-labelledby="coach-title"
        aria-describedby="coach-text"
        className="pointer-events-auto absolute left-1/2 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-3 rounded-panel bg-surface p-4 shadow-press-lg sm:p-5"
        ref={bubble}
        style={{ top: bubbleTop, maxHeight: viewH - 32, overflowY: 'auto' }}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="shrink-0">
            <Robot
              model={child?.mascot ?? 'boy'}
              size={young ? 64 : 48}
              mood="happy"
              followPointer={false}
            />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id="coach-title"
              ref={title}
              tabIndex={-1}
              style={{ outline: 'none' }}
              className={clsx('font-display font-extrabold', young ? 'text-2xl' : 'text-xl')}
            >
              {heading}
            </h2>
            <p id="coach-text" className={clsx('text-ink-soft', young ? 'text-lg' : 'text-base')}>
              {text}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            data-testid="coach-skip"
            className="min-h-11 rounded-full px-2 text-base font-semibold text-ink-soft underline underline-offset-4"
          >
            {t('tour.skip')}
          </button>
          <span className="text-sm font-semibold text-ink-soft" aria-live="polite">
            {brief
              ? t('tour.reminder')
              : t('tour.step', { current: index + 1, total: shown.length })}
          </span>
        </div>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="soft" size="md" className="flex-1" onClick={() => setIndex(index - 1)}>
              {t('tour.back')}
            </Button>
          )}
          <Button
            size="md"
            className="flex-1"
            data-testid="coach-next"
            onClick={() => (last ? finish() : setIndex(index + 1))}
          >
            {last ? t('tour.done') : t('tour.next')}
          </Button>
        </div>
      </section>
    </div>
  )
}
