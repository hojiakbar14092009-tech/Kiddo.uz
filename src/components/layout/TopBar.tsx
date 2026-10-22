import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { HomeIcon } from '@/components/icons'
import { CoinBadge } from '@/components/ui/CoinBadge'
import { IconButton } from '@/components/ui/IconButton'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProgress } from '@/store/progressStore'
import { useIsPro } from '@/store/subscriptionStore'
import { useScrolled } from './useScrolled'

interface TopBarProps {
  /** Extra content next to the home button, e.g. the child’s name or a back button. */
  start?: ReactNode
  showHome?: boolean
  showCoins?: boolean
}

/**
 * The child-facing top bar. Every element keeps the same place on every screen,
 * so a child always knows where “home”, coins and languages are.
 */
export function TopBar({ start, showHome = true, showCoins = true }: TopBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { coins } = useProgress()
  const scrolled = useScrolled()
  const isPro = useIsPro()

  return (
    <header
      className={clsx(
        'topbar sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-2 px-3 py-2.5 max-[359px]:gap-1.5 max-[359px]:px-2 transition-[background-color,box-shadow,backdrop-filter] duration-300 sm:min-h-20 sm:gap-3 sm:px-6 sm:py-3',
        // A phone held sideways: the bar is slimmer and scrolls away with the page, so it never covers a control.
        'short:static! short:min-h-0! short:py-1.5!',
        // One surface with the page: see-through at the top, frosted once the page scrolls under it.
        scrolled && 'topbar-scrolled',
      )}
    >
      {showHome && (
        <IconButton label={t('common.home')} tone="primary" onClick={() => navigate('/home')}>
          <HomeIcon size={28} />
        </IconButton>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">{start}</div>
      <div className="flex shrink-0 items-center gap-1.5 max-[359px]:gap-1 sm:gap-3">
        {/*
          Below 360px there is no room for the word "Free" next to the coins and
          all three languages; PRO is only a small crown there, so it stays. Free
          stays announced to screen readers.
        */}
        <span className={clsx('contents', !isPro && 'max-[359px]:*:sr-only')}>
          <TierBadge />
        </span>
        {showCoins && <CoinBadge amount={coins} />}
        <LanguageSwitcher />
      </div>
    </header>
  )
}
