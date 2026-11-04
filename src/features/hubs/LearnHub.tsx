import { useTranslation } from 'react-i18next'
import { getAlphabet } from '@/content/alphabet'
import { GAME_MIN_LEVEL, isGameSuggested } from '@/features/age/ageLevel'
import { AppIcon } from '@/features/age/AppIcon'
import { Img3D } from '@/components/ui/Img3D'
import { examProgress } from '@/features/exam/exam'
import { QuestExtras } from '@/features/home/QuestExtras'
import { GAME_META } from '@/features/tasks/gameMeta'
import { GAME_TYPES } from '@/features/tasks/games'
import { isFinalTestUnlocked } from '@/features/tasks/rules'
import { useAgeLevel } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { useBuildingTiles } from './buildingTiles'
import { HubHeading, HubScreen } from './HubScreen'
import { BuildingPlaces, PlaceCard, PlaceGroup } from './PlaceGrid'
import { QuickTiles, type Tile } from './QuickTiles'

/**
 * O‘rgan (Phase 40; Phase 75: gathered). The six places a child needs most are
 * big buttons at the top; everything else waits in short rows by subject that
 * slide sideways, so the page is no longer five screens long.
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

  const [alphabet, words, writing, tales] = useBuildingTiles([
    ['reading-house', 'bg-sky-soft'],
    ['word-workshop', 'bg-lilac-soft'],
    ['writing-school', 'bg-primary-soft'],
    ['story-library', 'bg-girl-soft'],
  ])
  const numbers: Tile = {
    to: '/alphabet?tab=numbers',
    label: t('home.numbers'),
    picture: <AppIcon name="numbers" className="size-[70%]" />,
    tint: 'bg-coin-soft',
  }
  const games: Tile = {
    to: '/games',
    label: t('games.title'),
    picture: <Img3D name="ball" className="size-[74%]" />,
    tint: 'bg-coin-soft',
  }
  const tiles = [alphabet, numbers, words, writing, tales, games].filter(
    (tile): tile is Tile => tile !== undefined,
  )

  return (
    <HubScreen className="gap-6 py-5 sm:gap-8 sm:py-8">
      <HubHeading title={t('hubs.learn.title')} />
      <QuickTiles tiles={tiles} label={t('hubs.learn.title')} />
      <QuestExtras />
      <PlaceGroup id="learn-words" title={t('hubs.learn.groups.words')} row>
        <PlaceCard
          to="/learn/three-words"
          label={t('threeWords.title')}
          picture={<Img3D name="notebook" className="size-[72%]" />}
          tint="bg-sky-soft"
        />
        <PlaceCard
          to="/tasks/memory"
          label={t(GAME_META.memory.titleKey)}
          picture={<AppIcon name="memory" className="size-[70%]" />}
          tint="bg-lilac-soft"
        />
        <PlaceCard
          to="/learn/my-story"
          label={t('myStory.title')}
          picture={<Img3D name="book" className="size-[72%]" />}
          tint="bg-primary-soft"
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
      <PlaceGroup id="learn-numbers" title={t('hubs.learn.groups.numbers')} row>
        <BuildingPlaces ids={['math-land', 'robot-workshop', 'mistake-garden']} />
      </PlaceGroup>
      <PlaceGroup id="learn-life" title={t('hubs.learn.groups.life')} row>
        <BuildingPlaces ids={['friendship-house', 'garden']} />
      </PlaceGroup>
    </HubScreen>
  )
}
