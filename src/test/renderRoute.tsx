import { render, waitFor } from '@testing-library/react'
import userEvent, { type Options } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/app/routes'
import '@/i18n'

/**
 * Renders the real route tree at `path`, like the app does in the browser,
 * and waits until lazily loaded screens have arrived.
 */
export async function renderRoute(path: string, userOptions?: Options) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup(userOptions)
  const view = render(<RouterProvider router={router} />)
  await waitFor(
    () => {
      const loading =
        !router.state.initialized ||
        router.state.navigation.state !== 'idle' ||
        view.container.querySelector('[data-loading-screen]') !== null
      if (loading) {
        throw new Error('The router is still loading a screen')
      }
    },
    { timeout: 10_000 },
  ) // the first lazy import of a route can be slow on a busy machine
  return { ...view, router, user }
}
