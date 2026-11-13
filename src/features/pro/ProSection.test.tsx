import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO } from '@/config/demo'
import i18n from '@/i18n'
import { isProActive, useSubscriptionStore } from '@/store/subscriptionStore'
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

describe('ProSection: buying Pro', () => {
  // the demo build (tests) hides the plans: shown here as on the public site
  beforeEach(() => vi.spyOn(DEMO, 'publicProUIEnabled', 'get').mockReturnValue(true))
  afterEach(() => vi.restoreAllMocks())

  it('asks the grown-ups question first; "Back" buys nothing', () => {
    show()
    const before = isProActive(useSubscriptionStore.getState())
    // the pay button reads "<amount> so‘m to‘lash" (or the same in another language)
    const [pre, post] = i18n.t('pro.pay', { amount: '§' }).split('§') as [string, string]
    const pay = screen.getAllByRole('button').find((button) => {
      const text = button.textContent ?? ''
      return text.length > pre.length + post.length && text.startsWith(pre) && text.endsWith(post)
    })!
    expect(pay).toBeEnabled()
    fireEvent.click(pay)
    expect(screen.getByRole('dialog', { name: i18n.t('parent.gate.title') })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('parent.gate.cancel') }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(isProActive(useSubscriptionStore.getState())).toBe(before)
    expect(pay).toBeEnabled()
  })
})
