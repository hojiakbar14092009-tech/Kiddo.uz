import { characterStyle, type CharacterStyle } from '@/domain/adaptive'
import { childAge, useActiveChild } from '@/store/familyStore'

/**
 * The robot's style for the active child (Phase 31): by real age, like the
 * page's visual maturity, never by the child's level. A guest gets the young
 * robot (presented as 5–6).
 */
export function useCharacterStyle(): CharacterStyle {
  const child = useActiveChild()
  return characterStyle(child ? childAge(child) : null)
}
