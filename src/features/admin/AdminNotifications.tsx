import clsx from 'clsx'
import { Panel } from './AdminSections'

/*
 * Notifications (Phase 37): what happened while the panel was open, newest
 * first, as a plain list (replaces the Navi mascot). An admin wants facts,
 * not a character.
 */

export type NotificationKind = 'payment' | 'online' | 'info'

export interface AdminNotification {
  id: string
  kind: NotificationKind
  text: string
  /** ISO time. */
  at: string
}

const KIND_LABEL: Record<NotificationKind, string> = {
  payment: 'To‘lov',
  online: 'Faollik',
  info: 'Xabar',
}

const KIND_STYLES: Record<NotificationKind, string> = {
  payment: 'border-l-[var(--a-gold)]',
  online: 'border-l-[var(--a-online)]',
  info: 'border-l-[var(--a-accent)]',
}

export function NotificationsSection({ notes }: { notes: readonly AdminNotification[] }) {
  const time = new Intl.DateTimeFormat('uz', { hour: '2-digit', minute: '2-digit' })
  return (
    <Panel title="Bildirishnomalar">
      <p className="mb-3 text-sm text-[var(--a-ink-soft)]">
        Panel ochiq paytda bo‘lgan voqealar: yangi to‘lovlar, o‘ynashni boshlagan bolalar va kunlik
        xulosa. Eng yangisi tepada.
      </p>
      {notes.length === 0 ? (
        <p className="text-[var(--a-ink-soft)]" data-testid="admin-notes-empty">
          Hozircha yangi voqea yo‘q.
        </p>
      ) : (
        <ol className="flex flex-col gap-2" data-testid="admin-notes">
          {notes.map((note) => (
            <li
              key={note.id}
              className={clsx(
                'rounded-lg border-l-4 bg-[var(--a-raise)] px-4 py-3',
                KIND_STYLES[note.kind],
              )}
            >
              <p className="text-xs font-bold text-[var(--a-ink-soft)]">
                {KIND_LABEL[note.kind]} ·{' '}
                <time dateTime={note.at}>{time.format(new Date(note.at))}</time>
              </p>
              <p className="text-[var(--a-ink)]">{note.text}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
