import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { LearnResult } from '@/features/learn/LearnResult'
import { getLearnChild, stageKey, stagesTaught, useLearnStore } from '@/features/learn/learnStore'
import { orderOf } from '@/features/learn/review'
import { useLearnSession, type FinishedSession } from '@/features/learn/useLearnSession'
import { LearnShell } from '@/features/learn/LearnShell'
import { useChildKey } from '@/store/progressStore'
import { focusStage } from '@/features/homework/activityHomework'
import { LESSONS, type AgeLevel } from './content'
import { testQuestions, type SpaceQuestion } from './questions'
import { QuestionBoard } from './QuestionBoard'
import { useSpaceLanguage, useSpaceText } from './useSpaceText'
import { OrderStrip } from './views'

/** The short check: 3, 4 or 5 questions about what was taught, answered on the child's own. */
export function SpaceTest({
  level: childLevel,
  focus,
  onAgain,
  onExit,
}: {
  level: AgeLevel
  /** A homework's lesson: only its things are asked, saved as its own check. */
  focus?: string
  onAgain: () => void
  onExit: () => void
}) {
  const lesson = focus ? LESSONS.find((item) => item.stage === focus) : undefined
  // a homework lesson keeps its own level (a parent may give a lesson of another age)
  const level = lesson ? lesson.level : childLevel
  const { t } = useTranslation()
  const language = useSpaceLanguage()
  const text = useSpaceText()
  const childKey = useChildKey()
  const setLastOrder = useLearnStore((state) => state.setLastOrder)
  const orderKey = `${stageKey('space', language)}|${lesson ? focusStage(lesson.stage) : `test-${level}`}`
  const [questions] = useState<SpaceQuestion[]>(() => {
    const learn = getLearnChild(childKey)
    return testQuestions(
      level,
      language,
      lesson ? [lesson.stage] : stagesTaught(learn, 'space', language),
      learn,
      learn.lastOrder[orderKey],
    )
  })
  const session = useLearnSession({
    section: 'space',
    language,
    stage: lesson ? focusStage(lesson.stage) : `test-${level}`,
    mode: 'test',
  })
  const [index, setIndex] = useState(0)
  const [stuck, setStuck] = useState(0)
  const [result, setResult] = useState<FinishedSession | null>(null)

  useEffect(() => {
    setLastOrder(
      childKey,
      orderKey,
      orderOf(questions, (q) => q.id),
    )
  }, [childKey, orderKey, questions, setLastOrder])

  const question = questions[index]

  return (
    <LearnShell
      title={t('learn.testMode')}
      themeClassName="learn-space"
      step={result ? undefined : { current: index, total: questions.length }}
      help={
        question && !result
          ? {
              text: question.help,
              visual: question.helpOrder ? <OrderStrip /> : undefined,
              glow: stuck >= 2,
              onOpen: () => session.help(question),
            }
          : undefined
      }
    >
      {question && !result && (
        <QuestionBoard
          key={question.id}
          question={question}
          level={level}
          mode="test"
          session={session}
          onWrong={() => setStuck((count) => count + 1)}
          onSolved={() => {
            setStuck(0)
            if (index + 1 < questions.length) setIndex(index + 1)
            else setResult(session.finish(questions.length))
          }}
        />
      )}
      {result && (
        <div className="flex flex-col items-center gap-4">
          <LearnResult result={result} onAgain={onAgain} />
          <Button variant="soft" size="md" onClick={onExit}>
            {text.ui.title}
          </Button>
        </div>
      )}
    </LearnShell>
  )
}
