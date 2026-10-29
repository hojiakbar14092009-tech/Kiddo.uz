import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { RoamingMascot } from '@/features/mascot/RoamingMascot'
import { getAlphabet } from '@/content/alphabet'
import { examProgress } from '@/features/exam/exam'
import { ParentAreaLink } from '@/features/parent/ParentAreaLink'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { GAME_META } from '@/features/tasks/gameMeta'
import { dayKey, isFinalTestUnlocked } from '@/features/tasks/rules'
import { usePendingActivityHomework, usePendingHomework } from '@/features/tasks/useHomework'
import { ActivityHomeworkCard } from './ActivityHomeworkCard'
import { useActiveChild, useAgeLevel, useFamilyStore, useMascotModel } from '@/store/familyStore'
import { EXAM_MIN_LEVEL, GAME_MIN_LEVEL, isGameOpen, type AgeLevel } from '@/features/age/ageLevel'
import { AppIcon, type AppIconName } from '@/features/age/AppIcon'
import { UnlockCelebration } from '@/features/age/UnlockCelebration'
import { GAME_TYPES } from '@/features/tasks/games'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { useState } from 'react'
import { useProgress, useWearing } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { dailyPlanState } from './dailyPlan'
import { HomeworkCard } from './HomeworkCard'
import { JourneyPath } from './JourneyPath'
import { DailyQuestCard } from '@/features/city/DailyQuestCard'
import { JourneyCard } from '@/features/city/JourneyCard'
import { QuestExtras } from './QuestExtras'
import { KiddoCity } from '@/features/city/KiddoCity'

export function HomePage() {
  const { t } = useTranslation()
  const child = useActiveChild()
  const hasProfiles = useFamilyStore((state) => state.children.length > 0)
  const { results, learned } = useProgress()
  const level = useAgeLevel()
  const reduceMotion = useReducedMotion() ?? false
  const mascotModel = useMascotModel()
  const wearing = useWearing()
  const { sayText: sayHello } = useSpeaker()
  const plan = dailyPlanState(results, dayKey(), level)
  const lockedGames = GAME_TYPES.filter((game) => !isGameOpen(game, level))
  const homeworks = usePendingHomework()
  const activityHomeworks = usePendingActivityHomework()
  const language = useLanguage()
  const exam = examProgress(getAlphabet(language).letters, learned[language] ?? [])
  const examUnlocked = isFinalTestUnlocked(exam.learned, exam.total)
  // While the robot says hello in its spot under the heading, the age badge steps aside.
  const [greetingInStage, setGreetingInStage] = useState(false)

  const hello = plan.complete
    ? t('mascot.homePlanDone')
    : child
      ? t('mascot.homeHello', { name: child.name })
      : t('mascot.homeHelloNoName')

  return (
    <Screen
      header={
        <TopBar
          showHome={false}
          start={
            hasProfiles ? (
              <Link
                to="/child-select"
                aria-label={t('childSelect.switch')}
                className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-full active:scale-95 sm:py-1 sm:pr-3 sm:pl-1"
              >
                <ChildAvatar child={child} size={44} />
                <span className="hidden truncate font-display text-lg font-bold sm:inline">
                  {child?.name ?? t('childSelect.guest')}
                </span>
              </Link>
            ) : null
          }
        />
      }
      className="items-center gap-8 px-4 py-6 sm:gap-10 sm:py-10"
    >
      <h1 className="text-center font-display text-4xl font-extrabold sm:text-5xl">
        {child ? t('home.greeting', { name: child.name }) : t('home.greetingNoName')}
      </h1>
      {/*
        The robot's greeting spot: it stands here with its bubble while it says
        hello, so the bubble never covers the plan or the cards. Otherwise it holds
        the age badge.
      */}
      <div
        data-roam="home-greet"
        className={clsx(
          '-mt-5 flex w-full max-w-3xl items-center justify-center sm:-mt-7',
          // the room is kept only while a robot can greet in it (none with reduced
          // motion); on a phone held sideways it is smaller, but still there, so the
          // bubble never has to cover the heading or the plan
          !reduceMotion && 'min-h-32 sm:min-h-40 short:min-h-28',
        )}
      >
        {child && (
          <span
            className={clsx(
              'rounded-full bg-surface px-4 py-1 font-display text-lg font-bold text-primary-ink shadow-press-sm transition-opacity duration-300',
              greetingInStage && 'opacity-0',
            )}
          >
            {t('age.badge', { age: level })}
          </span>
        )}
      </div>

      {homeworks.length + activityHomeworks.length > 0 && (
        <ul className="flex w-full max-w-3xl flex-col gap-4">
          {homeworks.map((homework) => (
            <li key={homework.id}>
              <HomeworkCard homework={homework} />
            </li>
          ))}
          {activityHomeworks.map((homework) => (
            <li key={homework.id}>
              <ActivityHomeworkCard homework={homework} />
            </li>
          ))}
        </ul>
      )}

      {/* the next adventure first: one main quest, then today's plan, then at most two extras */}
      <JourneyCard />

      <JourneyPath plan={plan} />

      <DailyQuestCard />

      <QuestExtras />

      <KiddoCity />

      <section aria-labelledby="more-title" className="flex w-full flex-col items-center gap-4">
        <h2 id="more-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          {t('home.more')}
        </h2>
        <ul className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          <ActivityCard
            to="/alphabet?tab=numbers"
            label={t('home.numbers')}
            icon="numbers"
            tone="coin"
          />
          <ActivityCard
            to="/tasks/memory"
            label={t(GAME_META.memory.titleKey)}
            icon="memory"
            tone="lilac"
          />
          {lockedGames.map((game) => (
            <LockedCard
              key={game}
              label={t(GAME_META[game].titleKey)}
              icon={game}
              age={GAME_MIN_LEVEL[game]}
            />
          ))}
          {level >= EXAM_MIN_LEVEL ? (
            <ActivityCard
              to="/exam"
              label={t('journey.finalTest')}
              icon="exam"
              tone="sky"
              detail={
                examUnlocked
                  ? t('home.examReady')
                  : `🔒 ${t('exam.progress', { learned: exam.learned, total: exam.total })}`
              }
            />
          ) : (
            <LockedCard label={t('journey.finalTest')} icon="exam" age={EXAM_MIN_LEVEL} />
          )}
        </ul>
      </section>

      <ParentAreaLink />

      <RoamingMascot
        model={mascotModel}
        wearing={wearing}
        mode="tour"
        group="home"
        greeting={hello}
        greetAt="home-greet"
        onGreet={(inStage) => {
          setGreetingInStage(inStage)
          void sayHello(hello)
        }}
        onGreetEnd={() => setGreetingInStage(false)}
        delayMs={900}
      />
      <UnlockCelebration />
    </Screen>
  )
}

const CARD_TONES = {
  sky: 'bg-sky-soft text-ink',
  coin: 'bg-coin-soft text-ink',
  lilac: 'bg-lilac-soft text-ink',
  girl: 'bg-girl-soft text-ink',
} as const

interface ActivityCardProps {
  to: string
  label: string
  icon: AppIconName
  tone: keyof typeof CARD_TONES
  /** A short line under the label, e.g. how far the big test is. */
  detail?: string
}

function ActivityCard({ to, label, icon, tone, detail }: ActivityCardProps) {
  return (
    <li data-roam="home">
      <Link
        to={to}
        className="flex h-full flex-col items-center justify-center gap-2 rounded-[28px] bg-surface p-3 shadow-[0_7px_0_var(--color-line)] transition-transform active:translate-y-1 sm:gap-3 sm:p-5"
      >
        <span
          aria-hidden="true"
          className={`flex size-20 items-center justify-center rounded-3xl font-display text-4xl font-extrabold sm:size-28 sm:text-5xl ${CARD_TONES[tone]}`}
        >
          <AppIcon name={icon} className="size-[70%]" />
        </span>
        <span className="text-center font-display text-lg leading-tight font-bold sm:text-2xl">
          {label}
        </span>
        {detail && <span className="text-center text-sm text-ink-soft sm:text-base">{detail}</span>}
      </Link>
    </li>
  )
}

/** A game for an older child: greyed, with a padlock and the age it opens at. */
function LockedCard({ label, icon, age }: { label: string; icon: AppIconName; age: AgeLevel }) {
  const { t } = useTranslation()
  const { sayText } = useSpeaker()
  const shake = useAnimationControls()
  const lockedAt = t('age.lockedAt', { age })

  const tap = () => {
    void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } })
    void sayText(t('age.lockedSay', { age }))
  }

  return (
    <li data-roam="home">
      <motion.button
        type="button"
        animate={shake}
        onClick={tap}
        aria-label={`${label} — ${lockedAt}`}
        className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[28px] border-[3px] border-dashed border-line-strong bg-surface/60 p-3 sm:gap-3 sm:p-5"
      >
        <span
          aria-hidden="true"
          className="relative flex size-20 items-center justify-center rounded-3xl bg-cream text-4xl sm:size-28 sm:text-5xl"
        >
          <AppIcon name={icon} className="size-[70%] opacity-40 grayscale" />
          <span className="absolute -right-2 -bottom-2 flex size-10 items-center justify-center rounded-full bg-coin text-xl shadow-[0_3px_0_var(--color-coin-shadow)] sm:size-12 sm:text-2xl">
            <AppIcon name="lock" className="size-[70%]" />
          </span>
        </span>
        <span className="text-center font-display text-lg leading-tight font-bold text-ink-soft sm:text-2xl">
          {label}
        </span>
        <span className="text-center text-sm font-semibold text-ink-soft sm:text-base">
          {lockedAt}
        </span>
      </motion.button>
    </li>
  )
}
