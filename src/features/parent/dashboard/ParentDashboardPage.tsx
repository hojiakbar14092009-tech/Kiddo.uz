import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { tabPanelProps } from '@/components/ui/tabPanel'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { signOutCloud } from '@/services/supabase/auth'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { ParentShell } from '../ParentShell'
import { HomeworkSection } from './HomeworkSection'
import { ProfilesSection } from './ProfilesSection'
import { ReportSection } from './ReportSection'
import { SettingsSection } from './SettingsSection'

const TABS = ['report', 'profiles', 'homework', 'settings'] as const
type DashboardTab = (typeof TABS)[number]

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
  // Without any child there is nothing to report yet: start with adding a profile.
  const tab: DashboardTab = !child ? 'profiles' : isTab(requested) ? requested : 'report'

  const leave = async () => {
    if (session?.mode === 'cloud') await signOutCloud()
    signOut()
    navigate('/parent/login', { replace: true })
  }

  const icons: Record<DashboardTab, string> = {
    report: '📊',
    profiles: '👧',
    homework: '📝',
    settings: '⚙️',
  }

  return (
    <ParentShell
      actions={
        <button
          type="button"
          onClick={() => void leave()}
          className="min-h-12 rounded-full px-4 font-semibold text-ink-soft"
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
          <SegmentedTabs
            tabs={TABS.map((value) => ({
              value,
              symbol: icons[value],
              label: t(`parent.tabs.${value}`),
            }))}
            value={tab}
            onChange={(next) => setParams({ tab: next }, { replace: true })}
            label={t('parent.tabs.label')}
            idBase="parent"
          />
        </div>

        <div {...tabPanelProps('parent', tab)}>
          {tab === 'profiles' && (
            <ProfilesSection onCreated={(created) => setSelectedId(created.id)} />
          )}
          {tab === 'report' && child && <ReportSection child={child} />}
          {tab === 'homework' && child && <HomeworkSection child={child} />}
          {tab === 'settings' && <SettingsSection />}
        </div>
      </div>
    </ParentShell>
  )
}
