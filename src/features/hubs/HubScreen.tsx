import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { ParentLockLink } from '@/features/parent/ParentAreaLink'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { useActiveChild, useFamilyStore } from '@/store/familyStore'
import { ChildTabBar } from './ChildTabBar'

/** The child's avatar at the top: tap it to change who is playing. */
export function ChildSwitchLink() {
  const { t } = useTranslation()
  const child = useActiveChild()
  const hasProfiles = useFamilyStore((state) => state.children.length > 0)
  if (!hasProfiles) return null
  return (
    <Link
      to="/child-select"
      aria-label={t('childSelect.switch')}
      className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-full active:scale-95 sm:py-1 sm:pr-3 sm:pl-1"
    >
      <ChildAvatar child={child} size={44} />
      <span className="hidden truncate font-display text-lg font-bold sm:inline">
        {child?.name ?? t('childSelect.guest')}
      </span>
    </Link>
  )
}

/**
 * A section's own page (Phase 40): the top bar with the child and the
 * nuts, the content, and the four section tabs at the bottom. The content
 * keeps room above the tabs so nothing ever hides behind them.
 */
export function HubScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Screen
      header={
        <TopBar
          showHome={false}
          start={
            <>
              <ChildSwitchLink />
              <ParentLockLink />
            </>
          }
        />
      }
      footer={<ChildTabBar />}
      className={clsx('items-center px-4 pb-32 sm:pb-36 short:pb-24', className)}
    >
      {children}
    </Screen>
  )
}

/** A section's heading and one short line under it. */
export function HubHeading({ id, title, text }: { id?: string; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 id={id} className="font-display text-4xl font-extrabold sm:text-5xl">
        {title}
      </h1>
      {text && <p className="max-w-xl text-lg text-ink-soft">{text}</p>}
    </div>
  )
}
