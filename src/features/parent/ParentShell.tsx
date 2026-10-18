import { KiddoMark, KiddoWordmark } from '@/components/brand/KiddoLogo'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { useScrolled } from '@/components/layout/useScrolled'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useFamilyStore } from '@/store/familyStore'
import { useParentGateStore } from '@/store/parentStore'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Frame of the parent area: calmer and denser than the child screens.
 * “To the children” closes the parent gate behind the parent.
 */
export function ParentShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const closeGate = useParentGateStore((state) => state.close)
  const scrolled = useScrolled()
  const hasLanguage = useSettingsStore((state) => state.language !== null)
  const hasProfiles = useFamilyStore((state) => state.children.length > 0)

  const backToChildren = () => {
    closeGate()
    navigate(!hasLanguage ? '/' : hasProfiles ? '/child-select' : '/home', { replace: true })
  }

  return (
    <Screen
      header={
        <header
          className={clsx(
            'topbar sticky top-0 z-20 flex flex-wrap items-center gap-3 px-4 py-3 transition-[background-color,box-shadow,backdrop-filter] duration-300 sm:px-6',
            scrolled && 'topbar-scrolled',
          )}
        >
          <button
            type="button"
            onClick={backToChildren}
            className="inline-flex min-h-12 items-center gap-1 rounded-full bg-primary-soft pr-4 pl-2 font-display font-bold text-primary-ink"
          >
            <ChevronLeftIcon size={24} />
            {t('parent.toChildren')}
          </button>
          <KiddoMark size={44} className="shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <KiddoWordmark className="h-7 w-auto" />
            <span className="text-sm text-ink-soft">{t('common.parentArea')}</span>
          </div>
          {actions}
          <LanguageSwitcher />
        </header>
      }
      className="px-4 py-5 sm:px-6"
    >
      {children}
    </Screen>
  )
}
