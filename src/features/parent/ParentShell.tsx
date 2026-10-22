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
 *
 * The sticky bar holds only what must always be at hand (back to the children,
 * language), so it stays one clean row even on a 320px phone. The app mark,
 * the area's name and the page's own actions (e.g. sign out) open the page.
 */
export function ParentShell({
  children,
  actions,
  width = 'wide',
}: {
  children: ReactNode
  actions?: ReactNode
  /** Width of the page content, so the title row lines up with it. */
  width?: 'wide' | 'narrow'
}) {
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
            'topbar sticky top-0 z-20 flex items-center justify-between gap-2 px-4 py-2.5 transition-[background-color,box-shadow,backdrop-filter] duration-300 sm:gap-3 sm:px-6 sm:py-3',
            scrolled && 'topbar-scrolled',
          )}
        >
          <button
            type="button"
            onClick={backToChildren}
            className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-full bg-primary-soft pr-4 pl-2 font-display font-bold whitespace-nowrap text-primary-ink"
          >
            <ChevronLeftIcon size={24} />
            {t('parent.toChildren')}
          </button>
          <LanguageSwitcher />
        </header>
      }
      className="px-4 pt-2 pb-5 sm:px-6 sm:pt-3"
    >
      <div
        className={clsx(
          'mx-auto mb-4 flex w-full items-center gap-3 sm:mb-6',
          width === 'wide' ? 'max-w-6xl' : 'max-w-md',
        )}
      >
        <KiddoMark size={44} className="size-10 shrink-0 sm:size-11" />
        <div className="flex min-w-0 flex-1 flex-col">
          <KiddoWordmark className="hidden h-6 w-auto self-start sm:block" />
          <span className="truncate font-display text-lg leading-tight font-bold max-[359px]:text-base sm:font-body sm:text-sm sm:font-normal sm:text-ink-soft">
            {t('common.parentArea')}
          </span>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </Screen>
  )
}
