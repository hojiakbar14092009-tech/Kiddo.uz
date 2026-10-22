import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { Language } from '@/content/languages'
import { ChoiceGrid, type Choice, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { Img3D } from '@/features/learn/Img3D'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { wordDisplay } from './content'
import { COPY } from './copy'
import {
  choiceIds,
  correctChoice,
  ERROR_TYPE,
  type BuildQuestion,
  type WordQuestion,
} from './generate'
import { letterIn, type QuestionProps } from './shared'

type ChoiceKind = Exclude<WordQuestion, BuildQuestion>
import { useStable } from './useStable'

/** Questions answered by choosing one card: ages 4 and 6. */
export function ChoiceQuestion({
  q,
  title,
  step,
  mode,
  language,
  session,
  onNext,
}: QuestionProps<ChoiceKind>) {
  const { t } = useTranslation()
  const copy = COPY[language]
  const { say } = useLearnMascot()
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [solved, setSolved] = useState(false)
  const [stuck, setStuck] = useState(false)
  const right = correctChoice(q)

  const prompt =
    q.kind === 'pick-picture'
      ? copy.pickPicture(q.letter)
      : q.kind === 'pick-letter'
        ? copy.pickLetter
        : q.kind === 'read-word'
          ? copy.readWord
          : q.kind === 'read-sentence'
            ? copy.readSentence
            : copy.missing
  const helpText =
    q.kind === 'pick-picture'
      ? copy.pickPictureHelp(q.letter)
      : q.kind === 'pick-letter'
        ? copy.pickLetterHelp
        : q.kind === 'read-word'
          ? copy.readWordHelp
          : q.kind === 'read-sentence'
            ? copy.readSentenceHelp
            : copy.missingHelp
  const explanation =
    q.kind === 'pick-picture' || q.kind === 'pick-letter'
      ? copy.startsWith(wordDisplay(q.target, language), q.letter)
      : q.kind === 'read-sentence'
        ? copy.sentenceIs(q.sentence.text)
        : copy.wordIs(wordDisplay(q.word, language))

  const instruct = useStable(() => say('instruct', { text: prompt, emoji: '👀' }))
  useEffect(() => instruct(), [instruct])

  const choose = (id: string) => {
    if (solved) return
    const correct = id === right
    session.answer(q, id, correct, correct ? null : ERROR_TYPE[q.kind])
    if (correct || mode === 'test') {
      setStatuses((old) => ({
        ...old,
        [id]: correct ? 'correct' : 'wrong',
        [right]: 'correct',
      }))
      setSolved(true)
      say(
        correct ? 'correct' : 'instruct',
        {
          text: correct ? `${copy.correct} ${explanation}` : explanation,
          emoji: correct ? '🌟' : '👉',
        },
        explanation,
      )
    } else {
      setStatuses((old) => ({ ...old, [id]: 'wrong' }))
      setStuck(true)
      say('wrong', { text: copy.tryAgain, emoji: '💪' }, copy.tryAgain)
    }
  }

  const openHelp = () => {
    session.help(q)
    setStuck(false)
    if (mode === 'learn' && !solved)
      setStatuses((old) => ({ ...old, [right]: old[right] ?? 'hint' }))
  }

  const choices: Choice[] = choiceIds(q).map((id, index) => ({
    id,
    label: optionLabel(q, id, index, language),
    content: optionContent(q, id, language),
  }))
  const cols = choices.length === 2 ? 'max-w-[min(30rem,62vh)]' : 'max-w-[min(40rem,70vh)]'

  return (
    <LearnShell
      title={title}
      step={step}
      speak={[prompt]}
      help={{
        text: helpText,
        glow: stuck,
        onOpen: openHelp,
        visual: <HelpVisual q={q} language={language} />,
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-6">
        <Prompt q={q} language={language} solved={solved} />
        <p className="text-center font-display text-xl font-bold sm:text-2xl" id={`${q.id}-prompt`}>
          {prompt}
        </p>
        <ChoiceGrid
          choices={choices}
          statuses={statuses}
          onChoose={choose}
          disabled={solved}
          className={cols}
          cardClassName={
            q.kind === 'pick-letter' || q.kind === 'missing' ? 'font-display' : undefined
          }
        />
        {solved && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-lg" role="status">
              {explanation}
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

function Prompt({ q, language, solved }: { q: ChoiceKind; language: Language; solved: boolean }) {
  switch (q.kind) {
    case 'pick-picture':
      return <BigLetter>{q.letter}</BigLetter>
    case 'pick-letter':
      return (
        <Img3D
          name={q.target.picture}
          alt={wordDisplay(q.target, language)}
          className="size-32 max-h-[24vh] sm:size-44"
          eager
        />
      )
    case 'read-word':
      return (
        <p
          className="rounded-[28px] bg-surface px-8 py-4 font-display text-5xl font-extrabold tracking-wide shadow-[0_6px_0_var(--color-line)] sm:text-6xl"
          lang={language}
        >
          {wordDisplay(q.word, language)}
        </p>
      )
    case 'read-sentence':
      return (
        <p
          className="rounded-[28px] bg-surface px-6 py-4 text-center font-display text-3xl font-extrabold shadow-[0_6px_0_var(--color-line)] sm:text-4xl"
          lang={language}
        >
          {q.sentence.text}
        </p>
      )
    case 'missing':
      return (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          <Img3D name={q.word.picture} className="size-28 max-h-[22vh] sm:size-36" eager />
          <p
            className="flex items-end gap-1 font-display text-5xl font-extrabold sm:text-6xl"
            lang={language}
          >
            {q.word.letters.map((letter, index) =>
              index === q.index ? (
                <span
                  key={index}
                  className={
                    solved
                      ? 'rounded-2xl bg-primary-soft px-2 text-primary-ink'
                      : 'inline-block min-w-[1.2em] rounded-2xl border-4 border-dashed border-coin px-2 text-center text-transparent'
                  }
                  aria-label={solved ? undefined : '?'}
                >
                  {solved ? letterIn(letter, index, language) : '?'}
                </span>
              ) : (
                <span key={index}>{letterIn(letter, index, language)}</span>
              ),
            )}
          </p>
        </div>
      )
  }
}

function BigLetter({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-32 items-center justify-center rounded-[36px] bg-coin-soft font-display text-8xl font-extrabold shadow-[0_8px_0_var(--color-line)] sm:size-40 sm:text-9xl">
      {children}
    </span>
  )
}

function optionLabel(q: ChoiceKind, id: string, index: number, language: Language): string {
  switch (q.kind) {
    case 'pick-picture': {
      const word = q.options.find((option) => option.id === id)
      return word ? wordDisplay(word, language) : id
    }
    case 'missing':
      return letterIn(id, q.index, language)
    case 'pick-letter':
      return id
    default:
      // reading tasks: the picture is the answer, so its name is not read out
      return `${index + 1}`
  }
}

function optionContent(q: ChoiceKind, id: string, language: Language): ReactNode {
  switch (q.kind) {
    case 'pick-picture': {
      const word = q.options.find((option) => option.id === id)!
      return <Img3D name={word.picture} className="size-4/5" eager />
    }
    case 'read-word':
    case 'read-sentence':
      return <Img3D name={id} className="size-4/5" eager />
    case 'pick-letter':
      return <span className="font-display text-7xl font-extrabold sm:text-8xl">{id}</span>
    case 'missing':
      return (
        <span className="font-display text-6xl font-extrabold sm:text-7xl">
          {letterIn(id, q.index, language)}
        </span>
      )
  }
}

/** A picture under the help text: never the answer itself. */
function HelpVisual({ q, language }: { q: ChoiceKind; language: Language }) {
  switch (q.kind) {
    case 'pick-picture':
      return <BigLetter>{q.letter}</BigLetter>
    case 'pick-letter':
      return <Img3D name={q.target.picture} className="size-28" />
    case 'read-word':
      return (
        <p className="flex gap-2 font-display text-4xl font-extrabold" lang={language}>
          {q.word.letters.map((letter, index) => (
            <span key={index} className="rounded-2xl bg-sky-soft px-2">
              {letterIn(letter, index, language)}
            </span>
          ))}
        </p>
      )
    case 'read-sentence':
      return (
        <p className="font-display text-3xl font-extrabold" lang={language}>
          {q.sentence.text.split(' ').map((part, index) => (
            <span key={index}>
              {index > 0 && ' '}
              <span
                className={
                  part.replace(/[.!?]$/, '') === q.sentence.focus
                    ? 'rounded-2xl bg-coin-soft px-2'
                    : undefined
                }
              >
                {part}
              </span>
            </span>
          ))}
        </p>
      )
    case 'missing':
      return <Img3D name={q.word.picture} className="size-28" />
  }
}
