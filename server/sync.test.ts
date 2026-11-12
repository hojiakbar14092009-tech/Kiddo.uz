// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db.js'
import { call, freshDb, makeUser } from './testHelpers.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test reads arbitrary saved JSON
type Synced = { keys: Record<string, { rev: number; data: any }> }

describe('cloud progress (sync) and its security', () => {
  let alice = ''
  let bob = ''
  beforeEach(async () => {
    await freshDb()
    alice = await makeUser('alice')
    bob = await makeUser('bob')
  })

  it('refuses a request without a session cookie', async () => {
    expect((await call('GET', 'sync')).status).toBe(401)
    expect((await call('PUT', 'sync', { body: { changes: { family: { baseRev: 0, data: {} } } } })).status).toBe(401)
    expect((await call('GET', 'me')).status).toBe(401)
  })

  it('refuses a forged session and a write from another site (CSRF)', async () => {
    expect((await call('GET', 'sync', { cookie: 'kiddo_session=forged' })).status).toBe(401)
    const body = { changes: { family: { baseRev: 0, data: { a: 1 } } } }
    expect((await call('PUT', 'sync', { cookie: alice, body, origin: 'https://evil.example' })).status).toBe(403)
    expect((await call('PUT', 'sync', { cookie: alice, body, origin: null })).status).toBe(403)
  })

  it('a user only ever sees and changes their own family', async () => {
    const put = await call('PUT', 'sync', { cookie: alice, body: { changes: { family: { baseRev: 0, data: { children: [{ id: 'k1', name: 'Aziz' }] } } } } })
    expect(put.status).toBe(200)
    expect(await put.json()).toEqual({ revs: { family: 1 } })
    // Bob reads: nothing of Alice's
    expect(await (await call('GET', 'sync', { cookie: bob })).json()).toEqual({ keys: {} })
    // Bob writes "family": his own row, Alice's stays
    await call('PUT', 'sync', { cookie: bob, body: { changes: { family: { baseRev: 0, data: { children: [] } } } } })
    const mine = (await (await call('GET', 'sync', { cookie: alice })).json()) as Synced
    expect(mine.keys.family!.data.children[0].name).toBe('Aziz')
  })

  it('writes all changes in one go, refuses a stale revision with the current copy (no silent overwrite)', async () => {
    const first = await call('PUT', 'sync', { cookie: alice, body: { changes: { progress: { baseRev: 0, data: { v: 1 } }, learn: { baseRev: 0, data: { v: 1 } } } } })
    expect(await first.json()).toEqual({ revs: { progress: 1, learn: 1 } })
    await call('PUT', 'sync', { cookie: alice, body: { changes: { progress: { baseRev: 1, data: { v: 2 } } } } })
    // another device still on revision 1
    const stale = await call('PUT', 'sync', { cookie: alice, body: { changes: { progress: { baseRev: 1, data: { v: 'old' } }, learn: { baseRev: 1, data: { v: 2 } } } } })
    expect(stale.status).toBe(409)
    expect(await stale.json()).toEqual({ revs: { learn: 2 }, conflicts: { progress: { rev: 2, data: { v: 2 } } } })
    // the same request sent twice (a retry after a lost answer) changes nothing the second time
    const again = await call('PUT', 'sync', { cookie: alice, body: { changes: { learn: { baseRev: 1, data: { v: 2 } } } } })
    expect(again.status).toBe(409)
    const state = (await (await call('GET', 'sync', { cookie: alice })).json()) as Synced
    expect(state.keys.learn).toEqual({ rev: 2, data: { v: 2 } })
  })

  it('answers 304 when nothing changed since the copy the device has', async () => {
    await call('PUT', 'sync', { cookie: alice, body: { changes: { family: { baseRev: 0, data: {} } } } })
    const first = await call('GET', 'sync', { cookie: alice })
    const etag = first.headers.get('etag')!
    expect((await call('GET', 'sync', { cookie: alice, headers: { 'if-none-match': etag } })).status).toBe(304)
  })

  it('refuses unknown stores, bad revisions and oversized data', async () => {
    expect((await call('PUT', 'sync', { cookie: alice, body: { changes: { subscription: { baseRev: 0, data: { pro: true } } } } })).status).toBe(400)
    expect((await call('PUT', 'sync', { cookie: alice, body: { changes: { family: { baseRev: -1, data: {} } } } })).status).toBe(400)
    const big = 'x'.repeat(600 * 1024)
    expect((await call('PUT', 'sync', { cookie: alice, body: { changes: { family: { baseRev: 0, data: big } } } })).status).toBe(413)
  })

  it('every hot query uses an index (EXPLAIN QUERY PLAN), never a full scan', async () => {
    const plans = [
      ['SELECT user_id FROM sessions WHERE id_hash = ?', ['x']],
      ['SELECT key, rev, data FROM user_state WHERE user_id = ?', ['x']],
      ['SELECT plan FROM subscriptions WHERE user_id = ?', ['x']],
      ['SELECT id FROM auth_codes WHERE channel = ? AND target = ? ORDER BY created_at DESC LIMIT 1', ['email', 'x']],
      ['SELECT status FROM telegram_logins WHERE token_hash = ?', ['x']],
      ['SELECT phone FROM telegram_logins WHERE telegram_user_id = ? ORDER BY created_at DESC LIMIT 1', ['1']],
      ['SELECT id FROM payments WHERE user_id = ? AND idempotency_key = ?', ['x', 'k']],
      ['SELECT id FROM users WHERE email = ?', ['a@b.c']],
      ['SELECT id FROM users WHERE phone = ?', ['+998901234567']],
    ] as const
    for (const [sql, args] of plans) {
      const plan = await db().execute({ sql: `EXPLAIN QUERY PLAN ${sql}`, args: [...args] })
      const detail = plan.rows.map((row) => String(row.detail)).join(' | ')
      expect(detail, sql).toMatch(/USING (INDEX|PRIMARY KEY|COVERING INDEX)/)
      expect(detail, sql).not.toMatch(/^SCAN /)
    }
  })
})
