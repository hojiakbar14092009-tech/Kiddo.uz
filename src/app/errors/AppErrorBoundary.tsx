import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorScreen } from './ErrorScreen'

/** The last safety net around the whole app: never a blank white page. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ErrorScreen />}
      onError={(error) => console.error('[kiddo] app failed', error)}
    >
      {children}
    </ErrorBoundary>
  )
}
