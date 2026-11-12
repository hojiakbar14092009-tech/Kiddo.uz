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
import { useSettingsStore } from '@/store/settingsStore'
import { toursOff } from '@/features/onboarding/tour'

/**
 * The attention helper (Phase 58) and its one-time question: downloaded only for a
 * family that turned it on, or while the question is still to be asked, so the
 * first screen stays light.
 */
const AttentionHelper = lazy(async () => ({
  default: (await import('@/features/attention/AttentionHelper')).AttentionHelper,
}))
const AttentionConsent = lazy(async () => ({
  default: (await import('@/features/attention/AttentionConsent')).AttentionConsent,
}))

function Attention() {
  const consent = useAttentionStore((state) => state.consent)
  const onboarded = useSettingsStore((state) => state.onboarded)
  // the question waits for the welcome tour (and is off in other features' browser tests)
  if (consent === 'denied' || (consent === 'unasked' && (!onboarded || toursOff()))) return null
  return (
    <Suspense fallback={null}>
      {consent === 'granted' ? <AttentionHelper /> : <AttentionConsent />}
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
