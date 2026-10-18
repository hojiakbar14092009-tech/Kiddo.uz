import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { tabPanelProps } from '@/components/ui/tabPanel'
import { getAlphabet } from '@/content/alphabet'
import { NUMBERS } from '@/content/numbers'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { LetterTile } from './LetterTile'
import { paletteFor } from './letterPalette'
import { NumberTile } from './NumberTile'

export type AlphabetTab = 'letters' | 'numbers'

const GRID_CLASSES =
  'grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-x-3 gap-y-4 pb-4 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] sm:gap-x-4 sm:gap-y-5'

export function AlphabetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useLanguage()
  const { learned } = useProgress()
  const [params, setParams] = useSearchParams()
  const tab: AlphabetTab = params.get('tab') === 'numbers' ? 'numbers' : 'letters'
  const learnedLetters = new Set(learned[language] ?? [])
  const { letters } = getAlphabet(language)

  const selectTab = (next: AlphabetTab) =>
    setParams(next === 'numbers' ? { tab: 'numbers' } : {}, { replace: true })

  return (
    <Screen header={<TopBar />} className="gap-5 px-4 py-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            {tab === 'letters' ? t('alphabet.tabLetters') : t('alphabet.tabNumbers')}
          </h1>
          <p className="text-lg text-ink-soft">
            {tab === 'letters' ? t('alphabet.hint') : t('alphabet.numbersHint')}
          </p>
        </div>

        <SegmentedTabs
          tabs={[
            { value: 'letters', symbol: 'Aa', label: t('alphabet.tabLetters') },
            { value: 'numbers', symbol: '123', label: t('alphabet.tabNumbers') },
          ]}
          value={tab}
          onChange={selectTab}
          label={t('alphabet.tabs')}
          idBase="alphabet"
        />
      </div>

      <ul {...tabPanelProps('alphabet', tab)} className={GRID_CLASSES}>
        {tab === 'letters'
          ? letters.map((letter, index) => (
              <li key={letter.id}>
                <LetterTile
                  letter={letter}
                  palette={paletteFor(index)}
                  learned={learnedLetters.has(letter.id)}
                  onSelect={() => navigate(`/alphabet/${letter.id}`)}
                />
              </li>
            ))
          : NUMBERS.map((entry, index) => (
              <li key={entry.id}>
                <NumberTile
                  entry={entry}
                  word={entry.words[language]}
                  palette={paletteFor(index)}
                  onSelect={() => navigate(`/alphabet/${entry.id}`)}
                />
              </li>
            ))}
      </ul>
    </Screen>
  )
}
