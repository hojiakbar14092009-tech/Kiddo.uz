import { useCallback, useEffect, useState } from 'react'

/*
 * Admins and the audit log (Phase 45, migration 0019): who may open the panel, and what was
 * changed by whom (promo codes, ads, settings, admins, voice reviews). Cloud admins only; no
 * family data is ever in the log.
 */

export interface TeamAdmin {
  userId: string
  email: string
  addedAt: string
}

export interface AuditEntry {
  id: number
  at: string
  adminId: string | null
  action: 'insert' | 'update' | 'delete'
  target: string
  targetKey: string | null
  summary: Record<string, unknown> | null
}

export interface AdminTeam {
  admins: TeamAdmin[]
  audit: AuditEntry[]
  loading: boolean
  error: string | null
  add: (email: string) => Promise<void>
  remove: (userId: string) => Promise<void>
}

/** The server's refusals in the admin's words. */
export const TEAM_ERRORS: Record<string, string> = {
  no_such_user:
    'Bu pochta bilan tasdiqlangan hisob topilmadi. Avval u ilovada ro‘yxatdan o‘tib, pochtasini tasdiqlasin.',
  last_admin: 'Oxirgi adminni o‘chirib bo‘lmaydi.',
  not_self: 'O‘zingizni o‘chira olmaysiz – buni boshqa admin qiladi.',
  not_admin: 'Bu amal faqat admin uchun.',
}

export function teamError(message: string): string {
  const found = Object.keys(TEAM_ERRORS).find((code) => message.includes(code))
  if (found) return TEAM_ERRORS[found]!
  if (/admin_list|admin_audit|function|relation/i.test(message)) {
    return '0019 migratsiyasi qo‘llanmagan: Supabase’da 0019_admin.sql ni ishga tushiring.'
  }
  return message
}

/** The names of the audited tables, for people. */
export const AUDIT_TARGETS: Record<string, string> = {
  promo_codes: 'Promokod',
  ads: 'Reklama',
  app_settings: 'Sozlama',
  admins: 'Admin',
  voice_reviews: 'Ovoz bahosi',
}

export const AUDIT_ACTIONS: Record<AuditEntry['action'], string> = {
  insert: 'qo‘shildi',
  update: 'o‘zgartirildi',
  delete: 'o‘chirildi',
}

export function useAdminTeam(enabled: boolean): AdminTeam {
  const [admins, setAdmins] = useState<TeamAdmin[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const client = useCallback(async () => {
    const { getAdminSupabase } = await import('@/services/supabase/client')
    const supabase = getAdminSupabase()
    if (!supabase) throw new Error('Supabase sozlanmagan')
    return supabase
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    void (async () => {
      try {
        const supabase = await client()
        const [list, log] = await Promise.all([
          supabase.rpc('admin_list'),
          supabase
            .from('admin_audit')
            .select('id, at, admin_id, action, target, target_key, summary')
            .order('at', { ascending: false })
            .limit(100),
        ])
        if (!alive) return
        if (list.error || log.error) throw new Error((list.error ?? log.error)!.message)
        setAdmins(
          ((list.data ?? []) as { user_id: string; email: string; added_at: string }[]).map(
            (row) => ({ userId: row.user_id, email: row.email, addedAt: row.added_at }),
          ),
        )
        setAudit(
          (
            (log.data ?? []) as {
              id: number
              at: string
              admin_id: string | null
              action: AuditEntry['action']
              target: string
              target_key: string | null
              summary: Record<string, unknown> | null
            }[]
          ).map((row) => ({
            id: row.id,
            at: row.at,
            adminId: row.admin_id,
            action: row.action,
            target: row.target,
            targetKey: row.target_key,
            summary: row.summary,
          })),
        )
        setError(null)
      } catch (reason) {
        if (alive) setError(teamError(String((reason as Error).message ?? reason)))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [enabled, client, version])

  const call = async (work: () => PromiseLike<{ error: { message: string } | null }>) => {
    const { error: failure } = await work()
    if (failure) {
      const text = teamError(failure.message)
      setError(text)
      throw new Error(text)
    }
    setError(null)
    setVersion((value) => value + 1)
  }

  return {
    admins,
    audit,
    loading,
    error,
    add: async (email) => {
      const supabase = await client()
      await call(() => supabase.rpc('admin_add', { p_email: email.trim() }))
    },
    remove: async (userId) => {
      const supabase = await client()
      await call(() => supabase.rpc('admin_remove', { p_user: userId }))
    },
  }
}

/** A short, readable summary of what changed (only small admin tables are ever logged). */
export function auditSummary(entry: AuditEntry): string {
  const fields = Object.entries(entry.summary ?? {})
    .filter(([key]) => !['created_at', 'updated_at', 'reviewed_by', 'reviewed_at'].includes(key))
    .slice(0, 4)
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
    )
  return fields.join(', ').slice(0, 160)
}
