import { Outlet } from 'react-router-dom'
import { InterfaceSounds } from './InterfaceSounds'
import { LanguageSync } from './LanguageSync'
import { SpeechUnlock } from './SpeechUnlock'

/** Root of every route: app-wide effects, then the current screen. */
export function AppShell() {
  return (
    <>
      <LanguageSync />
      <SpeechUnlock />
      <InterfaceSounds />
      <Outlet />
    </>
  )
}
