import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivityStore, type ActivityEvent } from '@/store/activityStore'
import type { ChildProfile } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { Panel } from './Panel'

const SHOWN = 12

/** Events of this child from the cloud, so a parent sees them on their own phone too. */
function useCloudEvents(childId: string): ActivityEvent[] {
  const cloud = useParentStore((state) => state.session?.mode === 'cloud')
  const [events, setEvents] = useState<ActivityEvent[]>([])
  useEffect(() => {
    if (!cloud) return undefined
    let alive = true
    void import('@/services/supabase/client').then(async ({ getSupabase }) => {
      const supabase = getSupabase()
      if (!supabase) return
      const { data } = await supabase
        .from('child_events')
        .select('id, child_id, kind, at')
        .eq('child_id', childId)
        .order('at', { ascending: false })
        .limit(SHOWN)
      if (!alive || !data) return
      setEvents(
        data.map((row) => ({
          id: String(row.id),
          childId: String(row.child_id),
          kind: row.kind === 'returned' ? 'returned' : 'left',
          at: String(row.at),
        })),
      )
    })
    return () => {
      alive = false
    }
  }, [childId, cloud])
  return events
}

/** When the child left Kiddo and came back, newest first. */
export function ActivityPanel({ child }: { child: ChildProfile }) {
  const { t, i18n } = useTranslation()
  const local = useActivityStore((state) => state.events)
  const markSeen = useActivityStore((state) => state.markSeen)
  const cloud = useCloudEvents(child.id)

  useEffect(() => markSeen(), [markSeen])

  const byId = new Map<string, ActivityEvent>()
  for (const event of [...cloud, ...local])
    if (event.childId === child.id) byId.set(event.id, event)
  const events = [...byId.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, SHOWN)
  const format = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Panel title={t('parent.activity.title')}>
      {events.length === 0 ? (
        <p className="text-ink-soft">{t('parent.activity.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y-2 divide-line">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-3 py-2">
              <span aria-hidden="true" className="text-2xl">
                {event.kind === 'left' ? '🚪' : '👋'}
              </span>
              <span className="flex-1">
                {t(event.kind === 'left' ? 'parent.activity.left' : 'parent.activity.returned', {
                  name: child.name,
                })}
              </span>
              <time dateTime={event.at} className="text-ink-soft tabular-nums">
                {format.format(new Date(event.at))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
