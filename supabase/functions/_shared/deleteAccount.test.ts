import { describe, expect, it, vi } from 'vitest'
import {
  type DeleteAccountDeps,
  handleDeleteAccount,
  isDeleteConfirmation,
  ownPhotoPaths,
  REMOVE_CHUNK,
} from './deleteAccount.ts'

const ORIGIN = 'https://kiddo-uz.vercel.app'
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.signature-part'
const UID = '00000000-0000-0000-0000-0000000000f1'

function request(
  body: unknown,
  init: { token?: string | null; method?: string; origin?: string } = {},
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: init.origin ?? ORIGIN,
  }
  if (init.token !== null) headers.Authorization = `Bearer ${init.token ?? TOKEN}`
  const method = init.method ?? 'POST'
  return new Request('https://x.supabase.co/functions/v1/delete-account', {
    method,
    headers,
    body:
      method === 'GET' || method === 'OPTIONS'
        ? undefined
        : typeof body === 'string'
          ? body
          : JSON.stringify(body),
  })
}

function makeDeps(overrides: Partial<DeleteAccountDeps> = {}) {
  const objects = new Set([`${UID}/c1.jpg`, `${UID}/c2.jpg`, 'someone-else/c9.jpg'])
  const calls: string[] = []
  const deps = {
    objects,
    calls,
    env: (name: string) => (name === 'ALLOWED_ORIGINS' ? ORIGIN : undefined),
    userIdFromToken: vi.fn(async (token: string) => (token === TOKEN ? UID : null)),
    listPhotos: vi.fn(async (userId: string) => {
      calls.push('list')
      return [...objects].filter((p) => p.startsWith(`${userId}/`))
    }),
    removePhotos: vi.fn(async (paths: string[]) => {
      calls.push('remove')
      for (const p of paths) objects.delete(p)
    }),
    deleteUser: vi.fn(async () => {
      calls.push('deleteUser')
    }),
    log: vi.fn(),
    ...overrides,
  }
  return deps
}

const CONFIRM = { confirm: 'DELETE' }

describe('isDeleteConfirmation', () => {
  it('accepts only { confirm: "DELETE" } exactly', () => {
    expect(isDeleteConfirmation({ confirm: 'DELETE' })).toBe(true)
    for (const bad of [
      { confirm: 'delete' },
      { confirm: 'DELETE ' },
      { confirm: true },
      { confirm: 'DELETE', extra: 1 },
      {},
      ['DELETE'],
      'DELETE',
      null,
      undefined,
    ]) {
      expect(isDeleteConfirmation(bad)).toBe(false)
    }
  })
})

describe('ownPhotoPaths', () => {
  it('keeps only paths inside the user folder', () => {
    expect(ownPhotoPaths(UID, [`${UID}/a.jpg`, `${UID}/`, 'other/a.jpg', `${UID}x/a.jpg`])).toEqual(
      [`${UID}/a.jpg`],
    )
  })
})

describe('handleDeleteAccount', () => {
  it('answers the CORS preflight', async () => {
    const deps = makeDeps()
    const res = await handleDeleteAccount(request(null, { method: 'OPTIONS' }), deps)
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('refuses other methods with 405', async () => {
    const deps = makeDeps()
    const res = await handleDeleteAccount(request(null, { method: 'GET' }), deps)
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('POST, OPTIONS')
    expect(deps.userIdFromToken).not.toHaveBeenCalled()
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('needs a token (401)', async () => {
    const deps = makeDeps()
    const res = await handleDeleteAccount(request(CONFIRM, { token: null }), deps)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'not_signed_in' })
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('refuses a token that is not a session (401)', async () => {
    const deps = makeDeps()
    const res = await handleDeleteAccount(
      request(CONFIRM, { token: 'eyJhbGciOiJIUzI1NiJ9.not-a-session.sig' }),
      deps,
    )
    expect(res.status).toBe(401)
    expect(deps.listPhotos).not.toHaveBeenCalled()
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('needs exactly { "confirm": "DELETE" } (400)', async () => {
    for (const body of [{ confirm: 'delete' }, {}, 'not json', { confirm: 'DELETE', x: 1 }]) {
      const deps = makeDeps()
      const res = await handleDeleteAccount(request(body), deps)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'bad_request' })
      expect(deps.listPhotos).not.toHaveBeenCalled()
      expect(deps.deleteUser).not.toHaveBeenCalled()
    }
  })

  it('does not delete the user when the photos cannot be listed (502)', async () => {
    const deps = makeDeps({
      listPhotos: vi.fn(async () => {
        throw new Error('storage down')
      }),
    })
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'storage_failed' })
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('does not delete the user when removing the photos fails (502)', async () => {
    const deps = makeDeps({
      removePhotos: vi.fn(async () => {
        throw new Error('remove failed')
      }),
    })
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(502)
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('does not delete the user when photos are still there after remove (502)', async () => {
    const deps = makeDeps({ removePhotos: vi.fn(async () => undefined) })
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(502)
    expect(deps.deleteUser).not.toHaveBeenCalled()
  })

  it('removes the own photos, then deletes the user', async () => {
    const deps = makeDeps()
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(deps.listPhotos).toHaveBeenCalledWith(UID)
    expect(deps.removePhotos).toHaveBeenCalledTimes(1)
    expect(deps.removePhotos).toHaveBeenCalledWith([`${UID}/c1.jpg`, `${UID}/c2.jpg`])
    expect(deps.deleteUser).toHaveBeenCalledWith(UID)
    expect(deps.calls).toEqual(['list', 'remove', 'list', 'deleteUser'])
    expect([...deps.objects]).toEqual(['someone-else/c9.jpg'])
  })

  it('deletes a user without photos without calling remove', async () => {
    const deps = makeDeps({ listPhotos: vi.fn(async () => []) })
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(200)
    expect(deps.removePhotos).not.toHaveBeenCalled()
    expect(deps.deleteUser).toHaveBeenCalledWith(UID)
  })

  it('never sends paths outside the user folder to remove', async () => {
    const deps = makeDeps({
      listPhotos: vi.fn(async () => [`${UID}/c1.jpg`, 'someone-else/c9.jpg']),
      removePhotos: vi.fn(async () => undefined),
    })
    // the second list still returns c1 (fake ignores removes): 502, but remove got own paths only
    await handleDeleteAccount(request(CONFIRM), deps)
    expect(deps.removePhotos).toHaveBeenCalledWith([`${UID}/c1.jpg`])
  })

  it('removes many photos in chunks', async () => {
    const many = Array.from({ length: REMOVE_CHUNK + 5 }, (_, i) => `${UID}/c${i}.jpg`)
    const deps = makeDeps()
    deps.objects.clear()
    for (const p of many) deps.objects.add(p)
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(200)
    expect(deps.removePhotos).toHaveBeenCalledTimes(2)
    expect(vi.mocked(deps.removePhotos).mock.calls[0]?.[0]).toHaveLength(REMOVE_CHUNK)
    expect(vi.mocked(deps.removePhotos).mock.calls[1]?.[0]).toHaveLength(5)
  })

  it('answers 500 when deleteUser fails, and logs no token', async () => {
    const deps = makeDeps({
      deleteUser: vi.fn(async () => {
        throw new Error('auth down')
      }),
    })
    const res = await handleDeleteAccount(request(CONFIRM), deps)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'server_error' })
    const logged = JSON.stringify(vi.mocked(deps.log).mock.calls)
    expect(logged).not.toContain(TOKEN)
    expect(logged).not.toContain('@')
  })
})
