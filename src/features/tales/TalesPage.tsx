import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import type { Language } from '@/content/languages'
import { Img3D } from '@/features/learn/Img3D'
import { LearnShell } from '@/features/learn/LearnShell'
import { useMascot } from '@/features/mascot/useMascot'
import { useAgeLevel } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'
import { taleById, taleText, talesFor, type AgeLevel, type TaleSpec } from './content'
import { TaleView } from './TaleView'
import { TALES_UI } from './ui'

function TaleCard({ tale, language }: { tale: TaleSpec; language: Language }) {
  const ui = TALES_UI[language]
  return (
    <Link
      to={`/learn/tales/${tale.id}`}
      data-testid={`tale-${tale.id}`}
      className="flex flex-col items-center gap-2 rounded-[32px] bg-surface p-4 text-center shadow-[0_7px_0_var(--color-line)] transition-transform active:translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Img3D name={tale.cover} className="size-24 sm:size-28" />
      <span className="font-display text-xl leading-tight font-bold">
        {taleText(language, tale.id).title}
      </span>
      <span className="rounded-full bg-sky-soft px-3 py-0.5 text-sm font-bold">
        {ui.forAge(tale.age)}
      </span>
    </Link>
  )
}

function TaleList({ language, level }: { language: Language; level: AgeLevel }) {
  const { t } = useTranslation()
  const { react } = useMascot()
  const ui = TALES_UI[language]
  const { open, later } = talesFor(level)
  const own = open.filter((tale) => tale.age === level)
  const younger = open.filter((tale) => tale.age < level)

  useEffect(() => {
    react('greet', { text: ui.intro, emoji: '📚' }, { speak: false })
  }, [react, ui.intro])

  const grid = 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6'
  return (
    <LearnShell title={t('learn.sections.tales')} voice={false}>
      <h2 className="text-center font-display text-2xl font-bold">{ui.intro}</h2>
      <div className={grid}>
        {own.map((tale) => (
          <TaleCard key={tale.id} tale={tale} language={language} />
        ))}
      </div>
      {younger.length > 0 && (
        <>
          <h3 className="font-display text-xl font-bold text-ink-soft">{ui.younger}</h3>
          <div className={grid}>
            {younger.map((tale) => (
              <TaleCard key={tale.id} tale={tale} language={language} />
            ))}
          </div>
        </>
      )}
      {later.length > 0 && (
        <>
          <h3 className="font-display text-xl font-bold text-ink-soft">{ui.older}</h3>
          <div className={grid}>
            {later.map((tale) => (
              <TaleCard key={tale.id} tale={tale} language={language} />
            ))}
          </div>
        </>
      )}
    </LearnShell>
  )
}

function TaleRoute({ language }: { language: Language }) {
  const { taleId = '' } = useParams()
  const tale = taleById(taleId)
  // every tale opens at any age; only an unknown one leads back
  if (!tale) return <Navigate to="/learn/tales" replace />
  return <TaleView key={`${tale.id}-${language}`} tale={tale} language={language} />
}

/** «Ertaklar»: short 3D tales for the child’s age, with a little check at the end. */
export function TalesPage() {
  const language = useLanguage()
  const level = useAgeLevel()
  return (
    <Routes>
      <Route index element={<TaleList language={language} level={level} />} />
      <Route path=":taleId" element={<TaleRoute language={language} />} />
      <Route path="*" element={<Navigate to="/learn/tales" replace />} />
    </Routes>
  )
}
