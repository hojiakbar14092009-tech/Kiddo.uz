import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Picture } from '@/components/ui/Picture'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import type { LetterEntry } from '@/content/alphabet'
import { HighlightedWord } from '@/features/alphabet/HighlightedWord'
import { useSpeaker } from '@/services/audio/useSpeaker'

export type HintContent =
  | { kind: 'write'; letter: LetterEntry }
  | { kind: 'find-letter'; letter: LetterEntry }
  | { kind: 'find-picture'; letter: LetterEntry }
  | { kind: 'memory'; letter: LetterEntry | null }

/** Ten seconds without a right answer also counts as needing help. */
const IDLE_MS = 10_000

interface TaskHintProps {
  hint: HintContent
  /** The child is making mistakes: the bulb glows and wiggles. */
  struggling: boolean
}

/**
 * The help bulb in the top-right corner of every game. It is always there;
 * when the child struggles it lights up. Opening it shows, slowly and
 * on a loop, how to do the task – for letters, how the letter is written.
 */
export function TaskHint({ hint, struggling }: TaskHintProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const target = hint.letter?.id ?? 'memory'
  const [idleOn, setIdleOn] = useState<string | null>(null)

  // A new question starts a new wait.
  useEffect(() => {
    const timer = setTimeout(() => setIdleOn(target), IDLE_MS)
    return () => clearTimeout(timer)
  }, [target])

  const glow = (struggling || idleOn === target) && !open

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('task.hint')}
        animate={
          glow && !reduceMotion
            ? { rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.12, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={glow ? { duration: 1.1, repeat: Infinity, repeatDelay: 1.2 } : undefined}
        className={clsx(
          'relative flex size-14 shrink-0 items-center justify-center rounded-full text-3xl transition-colors sm:size-16',
          glow
            ? 'bg-coin shadow-[0_0_0_6px_rgba(255,201,60,0.35),0_5px_0_var(--color-coin-shadow)]'
            : 'bg-surface shadow-[0_5px_0_var(--color-line)]',
        )}
      >
        <span aria-hidden="true">💡</span>
        {glow && (
          <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-full bg-coin px-2 py-0.5 text-xs font-bold whitespace-nowrap text-ink">
            {t('task.hintShort')}
          </span>
        )}
      </motion.button>
      {open && <HintSheet hint={hint} onClose={() => setOpen(false)} />}
    </>
  )
}

function HintSheet({ hint, onClose }: { hint: HintContent; onClose: () => void }) {
  const { t } = useTranslation()
  const { sayText } = useSpeaker()
  const dialog = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useFocusTrap(dialog, button)

  const letter = hint.letter
  const text =
    hint.kind === 'write'
      ? t('task.hintWrite', { letter: letter?.upper ?? '' })
      : hint.kind === 'find-letter'
        ? t('task.hintFindLetter', { letter: letter?.upper ?? '' })
        : hint.kind === 'find-picture'
          ? t('task.hintFindPicture', { letter: letter?.upper ?? '', word: letter?.word ?? '' })
          : t('task.hintMemory')
  const spoken =
    hint.kind === 'write'
      ? t('task.hintWrite', { letter: letter?.spoken ?? '' })
      : hint.kind === 'find-letter'
        ? t('task.hintFindLetter', { letter: letter?.spoken ?? '' })
        : hint.kind === 'find-picture'
          ? t('task.hintFindPicture', { letter: letter?.spoken ?? '', word: letter?.word ?? '' })
          : t('task.hintMemory')

  useEffect(() => {
    void sayText(spoken)
  }, [sayText, spoken])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hint-title"
        className="flex max-h-full w-full max-w-lg flex-col items-center gap-4 overflow-y-auto rounded-[36px] bg-surface p-6 text-center text-ink shadow-[0_8px_0_var(--color-line)]"
      >
        <h2 id="hint-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          <span aria-hidden="true">💡 </span>
          {text}
        </h2>
        {hint.kind === 'write' && letter && <WritingAnimation letter={letter} />}
        {hint.kind === 'find-letter' && letter && <LetterSpotlight letter={letter} />}
        {hint.kind === 'find-picture' && letter && <PictureClue letter={letter} />}
        {hint.kind === 'memory' && <MemoryDemo letter={letter} />}
        <Button ref={button} onClick={onClose}>
          {t('task.hintOk')}
        </Button>
      </div>
    </div>
  )
}

/** The letter drawn slowly, line by line, as a finger would write it – then filled in. */
function WritingAnimation({ letter }: { letter: LetterEntry }) {
  const reduceMotion = useReducedMotion() ?? false
  const glyph = letter.upper.length > 1 ? `${letter.upper}` : `${letter.upper}${letter.lower}`
  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={glyph}
      className="w-full max-w-sm rounded-3xl bg-[repeating-linear-gradient(transparent_0_39px,var(--color-line)_39px_41px)]"
    >
      <motion.text
        x="160"
        y="150"
        textAnchor="middle"
        fontSize="150"
        fontWeight={800}
        className="font-display"
        fill="var(--color-primary)"
        stroke="var(--color-primary-ink)"
        strokeWidth={4}
        strokeLinejoin="round"
        strokeDasharray="1400"
        initial={reduceMotion ? false : { strokeDashoffset: 1400, fillOpacity: 0 }}
        animate={
          reduceMotion
            ? { fillOpacity: 1 }
            : { strokeDashoffset: [1400, 0, 0, 0], fillOpacity: [0, 0, 1, 1] }
        }
        transition={{ duration: 7, times: [0, 0.65, 0.8, 1], repeat: Infinity, repeatDelay: 0.6 }}
      >
        {glyph}
      </motion.text>
    </svg>
  )
}

/** The letter to find, glowing and bouncing, next to a look-alike crossed out. */
function LetterSpotlight({ letter }: { letter: LetterEntry }) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <div className="flex items-center gap-6">
      <motion.span
        aria-hidden="true"
        className="flex size-36 items-center justify-center rounded-[32px] bg-coin-soft font-display text-8xl font-extrabold text-primary-ink shadow-[0_0_0_8px_var(--color-coin)]"
        animate={reduceMotion ? undefined : { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        {letter.upper}
      </motion.span>
      <span className="font-display text-4xl font-extrabold text-ink-soft" aria-hidden="true">
        = {letter.lower}
      </span>
    </div>
  )
}

/** The letter flies into the word, and the word’s picture appears. */
function PictureClue({ letter }: { letter: LetterEntry }) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.span
        aria-hidden="true"
        className="font-display text-7xl font-extrabold text-highlight"
        animate={reduceMotion ? undefined : { y: [0, 40, 40, 0], scale: [1, 0.6, 0.6, 1] }}
        transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.35, 0.8, 1] }}
      >
        {letter.upper}
      </motion.span>
      <HighlightedWord letter={letter} className="text-5xl" />
      <motion.span
        className="flex size-36 items-center justify-center rounded-[28px] bg-white p-4 shadow-[0_5px_0_var(--color-line)]"
        animate={reduceMotion ? undefined : { scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Picture emoji={letter.emoji} alt={letter.word} className="size-full" />
      </motion.span>
    </div>
  )
}

/** Two cards turn over and show the same thing: that is a pair. */
function MemoryDemo({ letter }: { letter: LetterEntry | null }) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <div className="flex gap-4 [perspective:800px]" aria-hidden="true">
      {[0, 1].map((card) => (
        <motion.div
          key={card}
          className="flex h-40 w-32 flex-col items-center justify-center gap-1 rounded-[24px] bg-primary-soft shadow-[0_6px_0_var(--color-line)]"
          animate={reduceMotion ? undefined : { rotateY: [180, 180, 0, 0, 180] }}
          transition={{
            duration: 4,
            times: [0, 0.15 + card * 0.15, 0.3 + card * 0.15, 0.85, 1],
            repeat: Infinity,
          }}
        >
          <span className="font-display text-5xl font-extrabold">{letter?.upper ?? 'A'}</span>
          {letter && <Picture emoji={letter.emoji} className="size-14" />}
        </motion.div>
      ))}
    </div>
  )
}
