import { useCallback, useEffect, useRef, useState } from 'react'
import { HomeIcon } from '@/components/icons'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { StepDots } from '@/components/ui/Progress'
import { useChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import type { FeelingId } from '@/features/feelings/content'
import { FeelingFace } from '@/features/feelings/FeelingFace'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { shuffle } from '@/features/learn/random'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { pickQuestions, storyActivity, type PickedQuestion } from './engine'
import { STORIES_ROOT } from './StoryLibrary'
import { StoryFrame } from './StoryFrame'
import type { AnswerPicture, StorySpec, StoryText } from './types'
import type { StoriesUi } from './ui'

/** How long the praise stays before the next question (not a time limit). */
export const NEXT_QUESTION_MS = 1100

function AnswerArt({ picture }: { picture: AnswerPicture }) {
  if (picture.startsWith('face:')) {
    return <FeelingFace feeling={picture.slice(5) as FeelingId} className="size-[58%]" />
  }
  return <Img3D name={picture} className="size-[58%]" eager />
}

interface Finished {
  correct: number
  total: number
  award: Pick<AwardSummary, 'stars' | 'crystals' | 'scrolls'>
}

/**
 * The questions after a story (their kind follows the child's 'language'
 * level, see `pickQuestions`): picture answers, the first try counts, a
 * later try only finishes the question. When the last one is right the
 * reading is counted in the universe – once, at the level it was played at.
 */
export function StoryQuestions({
  story,
  text,
  ui,
  reading,
  onAgain,
}: {
  story: StorySpec
  text: StoryText
  ui: StoriesUi
  /** The how-many-th reading: other questions and wrong answers each time. */
  reading: number
  onAgain: () => void
}) {
  const childKey = useChildKey()
  const currentLevel = useChallengeLevel('language')
  const [level] = useState<ChallengeLevel>(currentLevel)
  const [questions] = useState<PickedQuestion[]>(() =>
    pickQuestions(story, level, reading).map((q) => ({ ...q, options: shuffle(q.options) })),
  )
  const [runId] = useState(newId)
  const [index, setIndex] = useState(0)
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [firstTry, setFirstTry] = useState(0)
  const [finished, setFinished] = useState<Finished | null>(null)
  const missed = useRef(false)
  const emitted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { say } = useLearnMascot()
  const question = questions[index]
  const words = question ? text.questions[question.id] : undefined
  const spec = question ? story.questions.find((q) => q.id === question.id) : undefined

  // the speaker button reads exactly the question on screen
  useSpeakable(finished ? null : [words?.prompt], SPEAK_PRIORITY.content)

  useEffect(() => () => clearTimeout(timer.current), [])

  // the question itself is the heading below; the bubble only sets the scene (no double text)
  useEffect(() => {
    if (finished) return
    say('instruct', { text: ui.questionsTitle, emoji: '🤔' })
  }, [finished, say, ui.questionsTitle])

  const finish = useCallback(
    (correct: number) => {
      if (emitted.current) return
      emitted.current = true
      let award: Finished['award'] = { stars: 0, crystals: 0, scrolls: 0 }
      try {
        award = emitActivity(
          storyActivity(runId, childKey, story.id, level, {
            total: questions.length,
            firstTry: correct,
          }),
        )
      } catch {
        // the child still sees the praise; the universe keeps its own state
      }
      setFinished({ correct, total: questions.length, award })
    },
    [childKey, level, questions.length, runId, story.id],
  )

  if (finished) {
    return <StoryResult title={text.title} ui={ui} finished={finished} onAgain={onAgain} />
  }
  if (!question || !words || !spec) return null

  const labelOf = (picture: AnswerPicture) => words.options[spec.options.indexOf(picture)] ?? ''

  const pickAnswer = (picture: string) => {
    if (Object.values(statuses).includes('correct')) return
    const right = picture === spec.options[0]
    if (!right) {
      missed.current = true
      setStatuses((current) => ({ ...current, [picture]: 'wrong' }))
      say('wrong')
      return
    }
    const score = firstTry + (missed.current ? 0 : 1)
    setFirstTry(score)
    setStatuses((current) => ({ ...current, [picture]: 'correct' }))
    say('correct')
    const last = index + 1 >= questions.length
    // counted the moment the last answer is right, so leaving during the praise loses nothing
    if (last) finish(score)
    timer.current = setTimeout(() => {
      if (last) return
      missed.current = false
      setStatuses({})
      setIndex(index + 1)
    }, NEXT_QUESTION_MS)
  }

  return (
    <StoryFrame title={text.title} back={STORIES_ROOT} speak={[words.prompt]} hideMascotShort>
      <section
        aria-labelledby="story-question"
        data-testid="story-question"
        data-question={question.id}
        data-kind={question.kind}
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 short:gap-2"
      >
        <StepDots
          current={index}
          total={questions.length}
          label={ui.question(index + 1, questions.length)}
        />
        <h2
          id="story-question"
          className="text-center font-display text-2xl font-extrabold sm:text-3xl short:text-xl"
          aria-live="polite"
        >
          {words.prompt}
        </h2>
        <ChoiceGrid
          key={question.id}
          className="short:max-w-md"
          choices={question.options.map((picture) => ({
            id: picture,
            label: labelOf(picture),
            content: (
              <>
                <AnswerArt picture={picture} />
                <span className="text-center text-sm leading-tight font-bold sm:text-lg short:text-xs">
                  {labelOf(picture)}
                </span>
              </>
            ),
          }))}
          statuses={statuses}
          onChoose={pickAnswer}
        />
      </section>
    </StoryFrame>
  )
}

/** The gentle end: praise, what the universe gave (stars, crystals, the story's scroll), read again. */
function StoryResult({
  title,
  ui,
  finished,
  onAgain,
}: {
  title: string
  ui: StoriesUi
  finished: Finished
  onAgain: () => void
}) {
  const { say } = useLearnMascot()
  const score = ui.score(finished.correct, finished.total)
  const all = finished.correct === finished.total

  useEffect(() => {
    say('celebrate', { text: ui.resultTitle, emoji: all ? '🏆' : '🌟' })
    window.scrollTo?.({ top: 0 })
  }, [all, say, ui.resultTitle])

  return (
    <StoryFrame title={title} back={STORIES_ROOT} speak={[ui.resultTitle, score]} hideMascotShort>
      <section
        data-testid="story-result"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-panel bg-surface p-5 text-center shadow-press-lg sm:p-8 short:grid short:max-w-3xl short:grid-cols-[auto_1fr] short:items-center short:gap-x-4 short:gap-y-2 short:p-3"
      >
        <div className="flex flex-col items-center gap-2 short:gap-1">
          <h2 className="flex items-center gap-2 font-display text-3xl font-extrabold short:text-2xl">
            <Img3D name={all ? 'trophy' : 'glowing-star'} className="size-14 short:size-10" eager />
            {ui.resultTitle}
          </h2>
          <p className="font-display text-xl font-bold text-primary-ink" data-testid="story-score">
            {score}
          </p>
        </div>
        <ActivityReward
          stars={finished.award.stars}
          crystals={finished.award.crystals}
          scrolls={finished.award.scrolls}
        />
        <div className="flex flex-wrap justify-center gap-3 short:col-span-2">
          <Button variant="coin" size="md" onClick={onAgain} data-testid="story-again">
            {ui.readAgain}
          </Button>
          <LinkButton to={STORIES_ROOT} variant="soft" size="md" icon={<HomeIcon size={24} />}>
            {ui.toLibrary}
          </LinkButton>
        </div>
      </section>
    </StoryFrame>
  )
}
