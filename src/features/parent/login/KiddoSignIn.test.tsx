import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentStore } from '@/store/parentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { KiddoSignIn } from './KiddoSignIn'
import { isInAppBrowser, isPhone, qrOf, secondsUntil, tgLink } from './signInText'

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
  it('a phone gets the tg:// link; in-app browsers are told apart', () => {
    expect(tgLink('https://t.me/kiddo_bot?start=abc_1')).toBe(
      'tg://resolve?domain=kiddo_bot&start=abc_1',
    )
    expect(isPhone('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isPhone('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe(false)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) Telegram-Android/11.2', {})).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) Instagram 300.0', {})).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/450.0]', {})).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) Safari/604.1', { TelegramWebviewProxy: {} })).toBe(
      true,
    )
    expect(isInAppBrowser('Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36', {})).toBe(false)
  })
  it('draws the bot link as a QR picture', async () => {
    expect(await qrOf('https://t.me/kiddo_bot?start=abc')).toMatch(/^data:image\/gif;base64,/)
  })
})

describe('KiddoSignIn', () => {
  it('Telegram: 3 steps, the bot tab opens in the tap, QR + copy for a computer, the code signs in', async () => {
    const user = userEvent.setup()
    const signedIn = vi.fn()
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() }
    vi.mocked(window.open).mockImplementation(() => tab as unknown as Window)
    render(<KiddoSignIn onSignedIn={signedIn} />)
    expect(await screen.findByTestId('telegram-sign-in')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(/bot buni o‘zi bosa olmaydi/)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Telefon raqamingiz/), '90 123 45 67')
    await user.click(screen.getByTestId('telegram-get-code'))
    expect(sent.find((call) => call.path === 'auth/telegram/start')!.body).toMatchObject({
      phone: '+998901234567',
    })
    // opened before the request (a pop-up blocker allows only that), pointed at the bot after it
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(tab.location.href).toMatch(/^https:\/\/t\.me\/kiddo_bot\?start=t{32}$/)
    expect(tab.opener).toBeNull()
    expect(screen.queryByText(/Bot o‘zi ochilmadimi/)).toBeNull()
    expect(screen.getByTestId('telegram-open')).toHaveAttribute('href', tab.location.href)
    expect(await screen.findByTestId('telegram-qr')).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\/gif/),
    )
    expect(screen.getByRole('button', { name: 'Havolani nusxalash' })).toBeInTheDocument()
    // resend waits 30 s (no code yet is normal for a moment)
    expect(screen.getByTestId('telegram-resend')).toBeDisabled()
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

  it('Telegram: a blocked pop-up leaves the big “Open the bot” button and the hint', async () => {
    const user = userEvent.setup()
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await user.type(await screen.findByLabelText(/Telefon raqamingiz/), '901234567')
    await user.click(screen.getByTestId('telegram-get-code'))
    expect(await screen.findByText(/Bot o‘zi ochilmadimi/)).toBeInTheDocument()
    expect(screen.getByTestId('telegram-open')).toHaveTextContent('Botni ochish')
    expect(screen.getByTestId('telegram-open')).toHaveAttribute('target', '_blank')
  })

  it('Telegram: a failed start closes the tab opened for it', async () => {
    const user = userEvent.setup()
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() }
    vi.mocked(window.open).mockImplementation(() => tab as unknown as Window)
    routes['POST auth/telegram/start'] = { status: 429, body: { error: 'rate_limited' } }
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await user.type(await screen.findByLabelText(/Telefon raqamingiz/), '901234567')
    await user.click(screen.getByTestId('telegram-get-code'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Juda tez-tez')
    expect(tab.close).toHaveBeenCalled()
  })

  it('Google inside an in-app browser: a warning with a copy button, Telegram still there', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 14) Telegram-Android/11.2',
    )
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign, origin: 'https://kiddo.uz' })
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await user.click(await screen.findByTestId('login-google'))
    expect(assign).not.toHaveBeenCalled()
    expect(screen.getByTestId('in-app-browser')).toHaveTextContent('Safari yoki Chrome')
    expect(screen.getByRole('button', { name: 'Havolani nusxalash' })).toBeInTheDocument()
    expect(screen.getByTestId('telegram-sign-in')).toBeInTheDocument()
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

  it('no Telegram and no e-mail set up: the hint leads to the Google button', async () => {
    const user = userEvent.setup()
    routes['GET auth/methods'] = { body: { google: true, email: false, telegram: true } }
    render(<KiddoSignIn onSignedIn={() => undefined} />)
    await screen.findByTestId('telegram-sign-in')
    await user.click(screen.getByRole('button', { name: /Telegram yo‘qmi/ }))
    expect(screen.getByTestId('login-google')).toHaveFocus()
  })
})
