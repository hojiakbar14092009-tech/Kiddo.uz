import { render } from '@testing-library/react'
import userEvent, { type Options } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/app/routes'
import '@/i18n'

/** Renders the real route tree at `path`, like the app does in the browser. */
export function renderRoute(path: string, userOptions?: Options) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup(userOptions)
  const view = render(<RouterProvider router={router} />)
  return { ...view, router, user }
}
