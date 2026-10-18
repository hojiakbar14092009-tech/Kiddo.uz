import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { getAlphabet, type LetterEntry } from '@/content/alphabet'
import { useLanguage } from '@/store/settingsStore'
import { LetterTile } from './LetterTile'
import { paletteFor } from './letterPalette'

export function AlphabetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useLanguage()
  const { letters } = getAlphabet(language)

  const openLetter = (letter: LetterEntry) => navigate(`/alphabet/${letter.id}`)

  return (
    <Screen header={<TopBar />} className="gap-5 px-4 py-5 sm:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t('alphabet.title')}</h1>
        <p className="text-lg text-ink-soft">{t('alphabet.hint')}</p>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-x-3 gap-y-4 pb-4 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] sm:gap-x-4 sm:gap-y-5">
        {letters.map((letter, index) => (
          <li key={letter.id}>
            <LetterTile letter={letter} palette={paletteFor(index)} onSelect={openLetter} />
          </li>
        ))}
      </ul>
    </Screen>
  )
}
