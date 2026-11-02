import clsx from 'clsx'
import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { LOCKOUT_SECONDS, lockSecondsLeft, useParentGateStore } from '@/store/parentStore'
import { createMathQuestion, MAX_ANSWER_DIGITS } from './mathQuestion'

interface ParentGateProps {
  onPass: () => void
  onCancel: () => void
}

export { LOCKOUT_SECONDS, MAX_WRONG_ANSWERS } from '@/store/parentStore'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'ok'] as const
type Key = (typeof KEYS)[number]

/**
 * “Grown-ups only”: a multiplication question with an on-screen keypad.
 * Protects the parent area, payments and the end of the rest screen.
 */
export function ParentGate({ onPass, onCancel }: ParentGateProps) {
  const { t } = useTranslation()
  const [question, setQuestion] = useState(() => createMathQuestion())
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)
  const shake = useAnimationControls()
  const body = useRef<HTMLDivElement>(null)
  const lockedUntil = useParentGateStore((state) => state.lockedUntil)
  const fail = useParentGateStore((state) => state.fail)
  const unlock = useParentGateStore((state) => state.unlock)
  const [now, setNow] = useState(() => Date.now())
  const secondsLeft = lockSecondsLeft(lockedUntil, now)
  const locked = secondsLeft > 0

  // A random tapper would eventually hit the answer; a short rest makes that impractical while
  // costing a parent who mistyped almost nothing. The rest is kept in the store, so closing the
  // gate and opening it again (or reloading) does not end it.
  useEffect(() => {
    if (lockedUntil === 0) return undefined
    if (!locked) {
      unlock()
      return undefined
    }
    // a clock set back while waiting: the rest is never longer than it was
    if (lockedUntil - now > LOCKOUT_SECONDS * 1000) {
      useParentGateStore.setState({ lockedUntil: now + LOCKOUT_SECONDS * 1000 })
      return undefined
    }
    const tick = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(tick)
  }, [lockedUntil, locked, now, unlock])

  const submit = () => {
    if (answer === '' || locked) return
    if (Number(answer) === question.answer) {
      // a right answer starts the count again, wherever the gate was asked
      unlock()
      onPass()
      return
    }
    setNow(fail())
    // the keys may be about to be disabled: keep focus inside the dialog
    body.current?.focus()
    setWrong(true)
    setAnswer('')
    setQuestion(createMathQuestion())
    void shake.start({ x: [0, -12, 10, -6, 4, 0], transition: { duration: 0.4 } })
  }

  const press = (key: Key) => {
    if (locked) return
    if (key === 'ok') submit()
    else if (key === 'clear') setAnswer(answer.slice(0, -1))
    else if (answer.length < MAX_ANSWER_DIGITS) {
      setAnswer(answer + key)
      setWrong(false)
    }
  }

  // The keypad body takes focus first, so a keyboard (or a tablet’s hardware
  // keyboard) works at once. A tap outside does not cancel: a child poking
  // around should not close it by accident; “Back” and Escape do.
  return (
    <Dialog
      title={t('parent.gate.title')}
      description={t('parent.gate.text')}
      onClose={onCancel}
      dismissible={false}
      initialFocus={body}
      size="sm"
      testId="parent-gate"
      // digits, Enter and Backspace work wherever focus is inside the gate
      onKeyDown={(event) => {
        if (/^\d$/.test(event.key)) press(event.key as Key)
        else if (event.key === 'Enter') submit()
        else if (event.key === 'Backspace' && !locked) setAnswer(answer.slice(0, -1))
      }}
    >
      <motion.div
        ref={body}
        tabIndex={-1}
        animate={shake}
        className="flex w-full flex-col items-center gap-4 outline-none"
      >
        <p className="font-display text-4xl font-extrabold tabular-nums" aria-live="polite">
          <span className="sr-only">
            {t('parent.gate.question', { a: question.a, b: question.b })}
          </span>
          <span aria-hidden="true">
            {question.a} × {question.b} ={' '}
            <span
              className={clsx(
                'inline-block min-w-16 rounded-2xl border-[3px] px-2',
                wrong ? 'border-oops' : 'border-line-strong',
              )}
            >
              {answer || '?'}
            </span>
          </span>
        </p>
        <p role="status" className="min-h-6 font-semibold text-oops-ink">
          {locked
            ? t('parent.gate.wait', { count: secondsLeft })
            : wrong
              ? t('parent.gate.wrong')
              : ''}
        </p>

        <div className="grid w-full grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={locked}
              aria-label={
                key === 'ok'
                  ? t('parent.gate.check')
                  : key === 'clear'
                    ? t('parent.gate.clear')
                    : undefined
              }
              className={clsx(
                'h-14 rounded-2xl font-display text-2xl font-bold transition-transform active:translate-y-0.5',
                key === 'ok'
                  ? 'bg-primary text-white shadow-[0_4px_0_var(--color-primary-shadow)]'
                  : 'bg-cream text-ink shadow-press-sm',
              )}
            >
              {key === 'ok' ? '✓' : key === 'clear' ? '⌫' : key}
            </button>
          ))}
        </div>

        <Button variant="soft" size="md" onClick={onCancel}>
          {t('parent.gate.cancel')}
        </Button>
      </motion.div>
    </Dialog>
  )
}

/**
 * The gate over the current screen. Kept for the call sites that open it on
 * demand; the gate itself is already a modal dialog over a dimmed screen.
 */
export function ParentGateOverlay(props: ParentGateProps) {
  return <ParentGate {...props} />
}
