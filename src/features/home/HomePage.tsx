import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { PeekingMascot } from '@/features/mascot/PeekingMascot'
import { ParentAreaLink } from '@/features/parent/ParentAreaLink'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { GAME_META } from '@/features/tasks/gameMeta'
import { dayKey } from '@/features/tasks/rules'
import { usePendingHomework } from '@/features/tasks/useHomework'
import { useActiveChild, useFamilyStore } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { dailyPlanState } from './dailyPlan'
import { HomeworkCard } from './HomeworkCard'
import { JourneyPath } from './JourneyPath'

export function HomePage() {
  const { t } = useTranslation()
  const child = useActiveChild()
  const hasProfiles = useFamilyStore((state) => state.children.length > 0)
  const { results } = useProgress()
  const plan = dailyPlanState(results, dayKey())
  const homework = usePendingHomework()

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

      {homework && <HomeworkCard homework={homework} />}

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

      <section aria-labelledby="more-title" className="flex w-full flex-col items-center gap-4">
        <h2 id="more-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          {t('home.more')}
        </h2>
        <ul className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          <ActivityCard to="/alphabet" label={t('home.alphabet')} symbol="Aa" tone="sky" />
          <ActivityCard
            to="/alphabet?tab=numbers"
            label={t('home.numbers')}
            symbol="123"
            tone="coin"
          />
          <ActivityCard
            to="/tasks/memory"
            label={t(GAME_META.memory.titleKey)}
            symbol={GAME_META.memory.emoji}
            tone="lilac"
          />
          <ActivityCard to="/shop" label={t('shop.open')} symbol="🛍️" tone="girl" />
        </ul>
      </section>

      <ParentAreaLink />

      <PeekingMascot message={hello} />
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
  symbol: string
  tone: keyof typeof CARD_TONES
}

function ActivityCard({ to, label, symbol, tone }: ActivityCardProps) {
  return (
    <li>
      <Link
        to={to}
        className="flex h-full flex-col items-center justify-center gap-2 rounded-[28px] bg-surface p-3 shadow-[0_7px_0_var(--color-line)] transition-transform active:translate-y-1 sm:gap-3 sm:p-5"
      >
        <span
          aria-hidden="true"
          className={`flex size-20 items-center justify-center rounded-3xl font-display text-4xl font-extrabold sm:size-28 sm:text-5xl ${CARD_TONES[tone]}`}
        >
          {symbol}
        </span>
        <span className="text-center font-display text-lg leading-tight font-bold sm:text-2xl">
          {label}
        </span>
      </Link>
    </li>
  )
}
