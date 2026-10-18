import { useTranslation } from 'react-i18next'
import { unseenExits, useActivityStore } from '@/store/activityStore'
import { useFamilyStore } from '@/store/familyStore'

/** A banner for exits the parent has not seen yet: who left Kiddo and when. */
export function ExitAlert({ onOpen }: { onOpen: () => void }) {
  const { t, i18n } = useTranslation()
  const events = useActivityStore((state) => state.events)
  const seenAt = useActivityStore((state) => state.seenAt)
  const children = useFamilyStore((state) => state.children)
  const unseen = unseenExits(events, seenAt)
  const latest = unseen.at(-1)
  if (!latest) return null
  const name = children.find((child) => child.id === latest.childId)?.name ?? ''
  const time = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(latest.at))

  return (
    <button
      type="button"
      role="status"
      onClick={onOpen}
      className="flex items-center gap-3 rounded-3xl border-2 border-oops bg-oops-soft px-4 py-3 text-left font-semibold text-oops-ink"
    >
      <span aria-hidden="true" className="text-3xl">
        🔔
      </span>
      <span className="flex-1">
        {t('parent.activity.alert', { name, time, count: unseen.length })}
      </span>
    </button>
  )
}
