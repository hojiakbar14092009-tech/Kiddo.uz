import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useMascotModel } from '@/store/familyStore'
import { Robot } from './Robot'
import { MascotThoughtBubble } from './MascotThoughtBubble'

const FIRST_APPEARANCE_MS = 900
const VISIBLE_MS = 6500
const DEFAULT_IDLE_MS = 30_000
const PEEK_SPRING = { type: 'spring', stiffness: 70, damping: 12, mass: 1 } as const

interface PeekingMascotProps {
  /** What the robot says when it peeks in. */
  message: string
  side?: 'left' | 'right'
  /** Peek in again after this long without any touch. */
  idleMs?: number
}

/**
 * The robot is not parked on screen: it slides in from the screen edge,
 * waves and says something, then hides again. It comes back when the child
 * has not touched the screen for a while, or right away when the child taps it.
 */
export function PeekingMascot({
  message,
  side = 'right',
  idleMs = DEFAULT_IDLE_MS,
}: PeekingMascotProps) {
  const model = useMascotModel()
  const { sayText } = useSpeaker()
  const reduceMotion = useReducedMotion() ?? false
  const [visible, setVisible] = useState(false)
  const [appearances, setAppearances] = useState(0)

  const latest = useRef({ message, sayText })
  const peekInRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    latest.current = { message, sayText }
  }, [message, sayText])

  useEffect(() => {
    let isVisible = false
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined

    const scheduleIdlePeek = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(peekIn, idleMs)
    }

    const peekIn = () => {
      clearTimeout(idleTimer)
      clearTimeout(hideTimer)
      isVisible = true
      setVisible(true)
      setAppearances((count) => count + 1)
      void latest.current.sayText(latest.current.message)
      hideTimer = setTimeout(() => {
        isVisible = false
        setVisible(false)
        scheduleIdlePeek()
      }, VISIBLE_MS)
    }

    const onTouch = () => {
      if (!isVisible) scheduleIdlePeek()
    }

    peekInRef.current = peekIn
    const firstTimer = setTimeout(peekIn, FIRST_APPEARANCE_MS)
    window.addEventListener('pointerdown', onTouch)

    return () => {
      clearTimeout(firstTimer)
      clearTimeout(hideTimer)
      clearTimeout(idleTimer)
      window.removeEventListener('pointerdown', onTouch)
    }
  }, [idleMs])

  const isRight = side === 'right'
  const hiddenX = isRight ? '105%' : '-105%'
  const shownX = isRight ? '22%' : '-22%'

  return (
    <div
      className={clsx(
        'pointer-events-none fixed bottom-[12vh] z-30 flex items-center gap-2',
        isRight ? 'right-0 flex-row' : 'left-0 flex-row-reverse',
      )}
    >
      <MascotThoughtBubble
        message={visible ? { text: message, emoji: '👋' } : null}
        messageKey={appearances}
        side={isRight ? 'right' : 'left'}
      />

      <motion.button
        type="button"
        aria-label={message}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={() => peekInRef.current()}
        initial={{ x: hiddenX, rotate: isRight ? -10 : 10 }}
        animate={{ x: visible ? shownX : hiddenX }}
        transition={reduceMotion ? { duration: 0.2 } : PEEK_SPRING}
        className="pointer-events-auto w-[112px] sm:w-[150px]"
      >
        <Robot model={model} mood={visible ? 'wave' : 'idle'} className="h-auto w-full" />
      </motion.button>
    </div>
  )
}
