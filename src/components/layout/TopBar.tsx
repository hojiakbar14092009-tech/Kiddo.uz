import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { HomeIcon } from '@/components/icons'
import { CoinBadge } from '@/components/ui/CoinBadge'
import { IconButton } from '@/components/ui/IconButton'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { TierBadge } from '@/components/ui/TierBadge'
import { useProgress } from '@/store/progressStore'

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

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-b-2 border-line bg-surface px-3 py-2.5 sm:min-h-20 sm:gap-3 sm:px-6 sm:py-3">
      {showHome && (
        <IconButton label={t('common.home')} tone="primary" onClick={() => navigate('/home')}>
          <HomeIcon size={28} />
        </IconButton>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">{start}</div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <TierBadge />
        {showCoins && <CoinBadge amount={coins} />}
        <LanguageSwitcher />
      </div>
    </header>
  )
}
