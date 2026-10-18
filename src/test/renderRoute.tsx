import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/app/routes'
import '@/i18n'

/** Renders the real route tree at `path`, like the app does in the browser. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const view = render(<RouterProvider router={router} />)
  return { ...view, router, user }
}
