import { Outlet } from 'react-router-dom'
import { AgeTheme } from '@/features/age/AgeTheme'
import { InterfaceSounds } from './InterfaceSounds'
import { LanguageSync } from './LanguageSync'
import { ParentGateAutoLock } from './ParentGateAutoLock'
import { SyncManager } from '@/services/sync/SyncManager'
import { SpeechUnlock } from './SpeechUnlock'
import { SplashScreen } from './SplashScreen'
import { ExitWatcher } from './ExitWatcher'

/** Root of every route: app-wide effects, then the current screen. */
export function AppShell() {
  return (
    <>
      <LanguageSync />
      <AgeTheme />
      <SpeechUnlock />
      <InterfaceSounds />
      <SyncManager />
      <ParentGateAutoLock />
      <ExitWatcher />
      <Outlet />
      <SplashScreen />
    </>
  )
}
