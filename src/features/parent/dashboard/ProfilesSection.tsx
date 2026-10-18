import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ChildAvatar } from '@/features/profiles/ChildAvatar'
import { childAge, useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { ChildForm, type ChildFormValues } from './ChildForm'
import { Panel } from './Panel'

type Editing = { kind: 'new' } | { kind: 'edit'; child: ChildProfile } | null

/** Up to three child profiles; each gets its own robot, progress and time limit. */
export function ProfilesSection({ onCreated }: { onCreated?: (child: ChildProfile) => void }) {
  const { t } = useTranslation()
  const children = useFamilyStore((state) => state.children)
  const addChild = useFamilyStore((state) => state.addChild)
  const updateChild = useFamilyStore((state) => state.updateChild)
  const removeChild = useFamilyStore((state) => state.removeChild)
  const resetProgress = useProgressStore((state) => state.resetChild)
  const [editing, setEditing] = useState<Editing>(children.length === 0 ? { kind: 'new' } : null)
  const [removing, setRemoving] = useState<ChildProfile | null>(null)

  const save = (values: ChildFormValues) => {
    if (editing?.kind === 'edit') {
      updateChild(editing.child.id, values)
    } else {
      const child = addChild(values)
      onCreated?.(child)
    }
    setEditing(null)
  }

  const confirmRemove = () => {
    if (!removing) return
    removeChild(removing.id)
    resetProgress(removing.id)
    setRemoving(null)
  }

  if (editing) {
    return (
      <Panel
        title={editing.kind === 'new' ? t('parent.profiles.add') : t('parent.profiles.edit')}
        className="mx-auto w-full max-w-2xl"
      >
        <ChildForm
          initial={editing.kind === 'edit' ? editing.child : undefined}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      </Panel>
    )
  }

  return (
    <Panel title={t('parent.profiles.title', { count: children.length })}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <li key={child.id} className="flex flex-col gap-3 rounded-3xl bg-cream p-4">
            <div className="flex items-center gap-3">
              <ChildAvatar child={child} size={64} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-display text-xl font-extrabold">{child.name}</span>
                <span className="text-ink-soft">
                  {t('childSelect.age', { count: childAge(child) })} ·{' '}
                  {t('parent.profiles.minutes', { count: child.dailyLimitMinutes })}
                </span>
              </div>
            </div>
            {removing?.id === child.id ? (
              <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-oops-soft p-3">
                <p className="text-oops-ink">
                  {t('parent.profiles.removeConfirm', { name: child.name })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="oops" size="md" onClick={confirmRemove}>
                    {t('parent.profiles.removeYes')}
                  </Button>
                  <Button variant="soft" size="md" onClick={() => setRemoving(null)}>
                    {t('parent.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  size="md"
                  onClick={() => setEditing({ kind: 'edit', child })}
                  aria-label={t('parent.profiles.editNamed', { name: child.name })}
                >
                  {t('parent.profiles.edit')}
                </Button>
                <Button
                  variant="oops"
                  size="md"
                  onClick={() => setRemoving(child)}
                  aria-label={t('parent.profiles.removeNamed', { name: child.name })}
                >
                  {t('parent.profiles.remove')}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Button size="md" className="self-start" onClick={() => setEditing({ kind: 'new' })}>
        + {t('parent.profiles.add')}
      </Button>
    </Panel>
  )
}
