import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()
vi.mock('./client', () => ({ getSupabase: () => ({ rpc }) }))

const {
  createTelegramCode,
  isTelegramBotName,
  listTelegramLinks,
  telegramStartUrl,
  unlinkTelegram,
  updateTelegramLink,
} = await import('./telegram')

describe('Telegram service (Phase 56)', () => {
  beforeEach(() => rpc.mockReset())

  it('asks the server for a one-time code and checks its shape', async () => {
    rpc.mockResolvedValueOnce({ data: 'f'.repeat(32), error: null })
    expect(await createTelegramCode('ru')).toEqual({ code: 'f'.repeat(32) })
    expect(rpc).toHaveBeenCalledWith('telegram_link_code', { p_language: 'ru' })
    rpc.mockResolvedValueOnce({ data: 'Aziz', error: null })
    expect(await createTelegramCode('uz')).toEqual({ error: 'failed' })
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'too_many_codes' } })
    expect(await createTelegramCode('uz')).toEqual({ error: 'too_many' })
  })

  it('reads the linked chats without any chat id', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: '3',
          language: 'en',
          weekly: true,
          daily: false,
          reminders: true,
          send_hour: 19,
          created_at: 'x',
        },
        {
          id: 4,
          language: '??',
          weekly: false,
          daily: true,
          reminders: false,
          send_hour: '8',
          created_at: 'y',
        },
      ],
      error: null,
    })
    expect(await listTelegramLinks()).toEqual([
      {
        id: 3,
        language: 'en',
        weekly: true,
        daily: false,
        reminders: true,
        sendHour: 19,
        createdAt: 'x',
      },
      {
        id: 4,
        language: 'uz',
        weekly: false,
        daily: true,
        reminders: false,
        sendHour: 8,
        createdAt: 'y',
      },
    ])
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    expect(await listTelegramLinks()).toBeNull()
  })

  it('saves settings and unlinks only when the server says so', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(
      await updateTelegramLink(3, {
        language: 'uz',
        weekly: true,
        daily: true,
        reminders: false,
        sendHour: 20,
      }),
    ).toBe(true)
    expect(rpc).toHaveBeenLastCalledWith('telegram_update_link', {
      p_id: 3,
      p_language: 'uz',
      p_weekly: true,
      p_daily: true,
      p_reminders: false,
      p_send_hour: 20,
    })
    rpc.mockResolvedValueOnce({ data: false, error: null })
    expect(await unlinkTelegram(9)).toBe(false)
  })

  it('builds the t.me link and knows a bot name', () => {
    expect(telegramStartUrl('KiddoBot', 'abc')).toBe('https://t.me/KiddoBot?start=abc')
    expect(isTelegramBotName('KiddoBot')).toBe(true)
    expect(isTelegramBotName('kiddo_uz_bot')).toBe(true)
    expect(isTelegramBotName('kiddo')).toBe(false)
    expect(isTelegramBotName('evil.com/bot')).toBe(false)
  })
})
