import { useTranslation } from 'react-i18next'
import type { ChallengeLevel } from '@/domain/learner/profile'
import { LessonDeck, type LessonCard } from '@/features/learn/LessonDeck'
import { hasSeenLesson, useLearnChild } from '@/features/learn/learnStore'
import { useLanguage } from '@/store/settingsStore'
import { ChoicePicture } from './ChoicePicture'
import { FEELING_TEXT } from './content'
import { FeelingFace } from './FeelingFace'
import { feelingsLessonId, feelingsToTeach, KIND_DEEDS } from './feelingsLessonPlan'
import { levelPlan, type ScoredKind } from './session'

/**
 * Learn Before Play for feelings (Phase 21, full contract): before the child
 * is asked to find a face or a kind deed, KidoBot shows each feeling of the
 * child's level and how to recognise it, or what kind deeds look like. A
 * short check at the end (LessonDeck), then the game.
 */
export function FeelingsLesson({
  kind,
  level,
  onDone,
}: {
  kind: ScoredKind
  level: ChallengeLevel
  onDone: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const learn = useLearnChild()
  const neutral = levelPlan(level).neutralFaces
  const cards: LessonCard[] =
    kind === 'kindness'
      ? KIND_DEEDS.map((deed) => ({
          id: deed.id,
          art: <ChoicePicture id={deed.picture} className="h-36 w-auto sm:h-44" />,
          thumb: <ChoicePicture id={deed.picture} className="size-full" />,
          title: t(`feelings.lesson.kindness.${deed.id}.title`),
          lines: [t(`feelings.lesson.kindness.${deed.id}.text`)],
        }))
      : feelingsToTeach(level, (id) => hasSeenLesson(learn, id)).map((feeling) => ({
          id: feeling,
          // from level 3 the game paints every face one colour: the lesson does too
          art: <FeelingFace feeling={feeling} neutral={neutral} className="size-40 sm:size-48" />,
          thumb: <FeelingFace feeling={feeling} neutral={neutral} className="size-full" />,
          title: FEELING_TEXT[feeling].label[language],
          lines: [FEELING_TEXT[feeling].clue[language]],
        }))
  return <LessonDeck lessonId={feelingsLessonId(kind, level)} cards={cards} onDone={onDone} />
}
