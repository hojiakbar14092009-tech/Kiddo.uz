import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { getAlphabet } from '@/content/alphabet'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { pickTargets } from './generateRounds'
import {
  createMemoryGame,
  isMemoryComplete,
  judgeFlip,
  memoryReducer,
  type MemoryCard,
} from './memory'
import { TaskShell } from './TaskShell'
import { useFinishTask } from './useFinishTask'

const PAIRS = 4
const HIDE_DELAY_MS = 1100
const FINISH_DELAY_MS = 1600

/** “Find the pair”: match each letter card with the card showing its picture. */
export function MemoryGame() {
  const { t } = useTranslation()
  const language = useLanguage()
  const progress = useProgress()
  const reduceMotion = useReducedMotion() ?? false
  const { react, reset } = useMascot()
  const { sayText, sayLetter, speaking } = useSpeaker()
  const finish = useFinishTask('memory')

  const [state, dispatch] = useReducer(memoryReducer, undefined, () =>
    createMemoryGame(
      pickTargets(
        getAlphabet(language).letters,
        {
          learned: progress.learned[language] ?? [],
          struggles: progress.struggles[language] ?? {},
        },
        PAIRS,
        Math.random,
      ),
      Math.random,
    ),
  )
  const complete = isMemoryComplete(state)

  useEffect(() => {
    react('instruct', { text: t('task.memoryPrompt'), emoji: '🃏' }, { speak: false })
    void sayText(t('task.memoryPrompt'))
  }, [react, sayText, t])
  useEffect(() => reset, [reset])

  // Two different cards stay visible for a moment, then turn back over.
  useEffect(() => {
    if (state.open.length < 2) return undefined
    const timer = setTimeout(() => dispatch({ type: 'hide' }), HIDE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.open])

  useEffect(() => {
    if (!complete) return undefined
    const timer = setTimeout(
      () =>
        finish(
          state.cards.filter((card) => card.face === 'letter').map((card) => card.letter.id),
          state.mistakes,
        ),
      FINISH_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [complete, finish, state.cards, state.mistakes])

  const flip = (index: number, card: MemoryCard) => {
    const verdict = judgeFlip(state, index)
    if (verdict === 'ignored') return
    dispatch({ type: 'flip', index })
    if (verdict === 'match') react('correct')
    else if (verdict === 'mismatch') react('wrong')
    else void sayLetter(card.letter)
  }

  return (
    <TaskShell
      title={t('task.memoryTitle')}
      round={Math.min(state.matched.length, PAIRS - 1)}
      rounds={PAIRS}
      speaking={speaking}
      onRepeat={() => void sayText(t('task.memoryPrompt'))}
    >
      <ul className="mx-auto grid w-full max-w-3xl flex-1 grid-cols-4 content-center gap-2.5 sm:gap-5 portrait:max-w-xl">
        {state.cards.map((card, index) => {
          const matched = state.matched.includes(card.letter.id)
          const faceUp = matched || state.open.includes(index)
          return (
            <li key={card.key} className="[perspective:900px]">
              <motion.button
                type="button"
                onClick={() => flip(index, card)}
                aria-label={
                  faceUp
                    ? card.face === 'letter'
                      ? card.letter.upper
                      : card.letter.word
                    : t('task.memoryCard')
                }
                aria-pressed={faceUp}
                animate={{ rotateY: faceUp ? 0 : 180 }}
                transition={
                  reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22 }
                }
                className={clsx(
                  'relative flex aspect-[4/5] w-full items-center justify-center rounded-[28px] [transform-style:preserve-3d]',
                  faceUp
                    ? matched
                      ? 'bg-primary-soft shadow-[0_6px_0_#B5E3D2]'
                      : 'bg-surface shadow-[0_6px_0_var(--color-line)]'
                    : 'bg-primary shadow-[0_6px_0_var(--color-primary-shadow)]',
                )}
              >
                {faceUp ? (
                  card.face === 'letter' ? (
                    <span className="font-display text-[clamp(3rem,9vw,5rem)] leading-none font-extrabold">
                      {card.letter.upper}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="text-[clamp(3rem,9vw,5rem)] leading-none">
                      {card.letter.emoji}
                    </span>
                  )
                ) : (
                  <span
                    aria-hidden="true"
                    className="font-display text-5xl font-extrabold text-white/80 [transform:rotateY(180deg)]"
                  >
                    ?
                  </span>
                )}
              </motion.button>
            </li>
          )
        })}
      </ul>
    </TaskShell>
  )
}
