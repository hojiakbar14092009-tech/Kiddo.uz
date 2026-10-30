import { useEffect } from 'react'
import { subscribeDomainEvents } from '@/domain/universe/progression'
import { toast } from '@/components/ui/toast'
import { queueCue } from '@/services/audio/soundLanguage'
import { dayKey } from '@/features/tasks/rules'
import i18n from '@/i18n'
import { useProgressStore } from '@/store/progressStore'

/**
 * Pet friendship (Phase 27), app-wide: a finished activity is a day played
 * together for the pet walking with that child's robot (once a day). A new
 * heart gets a short, kind toast; nothing is paid or unlocked here.
 */
export function PetBridge() {
  useEffect(
    () =>
      subscribeDomainEvents((event) => {
        if (event.type !== 'activity.completed') return
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
