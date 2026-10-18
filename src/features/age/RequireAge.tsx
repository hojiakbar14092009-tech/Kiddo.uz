import { Navigate, Outlet } from 'react-router-dom'
import { useAgeLevel } from '@/store/familyStore'
import type { AgeLevel } from './ageLevel'

/** Screens for older children: a younger child is sent back home. */
export function RequireAge({ min }: { min: AgeLevel }) {
  return useAgeLevel() >= min ? <Outlet /> : <Navigate to="/home" replace />
}
