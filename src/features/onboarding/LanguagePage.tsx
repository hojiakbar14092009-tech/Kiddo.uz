import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Flag } from '@/components/flags/Flag'
import { Screen } from '@/components/layout/Screen'
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/content/languages'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { useSettingsStore } from '@/store/settingsStore'

export function LanguagePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)

  const choose = (code: Language) => {
    setLanguage(code)
    navigate('/home')
  }

  return (
    <Screen className="items-center justify-center gap-6 px-4 py-8 sm:gap-8">
      <div className="flex items-end gap-2" aria-hidden="true">
        <MascotFigure model="girl" mood="wave" className="h-auto w-24 sm:w-32" />
        <MascotFigure model="boy" mood="wave" className="h-auto w-24 sm:w-32" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-display text-2xl font-bold sm:text-3xl">{t('language.greeting')}</p>
        <p className="text-lg text-ink-soft sm:text-xl">{t('language.question')}</p>
      </div>

      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{t('language.title')}</h1>

      <ul className="grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
        {LANGUAGES.map((code) => (
          <li key={code}>
            <button
              type="button"
              lang={code}
              onClick={() => choose(code)}
              aria-pressed={code === language}
              className="flex w-full flex-row items-center gap-5 rounded-[32px] border-4 border-transparent bg-surface p-5 shadow-[0_8px_0_var(--color-line)] transition-transform active:translate-y-1 aria-pressed:border-primary sm:flex-col sm:py-10"
            >
              <Flag language={code} width={120} />
              <span className="font-display text-3xl font-bold">
                {LANGUAGE_INFO[code].nativeName}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
