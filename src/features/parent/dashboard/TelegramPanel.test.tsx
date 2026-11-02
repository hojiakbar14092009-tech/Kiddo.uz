import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'

const service = vi.hoisted(() => ({
  createTelegramCode: vi.fn(),
  listTelegramLinks: vi.fn(),
  updateTelegramLink: vi.fn(),
  unlinkTelegram: vi.fn(),
}))

vi.mock('@/services/supabase/telegram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/supabase/telegram')>()),
  ...service,
}))

const { TelegramPanel } = await import('./TelegramPanel')

const LINK = {
  id: 7,
  language: 'uz' as const,
  weekly: true,
  daily: false,
  reminders: true,
  sendHour: 19,
  createdAt: '2026-11-02T10:00:00Z',
}

describe('Telegram panel (Phase 56)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    for (const fn of Object.values(service)) fn.mockReset()
    service.listTelegramLinks.mockResolvedValue([])
  })

  it('without a cloud account it only explains; nothing is asked of the server', () => {
    render(<TelegramPanel cloud={false} bot="KiddoBot" />)
    expect(screen.getByTestId('telegram-need-cloud')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Telegramga ulash' })).toBeNull()
    expect(service.listTelegramLinks).not.toHaveBeenCalled()
  })

  it('without a bot in the build it says the bot is not set up', () => {
    render(<TelegramPanel cloud bot="" />)
    expect(screen.getByTestId('telegram-no-bot')).toBeInTheDocument()
    render(<TelegramPanel cloud bot="not a bot" />)
    expect(screen.getAllByTestId('telegram-no-bot')).toHaveLength(2)
  })

  it('gives a one-time t.me link in the app language, then lists the chat once linked', async () => {
    const user = userEvent.setup()
    service.createTelegramCode.mockResolvedValue({ code: 'ab'.repeat(16) })
    render(<TelegramPanel cloud bot="KiddoBot" />)
    expect(await screen.findByText('Hali hech qanday chat ulanmagan.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Telegramga ulash' }))
    expect(service.createTelegramCode).toHaveBeenCalledWith('uz')
    const open = await screen.findByTestId('telegram-open')
    expect(open).toHaveAttribute('href', `https://t.me/KiddoBot?start=${'ab'.repeat(16)}`)
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText(/10 daqiqa amal qiladi/)).toBeInTheDocument()
    service.listTelegramLinks.mockResolvedValue([LINK])
    await user.click(screen.getByRole('button', { name: 'Ulandimi? Yangilash' }))
    expect(await screen.findByTestId('telegram-link')).toBeInTheDocument()
    // the link was used: it is not left on screen
    expect(screen.queryByTestId('telegram-open')).toBeNull()
  })

  it('says when too many links were made, or the link failed', async () => {
    const user = userEvent.setup()
    service.createTelegramCode.mockResolvedValueOnce({ error: 'too_many' })
    render(<TelegramPanel cloud bot="KiddoBot" />)
    await user.click(screen.getByRole('button', { name: 'Telegramga ulash' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('juda ko‘p havola')
    expect(screen.queryByTestId('telegram-open')).toBeNull()
  })

  it('changes a chat’s messages, language and hour, and disconnects it', async () => {
    const user = userEvent.setup()
    service.listTelegramLinks.mockResolvedValue([LINK])
    service.updateTelegramLink.mockResolvedValue(true)
    service.unlinkTelegram.mockResolvedValue(true)
    render(<TelegramPanel cloud bot="KiddoBot" />)
    const card = await screen.findByTestId('telegram-link')
    expect(card).toHaveAccessibleName('1-chat')
    await user.click(screen.getByRole('checkbox', { name: 'Kunlik qisqa xulosa' }))
    await user.click(screen.getByRole('radio', { name: 'Русский' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Xabar vaqti' }), '20')
    await user.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(service.updateTelegramLink).toHaveBeenCalledWith(7, {
      language: 'ru',
      weekly: true,
      daily: true,
      reminders: true,
      sendHour: 20,
    })
    // one tap only asks; "Qoldirish" keeps the chat
    await user.click(screen.getByRole('button', { name: 'Telegramdan uzish' }))
    expect(service.unlinkTelegram).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Qoldirish' }))
    await user.click(screen.getByRole('button', { name: 'Telegramdan uzish' }))
    await user.click(screen.getByRole('button', { name: 'Ha, uzish' }))
    expect(service.unlinkTelegram).toHaveBeenCalledWith(7)
    await waitFor(() => expect(screen.queryByTestId('telegram-link')).toBeNull())
  })

  it('a chat that could not be disconnected stays in the list', async () => {
    const user = userEvent.setup()
    service.listTelegramLinks.mockResolvedValue([LINK])
    service.unlinkTelegram.mockResolvedValue(false)
    render(<TelegramPanel cloud bot="KiddoBot" />)
    await user.click(await screen.findByRole('button', { name: 'Telegramdan uzish' }))
    await user.click(screen.getByRole('button', { name: 'Ha, uzish' }))
    expect(service.unlinkTelegram).toHaveBeenCalledWith(7)
    expect(screen.getByTestId('telegram-link')).toBeInTheDocument()
  })

  it('a chat linked again shows its fresh settings, not the old card', async () => {
    const user = userEvent.setup()
    service.listTelegramLinks.mockResolvedValue([{ ...LINK, daily: true }])
    service.createTelegramCode.mockResolvedValue({ code: 'cd'.repeat(16) })
    render(<TelegramPanel cloud bot="KiddoBot" />)
    expect(await screen.findByRole('checkbox', { name: 'Kunlik qisqa xulosa' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Telegramga ulash' }))
    service.listTelegramLinks.mockResolvedValue([
      { ...LINK, daily: false, createdAt: '2026-11-03T09:00:00Z' },
    ])
    await user.click(await screen.findByRole('button', { name: 'Ulandimi? Yangilash' }))
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Kunlik qisqa xulosa' })).not.toBeChecked(),
    )
  })

  it('says when the chats could not be read', async () => {
    service.listTelegramLinks.mockResolvedValue(null)
    render(<TelegramPanel cloud bot="KiddoBot" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Ulangan chatlarni o‘qib bo‘lmadi.')
  })
})
