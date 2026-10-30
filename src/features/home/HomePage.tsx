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
import { homeLine } from '@/features/mascot/life'
import { birthdayWeekYear, tashkentDay } from '@/features/birthday/birthday'
import { tDynamic } from '@/lib/tDynamic'
import { CoachMarks } from '@/features/onboarding/CoachMarks'
import { BirthdayCelebration } from '@/features/birthday/BirthdayCelebration'
import {
  childAge,
  useActiveChild,
  useAgeLevel,
  useFamilyStore,
  useMascotModel,
} from '@/store/familyStore'
import { GAME_MIN_LEVEL, isGameSuggested } from '@/features/age/ageLevel'
import { AppIcon, type AppIconName } from '@/features/age/AppIcon'
import { UnlockCelebration } from '@/features/age/UnlockCelebration'
import { GAME_TYPES } from '@/features/tasks/games'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useReducedMotion } from 'framer-motion'
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
  // games suggested from an older age: playable now, with a calm note
  const laterGames = GAME_TYPES.filter((game) => !isGameSuggested(game, level))
  const homeworks = usePendingHomework()
  const activityHomeworks = usePendingActivityHomework()
  const language = useLanguage()
  const exam = examProgress(getAlphabet(language).letters, learned[language] ?? [])
  const examUnlocked = isFinalTestUnlocked(exam.learned, exam.total)
  // While the robot says hello in its spot under the heading, the age badge steps aside.
  const [greetingInStage, setGreetingInStage] = useState(false)

  // the robot's line follows the child's day (features/mascot/life.ts)
  const [hour] = useState(() => new Date().getHours())
  const line = homeLine({
    hour,
    name: child?.name ?? null,
    birthday: child ? birthdayWeekYear(child.birthDate, tashkentDay()) !== null : false,
    homework: homeworks.length + activityHomeworks.length,
    planDone: plan.complete,
  })
  const hello = tDynamic(t, `mascot.life.${line.key}`, line.params)

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
        {child && Number.isFinite(childAge(child)) && (
          <span
            className={clsx(
              'rounded-full bg-surface px-4 py-1 font-display text-lg font-bold text-primary-ink shadow-press-sm transition-opacity duration-300',
              greetingInStage && 'opacity-0',
            )}
          >
            {/* the child's real age, never the difficulty level (Phase 22) */}
            {t('age.badge', { age: childAge(child) })}
          </span>
        )}
      </div>

      {homeworks.length + activityHomeworks.length > 0 && (
        <ul data-tour="homework" className="flex w-full max-w-3xl flex-col gap-4">
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
          {laterGames.map((game) => (
            <ActivityCard
              key={game}
              to={`/tasks/${game}`}
              label={t(GAME_META[game].titleKey)}
              icon={game}
              tone="girl"
              detail={t('age.suggestedFrom', { age: GAME_MIN_LEVEL[game] })}
            />
          ))}
          {/* open at any age: the test itself waits until the letters are learned */}
          <ActivityCard
            to="/exam"
            label={t('journey.finalTest')}
            icon="exam"
            tone="sky"
            detail={
              examUnlocked
                ? t('home.examReady')
                : `⭐ ${t('exam.progress', { learned: exam.learned, total: exam.total })}`
            }
          />
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
      {/* guided discovery on this very screen: per child, full once, then a reminder */}
      <CoachMarks tour="home" delayMs={2500} />
      <BirthdayCelebration />
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
