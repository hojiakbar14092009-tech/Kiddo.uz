import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * Phase 53: the cloud panel reads every family (a server answers at most 1000
 * rows a request) and counts income from the server's per-day totals; before
 * the owner applies 0021 it falls back to the newest payments.
 */
type Row = Record<string, unknown>
const fake = vi.hoisted(() => {
  const tables: Record<string, Row[]> = {}
  const state: { revenue: { data: unknown; error: { message: string } | null } } = {
    revenue: { data: [], error: null },
  }
  function query(table: string) {
    let key: string | null = null
    let descending = false
    let after: string | null = null
    let limit = Infinity
    const builder = {
      select: () => builder,
      order: (column: string, options?: { ascending?: boolean }) => {
        key = column
        descending = options?.ascending === false
        return builder
      },
      gt: (column: string, value: string) => {
        if (column === key) after = value
        return builder
      },
      limit: (n: number) => {
        limit = n
        return builder
      },
      then: (resolve: (value: { data: Row[]; error: null }) => void) => {
        let rows = [...(tables[table] ?? [])]
        if (key) {
          const k = key
          rows.sort((a, b) => String(a[k]).localeCompare(String(b[k])) * (descending ? -1 : 1))
          if (after !== null) rows = rows.filter((row) => String(row[k]) > after!)
        }
        // like Supabase: never more than 1000 rows in one answer
        resolve({ data: rows.slice(0, Math.min(limit, 1000)), error: null })
      },
    }
    return builder
  }
  const client = {
    from: (table: string) => query(table),
    rpc: async () => state.revenue,
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => undefined,
  }
  return { tables, state, client }
})
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fake.client }))
vi.mock('@/services/supabase/config', () => ({
  isSupabaseConfigured: true,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
}))
const tables = fake.tables

const PARENT = '00000000-0000-0000-0000-000000000001'

describe('cloud admin data (Phase 53)', () => {
  beforeEach(() => {
    tables.children = Array.from({ length: 2500 }, (_, i) => ({
      id: `c${String(i).padStart(5, '0')}`,
      name: 'Bola',
      age: 5,
      parent_id: PARENT,
      updated_at: '2026-11-01T00:00:00Z',
    }))
    tables.child_state = []
    tables.subscriptions = []
    tables.presence_heartbeats = []
    tables.app_settings = []
    tables.payments = [
      {
        id: 'p1',
        family: 'a@x.uz',
        plan: 'monthly',
        provider: 'click',
        amount: 29_000,
        created_at: new Date().toISOString(),
        parent_id: PARENT,
      },
    ]
  })

  it('every child past the first thousand; income from the per-day totals', async () => {
    const today = new Date().toISOString().slice(0, 10)
    fake.state.revenue = { data: [{ day: today, payments: 5, amount: 145_000 }], error: null }
    const { useAdminData } = await import('./adminData')
    const { result } = renderHook(() => useAdminData('cloud'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.children).toHaveLength(2500)
    expect(result.current.revenue).toHaveLength(1)
    expect(result.current.revenue[0]).toMatchObject({ amount: 145_000, count: 5 })
    expect(result.current.paymentsLimited).toBe(false)
  })

  it('a server without 0021 yet: the panel still opens, income from the payments', async () => {
    fake.state.revenue = {
      data: null,
      error: { message: 'Could not find the function admin_revenue_days' },
    }
    const { useAdminData } = await import('./adminData')
    const { result } = renderHook(() => useAdminData('cloud'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.revenue).toEqual([
      { at: tables.payments![0]!.created_at, amount: 29_000 },
    ])
  })
})
