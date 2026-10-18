import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { ParentGateOverlay } from '@/features/parent/gate/ParentGate'
import { ParentAreaLink } from '@/features/parent/ParentAreaLink'
import { useScreenTime } from '@/features/rest/useScreenTime'
import { ChildAvatar } from './ChildAvatar'

/** `/child-select`: the child taps their own robot. No passwords – they cannot read yet. */
export function ChildSelectPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const children = useFamilyStore((state) => state.children)
  const activeChildId = useFamilyStore((state) => state.activeChildId)
  const setActiveChild = useFamilyStore((state) => state.setActiveChild)

  const { used } = useScreenTime()
  /** A switch waiting for the parent gate; `undefined` when none is pending. */
  const [pending, setPending] = useState<ChildProfile | null | undefined>(undefined)

  const switchTo = (child: ChildProfile | null) => {
    setActiveChild(child?.id ?? null)
    navigate('/home')
  }

  // Once the current player has used time today, changing to another profile
  // (or to the guest) needs a parent – otherwise every switch would start a
  // fresh daily allowance.
  const choose = (child: ChildProfile | null) => {
    const isSame = (child?.id ?? null) === activeChildId
    if (!isSame && children.length > 0 && used > 0) setPending(child)
    else switchTo(child)
  }

  return (
    <Screen
      header={<TopBar showHome={false} showCoins={false} />}
      className="items-center justify-center gap-8 px-4 py-8"
    >
      <h1 className="text-center font-display text-4xl font-extrabold sm:text-5xl">
        {t('childSelect.title')}
      </h1>

      <ul className="grid w-full max-w-md grid-cols-2 gap-4 sm:flex sm:max-w-4xl sm:flex-wrap sm:justify-center sm:gap-5">
        {children.map((child) => (
          <li key={child.id}>
            <ProfileButton
              selected={child.id === activeChildId}
              onClick={() => choose(child)}
              avatar={<ChildAvatar child={child} size={112} />}
              name={child.name}
              detail={t('childSelect.age', { count: child.age })}
            />
          </li>
        ))}
        <li>
          <ProfileButton
            selected={children.length > 0 && activeChildId === null}
            onClick={() => choose(null)}
            avatar={<ChildAvatar child={null} size={112} />}
            name={t('childSelect.guest')}
            detail={t('childSelect.guestHint')}
          />
        </li>
      </ul>

      {children.length === 0 && (
        <p className="max-w-md text-center text-lg text-ink-soft">{t('childSelect.noProfiles')}</p>
      )}
      <ParentAreaLink />

      {pending !== undefined && (
        <ParentGateOverlay
          onPass={() => switchTo(pending)}
          onCancel={() => setPending(undefined)}
        />
      )}
    </Screen>
  )
}

interface ProfileButtonProps {
  selected: boolean
  onClick: () => void
  avatar: ReactNode
  name: string
  detail: string
}

function ProfileButton({ selected, onClick, avatar, name, detail }: ProfileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full flex-col items-center gap-3 rounded-[32px] border-4 border-transparent bg-surface px-3 py-5 shadow-[0_8px_0_var(--color-line)] transition-transform active:translate-y-1 aria-pressed:border-primary sm:w-52"
    >
      {avatar}
      <span className="max-w-full truncate font-display text-2xl font-extrabold">{name}</span>
      <span className="text-base text-ink-soft">{detail}</span>
    </button>
  )
}
