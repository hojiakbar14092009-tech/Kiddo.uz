import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppErrorBoundary } from './errors/AppErrorBoundary'
import { routes } from './routes'

export function App() {
  const router = useMemo(() => createBrowserRouter(routes), [])
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  )
}
