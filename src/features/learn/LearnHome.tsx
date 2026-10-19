import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/store/settingsStore'
import { Img3D } from './Img3D'
import type { Language } from '@/content/languages'
import {
  useLearnChild,
  weakSkills,
  type LearnChild,
  type LearnLanguage,
  type SectionId,
} from './learnStore'
import { LEARN_SECTIONS, findSection } from './sections'

/** Maths is the same in every language; the other sections keep a record per language. */
const LANGUAGE_FREE: readonly SectionId[] = ['math']

/**
 * The section with the most to practise again for this child (in the current
 * language), or null when nothing needs review.
 */
export function reviewSection(learn: LearnChild, language: Language): SectionId | null {
  let best: { id: SectionId; weight: number } | null = null
  for (const section of LEARN_SECTIONS) {
    const lang: LearnLanguage = LANGUAGE_FREE.includes(section.id) ? 'any' : language
    const weak = weakSkills(learn, section.id, lang)
    if (weak.length === 0) continue
    const weight = weak.reduce((sum, stat) => sum + stat.wrong + stat.helped, 0)
    if (!best || weight > best.weight) best = { id: section.id, weight }
  }
  return best?.id ?? null
}

/** Home: a personal review card (when something needs practice) and the six new sections. */
export function LearnHome() {
  const { t } = useTranslation()
  const learn = useLearnChild()
  const language = useLanguage()
  const review = reviewSection(learn, language)

  return (
    <section aria-labelledby="learn-title" className="flex w-full flex-col items-center gap-4">
      <h2 id="learn-title" className="font-display text-2xl font-extrabold sm:text-3xl">
        {t('learn.newSections')}
      </h2>

      {review && (
        <Link
          to={findSection(review).path}
          data-testid="learn-review"
          className="flex w-full max-w-3xl items-center gap-4 rounded-[28px] bg-coin-soft px-5 py-4 shadow-[0_6px_0_var(--color-line)] active:translate-y-1"
        >
          <Img3D name={findSection(review).icon} className="size-16 shrink-0" />
          <span className="flex flex-col">
            <span className="font-display text-xl font-extrabold">{t('learn.review')}</span>
            <span className="text-lg text-ink-soft">
              {t('learn.reviewText', { section: t(`learn.sections.${review}`) })}
            </span>
          </span>
        </Link>
      )}

      <ul className="grid w-full max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        {LEARN_SECTIONS.map((section) => (
          <li key={section.id} data-roam="home">
            <Link
              to={section.path}
              className="flex h-full flex-col items-center justify-center gap-2 rounded-[28px] bg-surface p-3 shadow-[0_7px_0_var(--color-line)] transition-transform active:translate-y-1 sm:gap-3 sm:p-5"
            >
              <span
                aria-hidden="true"
                className={`flex size-20 items-center justify-center rounded-3xl sm:size-28 ${section.tint}`}
              >
                <Img3D name={section.icon} className="size-[78%]" />
              </span>
              <span className="text-center font-display text-lg leading-tight font-bold sm:text-2xl">
                {t(`learn.sections.${section.id}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
