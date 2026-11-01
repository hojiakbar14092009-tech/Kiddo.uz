import { useTranslation } from 'react-i18next'
import { getAlphabet } from '@/content/alphabet'
import { GAME_MIN_LEVEL, isGameSuggested } from '@/features/age/ageLevel'
import { AppIcon } from '@/features/age/AppIcon'
import { examProgress } from '@/features/exam/exam'
import { QuestExtras } from '@/features/home/QuestExtras'
import { GAME_META } from '@/features/tasks/gameMeta'
import { GAME_TYPES } from '@/features/tasks/games'
import { isFinalTestUnlocked } from '@/features/tasks/rules'
import { useAgeLevel } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { HubHeading, HubScreen } from './HubScreen'
import { BuildingPlaces, PlaceCard, PlaceGroup } from './PlaceGrid'

/** The learning places, from first letters and numbers to stories and feelings. */
const LEARN_PLACES = [
  'reading-house',
  'math-land',
  'word-workshop',
  'writing-school',
  'story-library',
  'friendship-house',
  'garden',
  'mistake-garden',
  'robot-workshop',
] as const

/**
 * O‘rgan (Phase 40): every learning place in one calm grid, today's extra
 * practice first, then the small games and the big letter test.
 */
export function LearnHub() {
  const { t } = useTranslation()
  const level = useAgeLevel()
  const { learned } = useProgress()
  const language = useLanguage()
  const exam = examProgress(getAlphabet(language).letters, learned[language] ?? [])
  const examUnlocked = isFinalTestUnlocked(exam.learned, exam.total)
  // games suggested from an older age: playable now, with a calm note
  const laterGames = GAME_TYPES.filter((game) => !isGameSuggested(game, level))

  return (
    <HubScreen className="gap-8 py-6 sm:gap-10 sm:py-8">
      <HubHeading title={t('hubs.learn.title')} text={t('hubs.learn.text')} />
      <QuestExtras />
      <PlaceGroup id="learn-places" title={t('hubs.learn.places')}>
        <BuildingPlaces ids={LEARN_PLACES} />
      </PlaceGroup>
      <PlaceGroup id="more-title" title={t('home.more')}>
        <PlaceCard
          to="/alphabet?tab=numbers"
          label={t('home.numbers')}
          picture={<AppIcon name="numbers" className="size-[70%]" />}
          tint="bg-coin-soft"
        />
        <PlaceCard
          to="/tasks/memory"
          label={t(GAME_META.memory.titleKey)}
          picture={<AppIcon name="memory" className="size-[70%]" />}
          tint="bg-lilac-soft"
        />
        {laterGames.map((game) => (
          <PlaceCard
            key={game}
            to={`/tasks/${game}`}
            label={t(GAME_META[game].titleKey)}
            picture={<AppIcon name={game} className="size-[70%]" />}
            tint="bg-girl-soft"
            detail={t('age.suggestedFrom', { age: GAME_MIN_LEVEL[game] })}
          />
        ))}
        {/* open at any age: the test itself waits until the letters are learned */}
        <PlaceCard
          to="/exam"
          label={t('journey.finalTest')}
          picture={<AppIcon name="exam" className="size-[70%]" />}
          tint="bg-sky-soft"
          detail={
            examUnlocked
              ? t('home.examReady')
              : `⭐ ${t('exam.progress', { learned: exam.learned, total: exam.total })}`
          }
        />
      </PlaceGroup>
    </HubScreen>
  )
}
