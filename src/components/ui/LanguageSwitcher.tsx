import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_INFO, LANGUAGES } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)

  return (
    <div
      role="group"
      aria-label={t('common.languageSwitcher')}
      className="flex gap-1 rounded-full bg-[#FFF1DC] p-1"
    >
      {LANGUAGES.map((code) => {
        const isActive = code === language
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={isActive}
            aria-label={LANGUAGE_INFO[code].nativeName}
            onClick={() => setLanguage(code)}
            className={clsx(
              'h-11 min-w-11 rounded-full px-1.5 font-display text-sm font-bold transition-colors sm:h-12 sm:min-w-14 sm:px-3 sm:text-lg',
              isActive ? 'bg-primary text-white' : 'text-ink',
            )}
          >
            {LANGUAGE_INFO[code].shortLabel}
          </button>
        )
      })}
    </div>
  )
}
