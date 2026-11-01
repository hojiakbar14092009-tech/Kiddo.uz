import { useEffect } from 'react'
import { convertToNuts } from '@/domain/universe'
import { useChildKey } from '@/store/progressStore'

/**
 * Phase 39, once per child: the crystals, parts and scrolls a child still
 * holds become yong‘oq (nuts). Runs when a child opens; a second run finds
 * nothing to convert. The server converts its own copy the same way (0017).
 */
export function NutConversion() {
  const childKey = useChildKey()
  useEffect(() => {
    convertToNuts(childKey)
  }, [childKey])
  return null
}
