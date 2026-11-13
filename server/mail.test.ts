import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const options: Record<string, unknown>[] = []
const sent: Record<string, unknown>[] = []
vi.mock('nodemailer', () => ({
  createTransport: (opts: Record<string, unknown>) => {
    options.push(opts)
    return { sendMail: async (mail: Record<string, unknown>) => void sent.push(mail) }
  },
}))

const { sendMail } = await import('./auth.js')
const { errorSummary } = await import('./http.js')
const { call, freshDb } = await import('./testHelpers.js')
const { useMailerForTests } = await import('./auth.js')

beforeEach(() => {
  options.length = 0
  sent.length = 0
  Object.assign(process.env, {
    SMTP_HOST: 'smtp.test',
    SMTP_PORT: '587',
    SMTP_USER: 'login-user',
    SMTP_PASS: 'secret-pass',
    SMTP_FROM: 'Kiddo <no-reply@kiddo.test>',
  })
})
afterEach(() => vi.restoreAllMocks())

describe('SMTP transport', () => {
  it('587: STARTTLS required, short timeouts (inside Vercel’s 10 s), settings read from the environment', async () => {
    await sendMail('to@x.uz', 'subject', 'body')
    expect(options[0]).toMatchObject({
      host: 'smtp.test',
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      auth: { user: 'login-user', pass: 'secret-pass' },
    })
    expect(sent[0]).toMatchObject({ from: 'Kiddo <no-reply@kiddo.test>', to: 'to@x.uz' })
  })

  it('465: implicit TLS', async () => {
    process.env.SMTP_PORT = '465'
    await sendMail('to@x.uz', 's', 'b')
    expect(options[0]).toMatchObject({ port: 465, secure: true, requireTLS: false })
  })
})

describe('a failed e-mail is logged with a safe reason and the user text does not change', () => {
  it('names the error code, hides the address and never logs a password', async () => {
    await freshDb()
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    useMailerForTests(async () => {
      throw Object.assign(
        new Error('Invalid login: 535 Authentication failed for mama@gmail.com'),
        {
          code: 'EAUTH',
          responseCode: 535,
          command: 'AUTH PLAIN',
        },
      )
    })
    const response = await call('POST', 'auth/email/start', {
      body: { email: 'mama@gmail.com', language: 'uz' },
      headers: { 'x-real-ip': '1.2.3.4' },
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'server_error' })
    const line = log.mock.calls.flat().join(' ')
    expect(line).toContain('POST auth/email/start')
    expect(line).toContain('EAUTH 535 AUTH PLAIN')
    expect(line).toContain('<email>')
    expect(line).not.toMatch(/mama@gmail\.com|secret-pass/)
  })

  it('errorSummary: other errors, long messages, non-errors', () => {
    expect(errorSummary(new TypeError('boom'))).toBe('TypeError: boom')
    expect(errorSummary('text')).toBe('unknown')
    expect(errorSummary(new Error('x'.repeat(500))).length).toBeLessThanOrEqual(135)
  })
})
