import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ProSection } from './ProSection'

function show() {
  return render(
    <MemoryRouter>
      <ProSection />
    </MemoryRouter>,
  )
}

describe('ProSection Demo PRO switch', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is there in development and tests', () => {
    show()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('is not in a production build', () => {
    vi.stubEnv('PROD', true)
    show()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
