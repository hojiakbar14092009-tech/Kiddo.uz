import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentStore } from '@/store/parentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { KiddoSignIn } from './KiddoSignIn'
import { qrOf, secondsUntil } from './signInText'

type Reply = { status?: number; body: unknown }
let routes: Record<string, Reply | ((body: unknown) => Reply)>
const sent: { path: string; body: unknown }[] = []

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useParentStore.setState({ session: null })
  sent.length = 0
  routes = {
    'GET auth/methods': { body: { google: true, email: true, telegram: true } },
    'POST auth/telegram/start': {
      body: { token: 't'.repeat(32), link: `https://t.me/kiddo_bot?start=${'t'.repeat(32)}` },
    },
    'GET auth/telegram/status': { body: { status: 'code_sent', resendAt: null } },
    'POST auth/telegram/verify': { body: { ok: true } },
    'GET me': { body: { user: { id: 'u1', email: null, phone: '+998901234567' } } },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = url.replace('/api/', '').split('?')[0]!
      const body = init.body ? JSON.parse(String(init.body)) : undefined
      sent.push({ path, body })
      const route = routes[`${init.method ?? 'GET'} ${path}`]
      const reply =
        typeof route === 'function'
          ? route(body)
          : (route ?? { status: 404, body: { error: 'not_found' } })
      return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 })
    }),
  )
  vi.spyOn(window, 'open').mockImplementation(() => null)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('helpers', () => {
  it('counts down whole seconds and never below zero', () => {
    expect(secondsUntil(null, 0)).toBe(0)
    expect(secondsUntil(30_000, 0)).toBe(30)
    expect(secondsUntil(1_000, 5_000)).toBe(0)
  })
  it('draws the bot link as a QR picture', async () => {
    expect(await qrOf('https://t.me/kiddo_bot?start=abc')).toMatch(/^data:image\/gif;base64,/)
  })
})

describe('KiddoSignIn', () => {
  it('Telegram: 4 steps, the deep link opens, QR + copy for a computer, the code signs in', async () => {
    const user = userEvent.setup()
    const signedIn = vi.fn()
    render(<KiddoSignIn onSignedIn={signedIn} />)
    expect(await screen.findByTestId('telegram-sign-in')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    await user.type(screen.getByLabelText(/Telefon raqamingiz/), '90 123 45 67')
    await user.click(screen.getByTestId('telegram-get-code'))
    expect(sent.find((call) => call.path === 'auth/telegram/start')!.body).toMatchObject({
      phone: '+998901234567',
    })
    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/t\.me\/kiddo_bot\?start=t{32}$/),
      '_blank',
      'noopener',
    )
    expect(await screen.findByTestId('telegram-qr')).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/gif/),
    )
    expect(screen.getByRole('button', { name: 'Havolani nusxalash' })).toBeInTheDocument()
    // resend and reopen wait 30 s (no code yet is normal for a moment)
    expect(screen.getByTestId('telegram-resend')).toBeDisabled()
    expect(screen.getByTestId('telegram-reopen')).toBeDisabled()
    await user.type(screen.getByLabelText('6 xonali kod'), '123456')
    await user.click(screen.getByRole('button', { name: 'Kirish' }))
    expect(signedIn).toHaveBeenCalled()
    expect(useParentStore.getState().session).toMatchObject({ mode: 'cloud', userId: 'u1' })
  })

  it('Telegram: the waiting screen follows the server and says when the link expired', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    routes['GET auth/telegram/status'] = { body: { status: 'expired', resendAt: null } }
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await user.type(await screen.findByLabelText(/Telefon raqamingiz/), '901234567')
    await user.click(screen.getByTestId('telegram-get-code'))
    expect(await screen.findByTestId('telegram-status')).toHaveTextContent('Kutyapmiz')
    await act(() => vi.advanceTimersByTimeAsync(3_100))
    expect(await screen.findByText(/Havola eskirdi/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Qaytadan boshlash' })).toBeInTheDocument()
  })

  it('Telegram: after 30 s resend works; the server’s limit is shown as a countdown', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    routes['POST auth/telegram/resend'] = {
      status: 429,
      body: { error: 'rate_limited', retryAfter: 20 },
    }
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await user.type(await screen.findByLabelText(/Telefon raqamingiz/), '901234567')
    await user.click(screen.getByTestId('telegram-get-code'))
    await act(() => vi.advanceTimersByTimeAsync(31_000))
    expect(screen.getByTestId('telegram-resend')).toBeEnabled()
    await user.click(screen.getByTestId('telegram-resend'))
    expect(await screen.findByText(/Qayta yuborish 2\d soniyadan keyin/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Juda tez-tez')
  })

  it('no Telegram: one tap leads to e-mail; a way the server has not set up is hidden', async () => {
    const user = userEvent.setup()
    routes['GET auth/methods'] = { body: { google: false, email: true, telegram: true } }
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await screen.findByTestId('telegram-sign-in')
    expect(screen.queryByTestId('login-google')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Telegram yo‘qmi/ }))
    expect(screen.getByTestId('email-sign-in')).toBeInTheDocument()
  })
})
