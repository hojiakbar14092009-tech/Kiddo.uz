import { useEffect } from 'react'
import { subscribeDomainEvents } from '@/domain/universe/progression'
import { toast } from '@/components/ui/toast'
import { queueCue } from '@/services/audio/soundLanguage'
import { dayKey } from '@/features/tasks/rules'
import i18n from '@/i18n'
import { useProgressStore } from '@/store/progressStore'
import { useUniverseStore } from '@/domain/universe/store'
import { historyDays } from '@/features/mascot/life'

/**
 * Pet friendship (Phase 27), app-wide: a finished activity is a day played
 * together for the pet walking with that child's robot (once a day). A new
 * heart gets a short, kind toast; nothing is paid or unlocked here. The same
 * day also counts for the friendship with the robot (Phase 43).
 */
export function PetBridge() {
  useEffect(
    () =>
      subscribeDomainEvents((event) => {
        if (event.type !== 'activity.completed') return
        recordRobotDay(event.childKey)
        const grew = useProgressStore.getState().recordPetDay(event.childKey, dayKey())
        if (!grew) return
        queueCue('heart')
        const name = i18n.t(`shop.pets.${grew.pet}`)
        toast(i18n.t('shop.petBondUp', { name, count: grew.level }), 'success')
      }),
    [],
  )
  return null
}

/** A day played together with the robot (seeded once from the history of earlier days). */
function recordRobotDay(childKey: string): void {
  const today = dayKey()
  const progress = useProgressStore.getState()
  const child = progress.byChild[childKey]
  const pastDays = child?.robotBond
    ? 0
    : historyDays({
        today,
        resultDays: (child?.results ?? []).map((result) => result.day),
        runs: useUniverseStore.getState().byChild[childKey]?.recent ?? [],
      }).filter((day) => day < today).length
  progress.recordRobotDay(childKey, today, pastDays)
}
