import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error -- a plain .mjs script, no type declarations
import { COMMANDS, DESCRIPTION, requests, setup, SHORT_DESCRIPTION } from './telegram-setup.mjs'

const TOKEN = '123456:test-token'
type Call = { url: string; body: Record<string, unknown> }

function mockFetch(
  answer: (call: Call, index: number) => Record<string, unknown> = () => ({ ok: true }),
) {
  const calls: Call[] = []
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const call = { url, body: JSON.parse(String(init.body)) as Record<string, unknown> }
    calls.push(call)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
    return Response.json(answer(call, calls.length - 1))
  })
  return { calls, fetch }
}

describe('scripts/telegram-setup.mjs', () => {
  it('sets commands, description and short description: default (Uzbek), uz, ru, en', async () => {
    const { calls, fetch } = mockFetch()
    const log: string[] = []
    expect(await setup(TOKEN, { fetch, log: (line: string) => log.push(line) })).toBe(0)
    expect(calls).toHaveLength(12)
    const methods = ['setMyCommands', 'setMyDescription', 'setMyShortDescription']
    for (const [index, call] of calls.entries()) {
      expect(call.url).toBe(`https://api.telegram.org/bot${TOKEN}/${methods[index % 3]}`)
    }
    expect(calls.map((c) => c.body.language_code)).toEqual(
      [undefined, 'uz', 'ru', 'en'].flatMap((code) => [code, code, code]),
    )
    expect(calls[0]!.body.commands).toEqual([
      { command: 'start', description: COMMANDS.uz.start },
      { command: 'hisobot', description: COMMANDS.uz.hisobot },
      { command: 'til', description: COMMANDS.uz.til },
      { command: 'stop', description: COMMANDS.uz.stop },
    ])
    expect(calls[7]!.body).toEqual({ description: DESCRIPTION.ru, language_code: 'ru' })
    expect(calls[11]!.body).toEqual({
      short_description: SHORT_DESCRIPTION.en,
      language_code: 'en',
    })
    // only "ok" per call; the token never reaches the output
    expect(log).toHaveLength(12)
    expect(log.every((line) => line.endsWith(': ok'))).toBe(true)
    expect(log.join('\n')).not.toContain('test-token')
  })

  it('keeps within Telegram’s limits, names /stop, and never grades or compares', () => {
    const forbidden =
      /yomon|zaif|orqada|ball|reyting|плох|слаб|отста|балл|рейтинг|\bbad\b|weak|behind|score|rank/i
    for (const lang of ['uz', 'ru', 'en'] as const) {
      expect(Object.keys(COMMANDS[lang])).toEqual(['start', 'hisobot', 'til', 'stop'])
      for (const text of Object.values(COMMANDS[lang]) as string[]) {
        expect(text.length).toBeGreaterThanOrEqual(1)
        expect(text.length).toBeLessThanOrEqual(256)
      }
      expect(DESCRIPTION[lang].length).toBeLessThanOrEqual(512)
      expect(SHORT_DESCRIPTION[lang].length).toBeLessThanOrEqual(120)
      for (const text of [DESCRIPTION[lang], SHORT_DESCRIPTION[lang]]) {
        expect(text).toContain('/stop')
        expect(text).not.toMatch(forbidden)
      }
    }
    // commands Telegram accepts: 1-32 lowercase letters, digits, underscores
    for (const { body } of requests().filter(
      (r: { method: string }) => r.method === 'setMyCommands',
    ))
      for (const { command } of body.commands as { command: string }[])
        expect(command).toMatch(/^[a-z0-9_]{1,32}$/)
  })

  it('reports an error code only, waits retry_after once on 429, and carries on', async () => {
    const { calls, fetch } = mockFetch((_, index) =>
      index === 0
        ? {
            ok: false,
            error_code: 429,
            description: 'Too Many Requests',
            parameters: { retry_after: 3 },
          }
        : index === 2
          ? { ok: false, error_code: 401, description: 'Unauthorized' }
          : { ok: true },
    )
    const waits: number[] = []
    const log: string[] = []
    const failed = await setup(TOKEN, {
      fetch,
      log: (line: string) => log.push(line),
      wait: async (ms: number) => void waits.push(ms),
    })
    expect(waits).toEqual([3000])
    expect(calls).toHaveLength(13) // the 429 call was sent again
    expect(failed).toBe(1)
    expect(log[1]).toBe('setMyDescription default: xato 401')
    expect(log.join('\n')).not.toMatch(/Unauthorized|Too Many|test-token/)
  })

  it('a network failure is an error code, not a crash', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('offline')
    })
    const log: string[] = []
    expect(await setup(TOKEN, { fetch, log: (line: string) => log.push(line) })).toBe(12)
    expect(log[0]).toBe('setMyCommands default: xato network')
  })
})
