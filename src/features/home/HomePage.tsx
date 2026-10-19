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
import { usePendingHomework } from '@/features/tasks/useHomework'
import { useActiveChild, useAgeLevel, useFamilyStore, useMascotModel } from '@/store/familyStore'
import { EXAM_MIN_LEVEL, GAME_MIN_LEVEL, isGameOpen, type AgeLevel } from '@/features/age/ageLevel'
import { AppIcon, type AppIconName } from '@/features/age/AppIcon'
import { UnlockCelebration } from '@/features/age/UnlockCelebration'
import { GAME_TYPES } from '@/features/tasks/games'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { motion, useAnimationControls } from 'framer-motion'
import { useProgress, useWearing } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { dailyPlanState } from './dailyPlan'
import { HomeworkCard } from './HomeworkCard'
import { JourneyPath } from './JourneyPath'
import { LearnHome } from '@/features/learn/LearnHome'

export function HomePage() {
  const { t } = useTranslation()
  const child = useActiveChild()
  const hasProfiles = useFamilyStore((state) => state.children.length > 0)
  const { results, learned } = useProgress()
  const level = useAgeLevel()
  const mascotModel = useMascotModel()
  const wearing = useWearing()
  const { sayText: sayHello } = useSpeaker()
  const plan = dailyPlanState(results, dayKey(), level)
  const lockedGames = GAME_TYPES.filter((game) => !isGameOpen(game, level))
  const homeworks = usePendingHomework()
  const language = useLanguage()
  const exam = examProgress(getAlphabet(language).letters, learned[language] ?? [])
  const examUnlocked = isFinalTestUnlocked(exam.learned, exam.total)

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
                className="flex min-w-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 active:scale-95"
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
      {child && (
        <span className="-mt-5 rounded-full bg-surface px-4 py-1 font-display text-lg font-bold text-primary-ink shadow-[0_4px_0_var(--color-line)] sm:-mt-7">
          {t('age.badge', { age: level })}
        </span>
      )}

      {homeworks.length > 0 && (
        <ul className="flex w-full max-w-3xl flex-col gap-4">
          {homeworks.map((homework) => (
            <li key={homework.id}>
              <HomeworkCard homework={homework} />
            </li>
          ))}
        </ul>
      )}

      <JourneyPath plan={plan} />

      {plan.complete && (
        <div
          role="status"
          className="flex max-w-xl items-center gap-4 rounded-[28px] bg-lilac-soft px-5 py-4"
        >
          <span aria-hidden="true" className="text-5xl">
            🌙
          </span>
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold">{t('home.restTitle')}</span>
            <span className="text-lg text-ink-soft">{t('home.restText')}</span>
          </div>
        </div>
      )}

      <LearnHome />

      <section aria-labelledby="more-title" className="flex w-full flex-col items-center gap-4">
        <h2 id="more-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          {t('home.more')}
        </h2>
        <ul className="grid w-full max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          <ActivityCard to="/alphabet" label={t('home.alphabet')} icon="alphabet" tone="sky" />
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
          <ActivityCard to="/shop" label={t('shop.open')} icon="shop" tone="girl" />
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
        onGreet={() => void sayHello(hello)}
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
