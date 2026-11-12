import { lazy, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AgeTheme } from '@/features/age/AgeTheme'
import { InterfaceSounds } from './InterfaceSounds'
import { LanguageSync } from './LanguageSync'
import { ParentGateAutoLock } from './ParentGateAutoLock'
import { SyncManager } from '@/services/sync/SyncManager'
import { CloudSyncBridge } from '@/services/cloud/CloudSyncBridge'
import { SpeechUnlock } from './SpeechUnlock'
import { SplashScreen } from './SplashScreen'
import { Toaster } from '@/components/ui/Toaster'
import { ExitWatcher } from './ExitWatcher'
import { PresenceBeacon } from './PresenceBeacon'
import { AppSettingsSync } from './AppSettingsSync'
import { HomeworkBridge } from '@/features/homework/HomeworkBridge'
import { PetBridge } from '@/features/pets/PetBridge'
import { SoundBridge } from './SoundBridge'
import { AnalyticsTracker } from './AnalyticsTracker'
import { NutConversion } from './NutConversion'
import { SectionWorld } from './SectionWorld'
import { isAdminPreview } from './preview/adminPreview'
import { useAttentionStore } from '@/store/attentionStore'

/**
 * The attention helper (Phase 58), downloaded only for a family that turned it on. MVP: a
 * grown-up turns it on in the parent area (Settings); a child is never asked on their screen.
 */
const AttentionHelper = lazy(async () => ({
  default: (await import('@/features/attention/AttentionHelper')).AttentionHelper,
}))

function Attention() {
  const consent = useAttentionStore((state) => state.consent)
  if (consent !== 'granted') return null
  return (
    <Suspense fallback={null}>
      <AttentionHelper />
    </Suspense>
  )
}

/** The admin's sandbox bar (Phase 51), only ever downloaded in that tab. */
const PreviewBanner = lazy(() => import('./preview/PreviewBanner'))

/** Root of every route: app-wide effects, then the current screen. */
export function AppShell() {
  const { pathname } = useLocation()
  return (
    <>
      {isAdminPreview() && (
        <Suspense fallback={null}>
          <PreviewBanner />
        </Suspense>
      )}
      <LanguageSync />
      <AgeTheme />
      <SectionWorld />
      <SpeechUnlock />
      <InterfaceSounds />
      <SyncManager />
      <CloudSyncBridge />
      <NutConversion />
      <ParentGateAutoLock />
      <ExitWatcher />
      <PresenceBeacon />
      <AppSettingsSync />
      <HomeworkBridge />
      <PetBridge />
      <SoundBridge />
      <AnalyticsTracker />
      <Outlet />
      <Attention />
      {!pathname.startsWith('/admin') && <SplashScreen />}
      <Toaster />
    </>
  )
}
