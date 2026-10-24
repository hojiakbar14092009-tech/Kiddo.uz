import clsx from 'clsx'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'

const OPTION =
  'h-11 min-w-11 rounded-full px-1.5 font-display text-sm font-bold transition-colors sm:h-12 sm:min-w-14 sm:px-3 sm:text-lg'

/**
 * The three languages side by side. With `folded` (the top bar decides it from
 * the room it has, see useFoldedSwitch) they fold into one button with the
 * current language, e.g. next to a back button on a 320 px phone or with large
 * system text, so the bar never pushes a control off the screen or under
 * another. The full row stays laid out (unseen) while folded, so the bar can
 * tell when it fits again.
 */
export function LanguageSwitcher({ folded }: { folded?: boolean }) {
  const { t } = useTranslation()
  const language = useSettingsStore((state) => state.language)
  const setLanguage = useSettingsStore((state) => state.setLanguage)

  const full = (
    <div
      role="group"
      aria-label={t('common.languageSwitcher')}
      data-language-full=""
      aria-hidden={folded || undefined}
      inert={folded || undefined}
      className={clsx(
        'flex gap-1 rounded-full bg-surface p-1 shadow-[0_4px_0_var(--color-line)]',
        folded && 'pointer-events-none invisible absolute right-0',
      )}
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
            className={clsx(OPTION, isActive ? 'bg-primary text-white' : 'text-ink')}
          >
            {LANGUAGE_INFO[code].shortLabel}
          </button>
        )
      })}
    </div>
  )

  if (folded === undefined) return full
  return (
    <div className="relative flex">
      {full}
      {folded && <CompactSwitcher language={language ?? 'uz'} onChoose={setLanguage} />}
    </div>
  )
}

/** One button with the current language; it opens the three choices below it. */
function CompactSwitcher({
  language,
  onChoose,
}: {
  language: Language
  onChoose: (language: Language) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={root}
      className="relative"
      data-language-compact=""
      // Tab past the last choice closes the list, as a tap outside does
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t('common.languageCurrent', { language: LANGUAGE_INFO[language].nativeName })}
        onClick={() => setOpen((value) => !value)}
        className={clsx(OPTION, 'bg-primary text-white shadow-[0_4px_0_var(--color-line)]')}
      >
        {LANGUAGE_INFO[language].shortLabel}
      </button>
      {open && (
        <div
          id={listId}
          role="group"
          aria-label={t('common.languageSwitcher')}
          className="absolute top-full right-0 z-30 mt-2 flex flex-col gap-1 rounded-3xl bg-surface p-1 shadow-press"
        >
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-pressed={code === language}
              onClick={() => {
                onChoose(code)
                setOpen(false)
                button.current?.focus()
              }}
              className={clsx(
                OPTION,
                'whitespace-nowrap',
                code === language ? 'bg-primary text-white' : 'text-ink',
              )}
            >
              {LANGUAGE_INFO[code].nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
