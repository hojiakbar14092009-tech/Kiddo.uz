import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LanguageSync } from './LanguageSync'
import { routes } from './routes'
import { SpeechUnlock } from './SpeechUnlock'

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), [])

  return (
    <>
      <LanguageSync />
      <SpeechUnlock />
      <RouterProvider router={router} />
    </>
  )
}
