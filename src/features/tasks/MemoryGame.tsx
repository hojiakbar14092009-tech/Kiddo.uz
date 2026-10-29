import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
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
import { LetterIntro } from './LetterIntro'
import { useUnmetLetters } from './useUnmetLetters'
import { letterLessonId } from '@/domain/learning'
import { useLearnStore } from '@/features/learn/learnStore'
import { useChildKey } from '@/store/progressStore'
import { useFinishTask } from './useFinishTask'
import { playableLetters } from './playableLetters'
import { useLearner } from './useHomework'
import { Picture } from '@/components/ui/Picture'
import { MEMORY_PAIRS } from '@/features/age/ageLevel'
import { useAgeLevel } from '@/store/familyStore'

const HIDE_DELAY_MS = 1100
const FINISH_DELAY_MS = 1600

/** “Find the pair”: match each letter card with the card showing its picture. */
export function MemoryGame() {
  const { t } = useTranslation()
  const language = useLanguage()
  const learner = useLearner('memory')
  const level = useAgeLevel()
  const reduceMotion = useReducedMotion() ?? false
  const { react, reset } = useMascot()
  const { sayText, sayLetter, speaking } = useSpeaker()
  const finish = useFinishTask('memory')
  const [pairs] = useState(() => MEMORY_PAIRS[level])

  const [state, dispatch] = useReducer(memoryReducer, undefined, () =>
    createMemoryGame(
      pickTargets(playableLetters(language, 'memory'), learner, pairs, Math.random),
      Math.random,
    ),
  )
  const complete = isMemoryComplete(state)
  // Learn Before Play: the game's letters the child has not met are shown first, one by one
  const childKey = useChildKey()
  const markLesson = useLearnStore((store) => store.markLesson)
  const unmet = useUnmetLetters('memory', learner)
  const [intros] = useState(() => {
    const letters = new Map(state.cards.map((card) => [card.letter.id, card.letter]))
    return [...letters.values()].filter((letter) => unmet.has(letter.id))
  })
  const [introAt, setIntroAt] = useState(0)
  const introducing = intros[introAt]
  // a new letter is said aloud too (a child who cannot read yet hears it)
  useEffect(() => {
    if (!introducing) return
    react(
      'instruct',
      {
        text: t('learnFirst.letterWord', { letter: introducing.upper, word: introducing.word }),
        emoji: introducing.emoji,
      },
      { speak: false },
    )
    void sayText(`${introducing.spoken} — ${introducing.word}`)
  }, [introducing, react, sayText, t])

  // the game's instruction, once the new letters have been met
  const ready = introducing === undefined
  // after the last new letter, keyboard focus moves on to the cards
  const board = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (ready && intros.length > 0) board.current?.querySelector('button')?.focus()
  }, [ready, intros.length])
  useEffect(() => {
    if (!ready) return
    react('instruct', { text: t('task.memoryPrompt'), emoji: '🃏' }, { speak: false })
    void sayText(t('task.memoryPrompt'))
  }, [ready, react, sayText, t])
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
          state.matched,
          state.mistakes,
          intros.map((letter) => letter.id),
        ),
      FINISH_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [complete, finish, intros, state.matched, state.mistakes])

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
      round={Math.min(state.matched.length, pairs - 1)}
      rounds={pairs}
      speaking={speaking}
      onRepeat={() => void sayText(t('task.memoryPrompt'))}
      hint={{ kind: 'memory', letter: state.cards[0]?.letter ?? null }}
      struggling={state.mistakes.length >= 3}
    >
      {introducing ? (
        <LetterIntro
          letter={introducing}
          onGo={() => {
            markLesson(childKey, letterLessonId(language, introducing.id))
            setIntroAt((n) => n + 1)
          }}
        />
      ) : (
        <ul
          ref={board}
          data-testid="memory-board"
          className={clsx(
            'mx-auto grid w-full flex-1 content-center gap-2.5 sm:gap-5',
            // a short landscape phone: two rows of cards fit under the mascot row
            pairs === 3
              ? 'max-w-2xl grid-cols-3 portrait:max-w-lg short:max-w-[calc((100dvh-10rem)*1.2+1rem)]'
              : 'max-w-3xl grid-cols-4 portrait:max-w-xl short:max-w-[calc((100dvh-10rem)*1.6+1.75rem)]',
          )}
        >
          {state.cards.map((card, index) => {
            const matched = state.matched.includes(card.letter.id)
            const faceUp = matched || state.open.includes(index)
            return (
              <li key={card.key} className="[perspective:900px]">
                <motion.button
                  type="button"
                  onClick={() => flip(index, card)}
                  aria-label={
                    faceUp ? `${card.letter.upper} — ${card.letter.word}` : t('task.memoryCard')
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
                    <span className="flex flex-col items-center gap-1 sm:gap-2">
                      <span className="font-display text-[clamp(2rem,6vw,3.75rem)] leading-none font-extrabold">
                        {card.letter.upper}
                      </span>
                      <Picture
                        emoji={card.letter.emoji}
                        className="size-[clamp(3rem,9vw,5.5rem)]"
                      />
                    </span>
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
      )}
    </TaskShell>
  )
}
