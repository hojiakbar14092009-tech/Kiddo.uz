import { DEMO } from '@/config/demo'
import clsx from 'clsx'
import { useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChartIcon, ChildIcon, ClipboardIcon, CrownIcon, GearIcon } from '@/components/icons'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { tabPanelProps } from '@/components/ui/tabPanel'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { signOutCloud } from '@/services/supabase/auth'
import { useSyncStore } from '@/services/sync/syncQueue'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { ProSection } from '@/features/pro/ProSection'
import { ParentShell } from '../ParentShell'
import { HomeworkSection } from './HomeworkSection'
import { ProfilesSection } from './ProfilesSection'
import { FamilyOverview } from './FamilyOverview'
import { ExitAlert } from './ExitAlert'
import { ReportSection } from './ReportSection'
import { SettingsSection } from './SettingsSection'

const TABS = ['report', 'profiles', 'homework', 'pro', 'settings'] as const
type DashboardTab = (typeof TABS)[number]

/** One stroke icon family for the tabs, instead of platform emoji. */
const ICONS: Record<DashboardTab, ComponentType<{ size?: number }>> = {
  report: ChartIcon,
  profiles: ChildIcon,
  homework: ClipboardIcon,
  pro: CrownIcon,
  settings: GearIcon,
}

function isTab(value: string | null): value is DashboardTab {
  return (TABS as readonly (string | null)[]).includes(value)
}

/** `/parent/dashboard`: reports, profiles, homework and settings. */
export function ParentDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const children = useFamilyStore((state) => state.children)
  const activeChildId = useFamilyStore((state) => state.activeChildId)
  const session = useParentStore((state) => state.session)
  const signOut = useParentStore((state) => state.signOut)
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const [selectedId, setSelectedId] = useState<string | null>(activeChildId)

  const child =
    children.find((item) => item.id === selectedId) ??
    children.find((item) => item.id === activeChildId) ??
    children[0] ??
    null
  const wanted: DashboardTab = isTab(requested) ? requested : 'report'
  // Report and homework belong to a child: without one, start by adding a profile.
  const tab: DashboardTab =
    !child && (wanted === 'report' || wanted === 'homework') ? 'profiles' : wanted

  const leave = async () => {
    if (session?.mode === 'cloud') await signOutCloud()
    // Unsent cloud changes belong to this account; they must never reach the next one.
    useSyncStore.getState().clear()
    signOut()
    navigate('/parent/login', { replace: true })
  }

  return (
    <ParentShell
      actions={
        <button
          type="button"
          onClick={() => void leave()}
          className="min-h-12 rounded-full border-2 border-line-strong bg-surface px-4 font-semibold whitespace-nowrap text-ink-soft"
        >
          {t('parent.signOut')}
        </button>
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {children.length > 0 ? (
            <div role="group" aria-label={t('parent.chooseChild')} className="flex flex-wrap gap-2">
              {children.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === child?.id}
                  onClick={() => setSelectedId(item.id)}
                  className={clsx(
                    'flex min-h-12 items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1 font-display font-bold',
                    item.id === child?.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-line-strong bg-surface',
                  )}
                >
                  <ChildAvatar child={item} size={40} />
                  {item.name}
                </button>
              ))}
            </div>
          ) : (
            <h1 className="font-display text-2xl font-extrabold">{t('parent.welcome')}</h1>
          )}
          {DEMO.demoMode && (
            <p
              data-testid="parent-demo-chip"
              className="self-start rounded-full bg-coin-soft px-3 py-1 text-sm font-bold text-ink"
            >
              {t('pro.demoTitle')}
            </p>
          )}
          <SegmentedTabs
            tabs={TABS.map((value) => {
              const Icon = ICONS[value]
              // the demo has no purchases: the PRO tab is where promo codes are typed in
              const key = value === 'pro' && !DEMO.publicProUIEnabled ? 'promo' : value
              return { value, symbol: <Icon size={22} />, label: t(`parent.tabs.${key}`) }
            })}
            value={tab}
            onChange={(next) => setParams({ tab: next }, { replace: true })}
            label={t('parent.tabs.label')}
            idBase="parent"
            showLabels="always"
          />
        </div>

        <ExitAlert onOpen={() => setParams({ tab: 'report' }, { replace: true })} />

        <div {...tabPanelProps('parent', tab)}>
          {tab === 'profiles' && (
            <ProfilesSection
              onCreated={(created) => {
                setSelectedId(created.id)
                // Stay on the list, so the new profile is visible at once.
                setParams({ tab: 'profiles' }, { replace: true })
              }}
            />
          )}
          {tab === 'report' && child && (
            <div className="flex flex-col gap-5">
              {children.length > 1 && <FamilyOverview family={children} selectedId={child.id} />}
              <ReportSection child={child} />
            </div>
          )}
          {tab === 'homework' && child && <HomeworkSection key={child.id} child={child} />}
          {tab === 'pro' && <ProSection />}
          {tab === 'settings' && <SettingsSection />}
        </div>
      </div>
    </ParentShell>
  )
}
