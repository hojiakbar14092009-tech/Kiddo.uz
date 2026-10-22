import clsx from 'clsx'
import { useAnimate, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { Language } from '@/content/languages'
import { Img3D } from '@/features/learn/Img3D'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import type { QuestionProps } from './shared'
import { wordDisplay, wordText, type Word } from './content'
import { COPY } from './copy'
import type { BuildQuestion } from './generate'
import { useStable } from './useStable'

const small = (letter: string, language: Language) => letter.toLocaleLowerCase(language)

/** Age 5: tap the letter tiles in order to build the word of the picture. */
export function BuildWord({
  q,
  title,
  step,
  language,
  session,
  onNext,
}: QuestionProps<BuildQuestion>) {
  const { t } = useTranslation()
  const copy = COPY[language]
  const reduceMotion = useReducedMotion() ?? false
  const { say } = useLearnMascot()
  const [placed, setPlaced] = useState<string[]>([])
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const [mistakes, setMistakes] = useState(0)
  const [hint, setHint] = useState(false)
  const filled = placed.length
  const done = filled === q.word.letters.length
  const display = wordDisplay(q.word, language)

  const instruct = useStable(() => say('instruct', { text: copy.build, emoji: '🧩' }))
  useEffect(() => instruct(), [instruct])

  const tap = (tileId: string) => {
    if (done || placed.includes(tileId)) return
    const tile = q.tiles.find((item) => item.id === tileId)!
    const expected = q.word.letters[filled]!
    if (tile.letter === expected) {
      const next = [...placed, tileId]
      setPlaced(next)
      setHint(false)
      if (next.length === q.word.letters.length) {
        // right when no wrong tile was tapped before (the first answer stays)
        session.answer(q, wordText(q.word), true)
        say('correct', { text: copy.built(display), emoji: '🌟' })
      }
      return
    }
    const errorType = q.word.letters.slice(filled).includes(tile.letter)
      ? 'letter-order'
      : 'wrong-letter'
    session.answer(
      q,
      `${placed.map((id) => q.tiles.find((item) => item.id === id)!.letter).join('')}${tile.letter}`,
      false,
      errorType,
    )
    setMistakes((count) => count + 1)
    if (!reduceMotion) {
      void animate(`[data-tile="${tileId}"]`, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45 })
    }
    say('wrong', { text: copy.wrongTile, emoji: '💪' })
  }

  const expected = q.word.letters[filled]
  const hintTile = hint
    ? q.tiles.find((tile) => !placed.includes(tile.id) && tile.letter === expected)?.id
    : undefined

  return (
    <LearnShell
      title={title}
      step={step}
      speak={[copy.build]}
      help={{
        text: copy.buildHelp,
        glow: mistakes > 0 && !done,
        onOpen: () => {
          session.help(q)
          setHint(true)
        },
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-6">
        <Img3D
          name={q.word.picture}
          alt={display}
          className="size-32 max-h-[24vh] sm:size-44"
          eager
        />
        <p className="text-center font-display text-xl font-bold sm:text-2xl">{copy.build}</p>
        <Slots
          letters={q.word.letters.map((letter, index) =>
            index < filled ? small(letter, language) : null,
          )}
          language={language}
          done={done}
        />
        {!done && (
          <div
            ref={scope}
            className="flex flex-wrap justify-center gap-3 sm:gap-4"
            role="group"
            aria-label={copy.build}
          >
            {q.tiles.map((tile) => {
              const used = placed.includes(tile.id)
              return (
                <button
                  key={tile.id}
                  type="button"
                  disabled={used}
                  onClick={() => tap(tile.id)}
                  aria-label={small(tile.letter, language)}
                  data-testid="words-tile"
                  data-tile={tile.id}
                  data-letter={tile.letter}
                  className={clsx(
                    'flex size-20 items-center justify-center rounded-[24px] font-display text-5xl font-extrabold transition-opacity sm:size-24 sm:text-6xl',
                    used
                      ? 'bg-line opacity-30'
                      : 'bg-white shadow-[0_6px_0_var(--color-line)] active:translate-y-1',
                    hintTile === tile.id && 'ring-4 ring-coin motion-safe:animate-pulse',
                  )}
                >
                  {small(tile.letter, language)}
                </button>
              )
            })}
          </div>
        )}
        {done && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-lg" role="status">
              {copy.built(display)}
            </p>
            <Button onClick={onNext} data-testid="words-next" autoFocus>
              {t('learn.next')}
            </Button>
          </div>
        )}
      </div>
    </LearnShell>
  )
}

function Slots({
  letters,
  language,
  done,
}: {
  letters: (string | null)[]
  language: Language
  done: boolean
}) {
  return (
    <div className="flex gap-2 sm:gap-3" lang={language} aria-live="polite">
      {letters.map((letter, index) => (
        <span
          key={index}
          className={clsx(
            'flex size-16 items-center justify-center rounded-[20px] border-4 font-display text-4xl font-extrabold sm:size-20 sm:text-5xl',
            letter
              ? done
                ? 'border-primary bg-primary-soft text-primary-ink'
                : 'border-sky bg-sky-soft'
              : 'border-dashed border-line-strong bg-surface',
          )}
        >
          {letter ?? ''}
        </span>
      ))}
    </div>
  )
}

/**
 * Age 5 learning starts with a worked example: the mascot builds a word letter
 * by letter, then the child goes on alone. It is not counted as an answer.
 */
export function BuildExample({
  title,
  word,
  language,
  onDone,
}: {
  title: string
  word: Word
  language: Language
  onDone: () => void
}) {
  const copy = COPY[language]
  const reduceMotion = useReducedMotion() ?? false
  const { say } = useLearnMascot()
  const [shown, setShown] = useState(reduceMotion ? word.letters.length : 0)
  const display = wordDisplay(word, language)

  const intro = useStable(() => say('instruct', { text: copy.exampleTitle(display), emoji: '👀' }))
  useEffect(() => intro(), [intro])

  useEffect(() => {
    if (shown >= word.letters.length) return
    const timer = window.setTimeout(() => setShown((count) => count + 1), shown === 0 ? 1200 : 900)
    return () => window.clearTimeout(timer)
  }, [shown, word.letters.length])

  const done = shown >= word.letters.length
  return (
    <LearnShell
      title={title}
      speak={[copy.exampleTitle(display)]}
      help={{ text: copy.exampleTitle(display) }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-6">
        <Img3D
          name={word.picture}
          alt={display}
          className="size-32 max-h-[24vh] sm:size-44"
          eager
        />
        <p className="text-center font-display text-xl font-bold sm:text-2xl">
          {copy.exampleTitle(display)}
        </p>
        <Slots
          letters={word.letters.map((letter, index) =>
            index < shown ? small(letter, language) : null,
          )}
          language={language}
          done={done}
        />
        <Button
          variant={done ? 'primary' : 'soft'}
          onClick={onDone}
          data-testid="words-example-go"
          autoFocus={done}
        >
          {copy.exampleGo}
        </Button>
      </div>
    </LearnShell>
  )
}
