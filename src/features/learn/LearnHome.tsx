import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/store/settingsStore'
import { Img3D } from './Img3D'
import { useLearnChild } from './learnStore'
import { reviewSection } from './reviewSection'
import { findSection } from './sections'

/**
 * Home: a personal review card when something needs practice (nothing
 * otherwise). The sections themselves are buildings of Kiddo City.
 */
export function LearnReviewCard() {
  const { t } = useTranslation()
  const learn = useLearnChild()
  const language = useLanguage()
  const review = reviewSection(learn, language)
  if (!review) return null

  return (
    <Link
      to={findSection(review).path}
      data-testid="learn-review"
      className="flex w-full max-w-3xl items-center gap-4 rounded-card bg-coin-soft px-5 py-4 shadow-press active:translate-y-1"
    >
      <Img3D name={findSection(review).icon} className="size-16 shrink-0" />
      <span className="flex flex-col">
        <span className="font-display text-xl font-extrabold">{t('learn.review')}</span>
        <span className="text-lg text-ink-soft">
          {t('learn.reviewText', { section: t(`learn.sections.${review}`) })}
        </span>
      </span>
    </Link>
  )
}
