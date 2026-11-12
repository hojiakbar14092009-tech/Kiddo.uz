// Shared by the server's unit tests only: an in-memory libSQL database and request builders.
import { createClient } from '@libsql/client'
import { db, migrate, useDbForTests } from './db.js'
import { handle } from './router.js'
import { startSession } from './session.js'

export const ORIGIN = 'https://kiddo.test'

export async function freshDb(): Promise<void> {
  process.env.AUTH_SECRET = 'test-secret-'.padEnd(48, 'x')
  const client = createClient({ url: ':memory:' })
  useDbForTests(client)
  await migrate(client)
}

export async function makeUser(
  id: string,
  fields: { email?: string; phone?: string } = {},
): Promise<string> {
  const now = Date.now()
  await db().execute({
    sql: 'INSERT INTO users (id, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, fields.email ?? null, fields.phone ?? null, now, now],
  })
  const setCookie = await startSession(new Request(`${ORIGIN}/api/x`), id)
  return setCookie.split(';')[0]! // "name=value"
}

export function call(
  method: string,
  path: string,
  {
    cookie,
    body,
    origin = ORIGIN,
    headers = {},
  }: {
    cookie?: string
    body?: unknown
    origin?: string | null
    headers?: Record<string, string>
  } = {},
): Promise<Response> {
  const all: Record<string, string> = { ...headers }
  if (cookie) all.cookie = cookie
  if (origin) all.origin = origin
  if (body !== undefined) all['content-type'] = 'application/json'
  return handle(
    new Request(`${ORIGIN}/api/${path}`, {
      method,
      headers: all,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  )
}
