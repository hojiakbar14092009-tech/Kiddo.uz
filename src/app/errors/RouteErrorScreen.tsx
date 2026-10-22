import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { ErrorScreen } from './ErrorScreen'
import {
  canReloadForUpdate,
  isReloadingForUpdate,
  isStaleBuildError,
  reloadForUpdate,
} from './staleBuild'

/**
 * The router's error screen: a screen that failed to render or to load.
 * A file missing after a new deploy reloads once to get the new version.
 */
export function RouteErrorScreen() {
  const error = useRouteError()
  // a stale file reloads once (shown as "updating"); after that, the normal error page.
  // A reload already started (vite:preloadError) also shows "updating": the failed
  // import then surfaces here as an unrelated-looking error.
  const updating = isReloadingForUpdate() || (isStaleBuildError(error) && canReloadForUpdate())

  useEffect(() => {
    console.error('[kiddo] screen failed', error)
    if (updating) reloadForUpdate()
  }, [error, updating])

  return <ErrorScreen updating={updating} />
}
