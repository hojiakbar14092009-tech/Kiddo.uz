import { track } from '@/domain/analytics'
import { Img3D } from '@/components/ui/Img3D'
import { AppIcon } from '@/features/age/AppIcon'
import { HubScreen } from '@/features/hubs/HubScreen'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { RoamingMascot } from '@/features/mascot/RoamingMascot'
import { QuickTiles } from '@/features/hubs/QuickTiles'
import { ParentAreaLink } from '@/features/parent/ParentAreaLink'
import { GAME_META } from '@/features/tasks/gameMeta'
import { dayKey } from '@/features/tasks/rules'
import { usePendingActivityHomework, usePendingHomework } from '@/features/tasks/useHomework'
import { ActivityHomeworkCard } from './ActivityHomeworkCard'
import { homeLine, mascotMemory } from '@/features/mascot/life'
import { useUniverseStore } from '@/domain/universe/store'
import { birthdayWeekYear, tashkentDay } from '@/features/birthday/birthday'
import { tDynamic } from '@/lib/tDynamic'
import { activeSeason, isSeasonSetting } from '@/features/seasons/seasons'
import { clampRestHours, isRestHour, useAppSettingsStore } from '@/store/appSettingsStore'
import { CoachMarks } from '@/features/onboarding/CoachMarks'
import { BirthdayCelebration } from '@/features/birthday/BirthdayCelebration'
import { childAge, useActiveChild, useAgeLevel, useMascotModel } from '@/store/familyStore'
import { UnlockCelebration } from '@/features/age/UnlockCelebration'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useChildKey, useProgress, useProgressStore, useWearing } from '@/store/progressStore'
import { dailyPlanState } from './dailyPlan'
import { HomeworkCard } from './HomeworkCard'
import { JourneyPath } from './JourneyPath'
import { DailyQuestCard } from '@/features/city/DailyQuestCard'
import { JourneyCard } from '@/features/city/JourneyCard'
import { FitWords } from '@/components/ui/FitWords'

export function HomePage() {
  const { t } = useTranslation()
  const child = useActiveChild()
  const { results } = useProgress()
  const level = useAgeLevel()
  const reduceMotion = useReducedMotion() ?? false
  const mascotModel = useMascotModel()
  const wearing = useWearing()
  const { sayText: sayHello } = useSpeaker()
  const plan = dailyPlanState(results, dayKey(), level)
  const homeworks = usePendingHomework()
  const activityHomeworks = usePendingActivityHomework()
  // While the robot says hello in its spot under the heading, the age badge steps aside.
  const [greetingInStage, setGreetingInStage] = useState(false)

  // the robot's line follows the child's day (features/mascot/life.ts)
  const [hour] = useState(() => new Date().getHours())
  // what the robot remembers: only this child's own data, on this device (Phase 43); read
  // once on arrival, so a friendship day said now does not turn into another line at once
  const childKey = useChildKey()
  const runs = useUniverseStore((state) => state.byChild[childKey]?.recent)
  const bond = useProgressStore((state) => state.byChild[childKey]?.robotBond)
  const [memory] = useState(() =>
    mascotMemory({
      today: dayKey(),
      bond,
      resultDays: results.map((result) => result.day),
      runs: runs ?? [],
    }),
  )
  const restHours = useAppSettingsStore((state) => state.restHours)
  const seasonSetting = useAppSettingsStore((state) => state.season)
  const [today] = useState(() => new Date())
  const line = homeLine({
    memory,
    resting: isRestHour(hour, clampRestHours(restHours)),
    season: activeSeason(isSeasonSetting(seasonSetting) ? seasonSetting : 'auto', today),
    hour,
    name: child?.name ?? null,
    birthday: child ? birthdayWeekYear(child.birthDate, tashkentDay()) !== null : false,
    homework: homeworks.length + activityHomeworks.length,
    planDone: plan.complete,
  })
  const hello = tDynamic(t, `mascot.life.${line.key}`, line.params)
  const saidFriendDay = line.key.startsWith('friend') ? memory.friendDay : null
  useEffect(() => {
    if (saidFriendDay) useProgressStore.getState().markRobotFriendSaid(childKey, saidFriendDay)
  }, [saidFriendDay, childKey])

  // the day's journey done (anonymous analytics, once a day)
  useEffect(() => {
    if (plan.complete) track('journey_done')
  }, [plan.complete])

  return (
    <HubScreen className="gap-5 py-4 sm:gap-8 sm:py-8">
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
          '-mt-3 flex w-full max-w-3xl items-center justify-center sm:-mt-7',
          // the room is kept only while a robot can greet in it (none with reduced
          // motion); on a phone held sideways it is smaller, but still there, so the
          // bubble never has to cover the heading or the plan
          !reduceMotion && 'min-h-24 sm:min-h-40 short:min-h-24',
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

      {/* one big way on: the next step of today's plan (Phase 40) */}
      <ContinueButton plan={plan} />

      {/* Phase 75: the four places a child looks for most, right under the plan */}
      <QuickTiles
        label={t('home.quick.label')}
        tiles={[
          {
            to: '/games',
            label: t('games.title'),
            picture: <Img3D name="ball" className="size-[74%]" />,
            tint: 'bg-coin-soft',
            testId: 'games-link',
          },
          {
            to: '/shorts',
            label: t('shorts.open'),
            picture: (
              <span aria-hidden="true" className="text-3xl leading-none sm:text-5xl">
                🎬
              </span>
            ),
            tint: 'bg-lilac-soft',
            testId: 'home-shorts',
          },
          {
            to: '/stories',
            label: t('home.quick.tales'),
            picture: <Img3D name="book" className="size-[74%]" />,
            tint: 'bg-girl-soft',
            testId: 'home-tales',
          },
          {
            to: '/learn/my-story',
            label: t('myStory.title'),
            picture: <Img3D name="castle" className="size-[74%]" />,
            tint: 'bg-primary-soft',
            testId: 'home-my-story',
          },
        ]}
      />

      <JourneyPath plan={plan} />

      <DailyQuestCard />

      {/* the big adventure across the worlds: its next step */}
      <JourneyCard />

      {/* the smallest phones: no room for the lock in the top bar, so the card stays here */}
      <ParentAreaLink className="min-[360px]:hidden" />

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
    </HubScreen>
  )
}

/**
 * "Davom etish": one big button to the next game of today's plan, with its
 * name under it; when the plan is done, it leads to more learning instead.
 */
function ContinueButton({ plan }: { plan: ReturnType<typeof dailyPlanState> }) {
  const { t } = useTranslation()
  const next = plan.steps.find((step) => step.status === 'next')
  const to = next ? `/tasks/${next.game}` : '/learn'
  return (
    <Link
      to={to}
      data-testid="home-continue"
      className="flex w-full max-w-xl items-center gap-4 rounded-card bg-primary px-5 py-4 text-white shadow-[0_8px_0_var(--color-primary-shadow)] transition-transform active:translate-y-1 sm:px-7 sm:py-5"
    >
      <span
        aria-hidden="true"
        className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/25 sm:size-20"
      >
        {next ? (
          <AppIcon name={next.game} className="size-[70%]" />
        ) : (
          <Img3D name="book" className="size-[70%]" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <FitWords
          text={next ? t('home.continue') : t('home.playMore')}
          className="font-display text-3xl leading-tight font-extrabold sm:text-4xl"
        />
        {next && (
          <span className="text-lg font-bold opacity-95">
            {t('home.nextGame', { game: t(GAME_META[next.game].titleKey) })}
          </span>
        )}
      </span>
    </Link>
  )
}
