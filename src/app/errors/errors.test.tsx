import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { AppErrorBoundary } from './AppErrorBoundary'
import { RouteErrorScreen } from './RouteErrorScreen'
import { isStaleBuildError, reloadForUpdate, resetReloadStateForTests } from './staleBuild'

function Broken({ error }: { error: Error }): never {
  throw error
}

function renderBrokenRoute(error: Error) {
  const router = createMemoryRouter(
    [{ path: '/', element: <Broken error={error} />, errorElement: <RouteErrorScreen /> }],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('error screens', () => {
  const reload = vi.fn()
  const realLocation = window.location

  beforeEach(async () => {
    await i18n.changeLanguage('uz')
    sessionStorage.clear()
    resetReloadStateForTests()
    reload.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
  })

  it('a screen that crashes shows a calm page with “try again” and “home”, never a blank page', () => {
    renderBrokenRoute(new Error('boom'))
    expect(screen.getByTestId('error-screen')).toBeTruthy()
    expect(screen.getByRole('heading', { name: i18n.t('errors.title') })).toBeTruthy()
    expect(screen.getByRole('button', { name: i18n.t('errors.retry') })).toBeTruthy()
    expect(screen.getByRole('link', { name: i18n.t('common.home') }).getAttribute('href')).toBe(
      '/home',
    )
    expect(screen.queryByText('boom')).toBeNull()
    expect(reload).not.toHaveBeenCalled()
  })

  it('a file missing after a new deploy reloads once, then shows the page instead of looping', () => {
    const stale = new TypeError('Failed to fetch dynamically imported module: /assets/x.js')
    const first = renderBrokenRoute(stale)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: i18n.t('errors.updatingTitle') })).toBeTruthy()
    first.unmount()
    resetReloadStateForTests() // the page reloaded; the session remembers it

    renderBrokenRoute(stale)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: i18n.t('errors.title') })).toBeTruthy()
  })

  it('recognises stale-build errors from the browsers', () => {
    expect(isStaleBuildError(new TypeError('Failed to fetch dynamically imported module'))).toBe(
      true,
    )
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleBuildError({ message: 'Unable to preload CSS for /assets/a.css' })).toBe(true)
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(reloadForUpdate(1_000)).toBe(true)
    resetReloadStateForTests()
    expect(reloadForUpdate(30_000)).toBe(false)
    expect(reloadForUpdate(1_000 + 61_000)).toBe(true)
    resetReloadStateForTests()
    // storage blocked: no reload at all, so an offline page can never loop
    sessionStorage.clear()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(reloadForUpdate(200_000)).toBe(false)
  })

  it('the app-wide net catches anything outside the router too', () => {
    render(
      <AppErrorBoundary>
        <Broken error={new Error('outside')} />
      </AppErrorBoundary>,
    )
    expect(screen.getByTestId('error-screen')).toBeTruthy()
  })
})
