import clsx from 'clsx'
import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { createMathQuestion, MAX_ANSWER_DIGITS } from './mathQuestion'

interface ParentGateProps {
  onPass: () => void
  onCancel: () => void
}

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
  const dialog = useRef<HTMLDivElement>(null)

  // Focus the dialog so a keyboard (or a tablet’s hardware keyboard) works at once.
  useEffect(() => dialog.current?.focus(), [])

  const submit = () => {
    if (answer === '') return
    if (Number(answer) === question.answer) {
      onPass()
      return
    }
    setWrong(true)
    setAnswer('')
    setQuestion(createMathQuestion())
    void shake.start({ x: [0, -12, 10, -6, 4, 0], transition: { duration: 0.4 } })
  }

  const press = (key: Key) => {
    if (key === 'ok') submit()
    else if (key === 'clear') setAnswer(answer.slice(0, -1))
    else if (answer.length < MAX_ANSWER_DIGITS) {
      setAnswer(answer + key)
      setWrong(false)
    }
  }

  return (
    <motion.div
      ref={dialog}
      tabIndex={-1}
      animate={shake}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      aria-describedby="gate-text"
      className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[32px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)] outline-none"
      onKeyDown={(event) => {
        if (/^\d$/.test(event.key)) press(event.key as Key)
        else if (event.key === 'Enter') submit()
        else if (event.key === 'Backspace') setAnswer(answer.slice(0, -1))
        else if (event.key === 'Escape') onCancel()
      }}
    >
      <h2 id="gate-title" className="font-display text-2xl font-extrabold">
        {t('parent.gate.title')}
      </h2>
      <p id="gate-text" className="text-ink-soft">
        {t('parent.gate.text')}
      </p>

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
        {wrong ? t('parent.gate.wrong') : ''}
      </p>

      <div className="grid w-full grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
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
                : 'bg-cream text-ink shadow-[0_4px_0_var(--color-line)]',
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
  )
}

/** The gate centred over a dimmed screen. */
export function ParentGateOverlay(props: ParentGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4">
      <ParentGate {...props} />
    </div>
  )
}
