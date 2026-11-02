import { useState, type FormEvent } from 'react'
import { Panel } from './AdminSections'
import {
  AUDIT_ACTIONS,
  AUDIT_TARGETS,
  auditSummary,
  useAdminTeam,
  type TeamAdmin,
} from './adminTeam'

const when = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })

/** Adminlar va jurnal (Phase 45): who can open the panel, and every change by whom. */
export function TeamSection({ source }: { source: 'device' | 'cloud' }) {
  const team = useAdminTeam(source === 'cloud')
  const [email, setEmail] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)

  if (source !== 'cloud') {
    return (
      <Panel title="Adminlar va jurnal">
        <p className="text-sm text-[var(--a-ink-soft)]">
          Adminlar ro‘yxati va o‘zgarishlar jurnali bulutli (Supabase) admin uchun. Bu qurilmadagi
          admin PIN bilan kiradi.
        </p>
      </Panel>
    )
  }

  const emailOf = (id: string | null) =>
    id ? (team.admins.find((admin) => admin.userId === id)?.email ?? 'boshqa admin') : 'tizim'

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.includes('@')) return
    await team.add(email).then(
      () => setEmail(''),
      () => undefined,
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Adminlar">
        <form onSubmit={(event) => void add(event)} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
            Yangi admin pochtasi (hisobi bo‘lishi kerak)
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg border border-[var(--a-line)] bg-[var(--a-raise)] px-3 text-base text-[var(--a-ink)] outline-none focus:border-[var(--a-accent)]"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-full bg-[var(--a-accent)] px-5 text-sm font-bold text-[var(--a-accent-ink)]"
          >
            Admin qo‘shish
          </button>
        </form>
        {team.error && (
          <p role="alert" className="text-sm font-bold text-[var(--a-coral)]">
            {team.error}
          </p>
        )}
        <ul className="flex flex-col" data-testid="team-admins">
          {team.admins.map((admin: TeamAdmin) => (
            <li
              key={admin.userId}
              className="flex flex-wrap items-center gap-3 border-b border-[var(--a-line)] py-3 last:border-0"
            >
              <span className="min-w-0 flex-1 font-bold break-all">{admin.email}</span>
              <span className="text-sm text-[var(--a-ink-soft)]">{when(admin.addedAt)} dan</span>
              {confirming === admin.userId ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void team.remove(admin.userId).finally(() => setConfirming(null))
                    }
                    className="h-11 rounded-full bg-[var(--a-coral)] px-4 text-sm font-bold text-white"
                  >
                    Ha, {admin.email} ni o‘chirish
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="h-11 rounded-full border border-[var(--a-line)] px-4 text-sm font-bold"
                  >
                    Bekor qilish
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(admin.userId)}
                  className="h-11 rounded-full border border-[var(--a-line)] px-4 text-sm font-bold"
                >
                  O‘chirish
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="O‘zgarishlar jurnali">
        <p className="text-sm text-[var(--a-ink-soft)]">
          Promokod, reklama, sozlama, admin va ovoz baholaridagi har bir o‘zgarish (oxirgi 100).
          Oilalar va bolalar ma’lumoti bu yerga yozilmaydi.
        </p>
        {team.loading ? (
          <p role="status" className="text-sm">
            Yuklanmoqda…
          </p>
        ) : team.audit.length === 0 ? (
          <p className="text-sm text-[var(--a-ink-soft)]">Hozircha o‘zgarish yo‘q.</p>
        ) : (
          <ol className="flex flex-col" data-testid="audit-log">
            {team.audit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1 border-b border-[var(--a-line)] py-2 last:border-0"
              >
                <span className="text-sm">
                  <b>{AUDIT_TARGETS[entry.target] ?? entry.target}</b>{' '}
                  {entry.targetKey && <span className="kd-num">{entry.targetKey}</span>}{' '}
                  {AUDIT_ACTIONS[entry.action]}
                </span>
                <span className="text-xs text-[var(--a-ink-soft)]">
                  {when(entry.at)} · {emailOf(entry.adminId)}
                  {auditSummary(entry) && ` · ${auditSummary(entry)}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  )
}
