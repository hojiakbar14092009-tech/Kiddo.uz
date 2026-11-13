import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { Screen } from '@/components/layout/Screen'

/** The owner fills these two in before launch; they are shown on the page as written. */
export const CONTACT_EMAIL = 'PLACEHOLDER_EMAIL'
export const OPERATOR_NAME = 'PLACEHOLDER_COMPANY'
/** Bump when the text changes. */
export const PRIVACY_UPDATED = '2026-11-13'

const SECTIONS = [
  'modes',
  'parent',
  'child',
  'local',
  'camera',
  'voice',
  'stats',
  'share',
  'keep',
  'telegram',
  'delete',
  'kids',
  'changes',
  'contact',
] as const

/**
 * The privacy policy (/privacy): open to anyone, outside the language and parent gates, in the
 * app's three languages (the switcher is the app's own). What it says is what the code does —
 * keep it in step with the sync, analytics, camera and account code when they change.
 */
export function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <Screen className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="font-display text-lg font-bold text-primary-ink underline">
          ← {t('privacy.back')}
        </Link>
        <LanguageSwitcher />
      </div>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t('privacy.title')}</h1>
      <p className="text-sm text-ink-soft">{t('privacy.updated', { date: PRIVACY_UPDATED })}</p>
      <p className="text-lg">{t('privacy.intro')}</p>
      {SECTIONS.map((id) => (
        <section key={id} aria-labelledby={`privacy-${id}`} className="flex flex-col gap-2">
          <h2 id={`privacy-${id}`} className="font-display text-xl font-bold sm:text-2xl">
            {t(`privacy.s.${id}.title`)}
          </h2>
          <p className="whitespace-pre-line leading-relaxed">
            {t(`privacy.s.${id}.body`, { company: OPERATOR_NAME })}
          </p>
          {id === 'contact' && (
            <a className="font-bold text-primary-ink underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          )}
        </section>
      ))}
    </Screen>
  )
}
