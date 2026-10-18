import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { HomeIcon } from '@/components/icons'
import { CoinBadge } from '@/components/ui/CoinBadge'
import { IconButton } from '@/components/ui/IconButton'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

interface TopBarProps {
  /** Extra content next to the home button, e.g. the child's name or a back button. */
  start?: ReactNode
  coins?: number
  showHome?: boolean
}

/**
 * The child-facing top bar. Every element keeps the same place on every screen,
 * so a child always knows where “home”, coins and languages are.
 */
export function TopBar({ start, coins, showHome = true }: TopBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <header className="flex min-h-20 shrink-0 items-center gap-3 border-b-2 border-line bg-surface px-4 py-3 sm:px-6">
      {showHome && (
        <IconButton label={t('common.home')} tone="primary" onClick={() => navigate('/home')}>
          <HomeIcon size={28} />
        </IconButton>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-3">{start}</div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {coins !== undefined && <CoinBadge amount={coins} />}
        <LanguageSwitcher />
      </div>
    </header>
  )
}
