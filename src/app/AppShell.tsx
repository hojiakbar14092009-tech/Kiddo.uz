import { Outlet, useLocation } from 'react-router-dom'
import { AgeTheme } from '@/features/age/AgeTheme'
import { InterfaceSounds } from './InterfaceSounds'
import { LanguageSync } from './LanguageSync'
import { ParentGateAutoLock } from './ParentGateAutoLock'
import { SyncManager } from '@/services/sync/SyncManager'
import { SpeechUnlock } from './SpeechUnlock'
import { SplashScreen } from './SplashScreen'
import { Toaster } from '@/components/ui/Toaster'
import { ExitWatcher } from './ExitWatcher'
import { PresenceBeacon } from './PresenceBeacon'
import { AppSettingsSync } from './AppSettingsSync'

/** Root of every route: app-wide effects, then the current screen. */
export function AppShell() {
  const { pathname } = useLocation()
  return (
    <>
      <LanguageSync />
      <AgeTheme />
      <SpeechUnlock />
      <InterfaceSounds />
      <SyncManager />
      <ParentGateAutoLock />
      <ExitWatcher />
      <PresenceBeacon />
      <AppSettingsSync />
      <Outlet />
      {!pathname.startsWith('/admin') && <SplashScreen />}
      <Toaster />
    </>
  )
}
