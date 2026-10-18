import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { HomeIcon, TrophyIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { getAlphabet } from '@/content/alphabet'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { ChoiceRounds } from '@/features/tasks/ChoiceGame'
import { isFinalTestUnlocked } from '@/features/tasks/rules'
import { useActiveChild } from '@/store/familyStore'
import {
  useChildKey,
  useProgress,
  useProgressStore,
  type MistakeDetail,
  type TaskOutcome,
} from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { CertificateCard } from './CertificateCard'
import {
  EXAM_ROUNDS,
  examPassed,
  examProgress,
  firstTryCorrect,
  generateExamRounds,
  latestPassedExam,
} from './exam'

type Phase =
  | { kind: 'intro' }
  | { kind: 'playing' }
  | { kind: 'result'; outcome: TaskOutcome; correct: number; passedAt: string }

/** `/exam`: the big test – ten pictures from the whole alphabet, then a certificate. */
export function ExamPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useLanguage()
  const child = useActiveChild()
  const childKey = useChildKey()
  const progress = useProgress()
  const completeTask = useProgressStore((state) => state.completeTask)
  const { react, reset } = useMascot()
  const { letters } = getAlphabet(language)
  const { learned, total } = examProgress(letters, progress.learned[language] ?? [])
  const unlocked = isFinalTestUnlocked(learned, total)
  const previous = latestPassedExam(progress.results, language)
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const [rounds, setRounds] = useState(() => generateExamRounds(letters))
  const name = child?.name ?? t('exam.certificate.guestName')

  useEffect(() => {
    if (phase.kind !== 'intro') return
    react(
      'greet',
      unlocked
        ? { text: t('exam.ready'), emoji: '🏆' }
        : { text: t('exam.lockedMascot', { count: total - learned }), emoji: '💪' },
    )
  }, [learned, phase.kind, react, t, total, unlocked])
  useEffect(() => reset, [reset])

  const finish = (letterIds: string[], mistakes: MistakeDetail[]) => {
    const outcome = completeTask(childKey, {
      type: 'exam',
      language,
      letterIds,
      mistakeDetails: mistakes,
    })
    if (examPassed(outcome.mistakes)) react('celebrate')
    else react('greet', { text: t('exam.notYet'), emoji: '💪' })
    setPhase({
      kind: 'result',
      outcome,
      correct: firstTryCorrect(mistakes),
      passedAt: new Date().toISOString(),
    })
  }

  if (phase.kind === 'playing') {
    return (
      <ChoiceRounds type="find-picture" rounds={rounds} title={t('exam.title')} onFinish={finish} />
    )
  }

  const startAgain = () => {
    setRounds(generateExamRounds(letters))
    setPhase({ kind: 'playing' })
  }

  return (
    <Screen header={<TopBar />} className="items-center gap-6 px-4 py-6 text-center">
      <Mascot robotClassName="w-32 sm:w-44" className="max-w-xl" />

      {phase.kind === 'result' ? (
        <ExamResult
          passed={examPassed(phase.outcome.mistakes)}
          outcome={phase.outcome}
          correct={phase.correct}
          name={name}
          language={language}
          passedAt={phase.passedAt}
          onAgain={startAgain}
          onHome={() => navigate('/home')}
        />
      ) : (
        <>
          <h1 className="flex items-center gap-3 font-display text-4xl font-extrabold sm:text-5xl">
            <TrophyIcon size={44} aria-hidden="true" />
            {t('exam.title')}
          </h1>
          {unlocked ? (
            <>
              <p className="max-w-md text-xl text-ink-soft">
                {t('exam.intro', { count: EXAM_ROUNDS })}
              </p>
              <Button onClick={() => setPhase({ kind: 'playing' })}>{t('exam.start')}</Button>
            </>
          ) : (
            <>
              <p className="max-w-md text-xl text-ink-soft">{t('exam.locked')}</p>
              <ProgressBar
                value={learned}
                max={total}
                label={t('exam.progress', { learned, total })}
              />
              <Button
                variant="soft"
                icon={<HomeIcon size={26} />}
                onClick={() => navigate('/home')}
              >
                {t('reward.home')}
              </Button>
            </>
          )}
          {previous && (
            <CertificateCard
              name={name}
              language={language}
              correct={firstTryCorrect(previous.mistakeDetails)}
              passedAt={previous.finishedAt}
            />
          )}
        </>
      )}
    </Screen>
  )
}

interface ExamResultProps {
  passed: boolean
  outcome: TaskOutcome
  correct: number
  name: string
  language: ReturnType<typeof useLanguage>
  passedAt: string
  onAgain: () => void
  onHome: () => void
}

function ExamResult({
  passed,
  outcome,
  correct,
  name,
  language,
  passedAt,
  onAgain,
  onHome,
}: ExamResultProps) {
  const { t } = useTranslation()
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
        {passed ? t('exam.passedTitle') : t('exam.notYetTitle')}
      </h1>
      <p className="max-w-md text-xl text-ink-soft">
        {passed ? t('exam.passedText') : t('exam.notYetText')}
      </p>
      <p className="font-display text-2xl font-bold">
        {t('reward.coins', { count: outcome.coins + outcome.bonus })}
      </p>
      {passed && (
        <CertificateCard name={name} language={language} correct={correct} passedAt={passedAt} />
      )}
      <div className="flex flex-wrap justify-center gap-4">
        <Button variant="soft" icon={<HomeIcon size={26} />} onClick={onHome}>
          {t('reward.home')}
        </Button>
        {!passed && <Button onClick={onAgain}>{t('exam.again')}</Button>}
      </div>
    </>
  )
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="h-6 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(value / Math.max(1, max)) * 100}%` }}
        />
      </div>
      <p className="font-semibold">{label}</p>
    </div>
  )
}
