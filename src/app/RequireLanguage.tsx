import { Navigate, Outlet } from 'react-router-dom'
import { useSettingsStore } from '@/store/settingsStore'

/** Child screens need a chosen language; otherwise start at the language picker. */
export function RequireLanguage() {
  const language = useSettingsStore((state) => state.language)
  return language ? <Outlet /> : <Navigate to="/" replace />
}
