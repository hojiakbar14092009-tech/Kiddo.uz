import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { NotifyPanel } from './NotifyPanel'
import { NOTIFY_PANEL_TEXT, type NotifySettings } from './notifyPanelText'

const OFF: NotifySettings = {
  weekly: false,
  events: false,
  linked: false,
  language: 'uz',
  viaTelegram: false,
}
const calls: { path: string; method: string; body: unknown }[] = []
let server: NotifySettings

function mockApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input).replace('/api/', '')
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ path, method, body })
    if (path === 'notify/link')
      return Response.json({ link: 'https://t.me/kiddo_bot?start=link_abc' })
    if (method === 'PUT')
      server = { ...server, ...body, linked: server.viaTelegram || server.linked }
    return Response.json(server)
  })
}

describe('the Telegram notifications panel', () => {
  beforeEach(() => {
    calls.length = 0
    server = { ...OFF }
    useSettingsStore.setState({ language: 'ru' })
    mockApi()
  })
  afterEach(() => vi.restoreAllMocks())

  it('starts off; turning on asks for a one-time link when no Telegram sign-in', async () => {
    render(<NotifyPanel />)
    const weekly = await screen.findByTestId('notify-weekly')
    expect(weekly).not.toBeChecked()
    expect(screen.getByTestId('notify-events')).not.toBeChecked()
    expect(screen.getByText(NOTIFY_PANEL_TEXT.ru.title)).toBeInTheDocument()
    fireEvent.click(weekly)
    await waitFor(() => expect(screen.getByTestId('notify-weekly')).toBeChecked())
    // the first switch-on carries the app's language
    expect(calls.find((c) => c.method === 'PUT')!.body).toEqual({ weekly: true, language: 'ru' })
    fireEvent.click(screen.getByTestId('notify-get-link'))
    const open = await screen.findByTestId('notify-open-bot')
    expect(open).toHaveAttribute('href', 'https://t.me/kiddo_bot?start=link_abc')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')
    // later changes keep the language the parent may have picked with /til
    fireEvent.click(screen.getByTestId('notify-events'))
    await waitFor(() => expect(screen.getByTestId('notify-events')).toBeChecked())
    expect(calls.filter((c) => c.method === 'PUT').at(-1)!.body).toEqual({ events: true })
  })

  it('a Telegram sign-in is linked as soon as it is turned on; it can be turned off', async () => {
    server = { ...OFF, viaTelegram: true }
    render(<NotifyPanel />)
    fireEvent.click(await screen.findByTestId('notify-weekly'))
    expect(await screen.findByTestId('notify-linked')).toBeInTheDocument()
    expect(screen.queryByTestId('notify-get-link')).toBeNull()
    fireEvent.click(screen.getByTestId('notify-weekly'))
    await waitFor(() => expect(screen.getByTestId('notify-weekly')).not.toBeChecked())
    expect(screen.queryByTestId('notify-linked')).toBeNull()
  })

  it('says so when the server cannot be reached', async () => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: 'x' }, { status: 400 }))
    render(<NotifyPanel />)
    expect(await screen.findByRole('alert')).toHaveTextContent(NOTIFY_PANEL_TEXT.ru.error)
  })
})
