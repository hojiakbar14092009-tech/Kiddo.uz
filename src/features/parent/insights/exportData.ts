import type { UniverseChild } from '@/domain/universe/store'
import type { LearnChild } from '@/features/learn/learnStore'
import type { WorkMeta } from '@/features/studio/gallery'
import type { ChildProfile } from '@/store/familyStore'
import type { ChildProgress } from '@/store/progressStore'

/*
 * "Export this child's data": one JSON file with everything this device
 * keeps for one child. Built in the browser and saved by the parent; nothing
 * is sent anywhere. Pictures stay out (only their date and size).
 */

export const EXPORT_FORMAT = 'kiddo-child-export'
export const EXPORT_VERSION = 1

export interface ChildExport {
  format: typeof EXPORT_FORMAT
  version: typeof EXPORT_VERSION
  exportedAt: string
  /** Where the data lives: 'device' (only here) or 'cloud' (also backed up to the account). */
  storage: 'device' | 'cloud'
  profile: {
    id: string
    name: string
    birthDate: string
    gender: ChildProfile['gender']
    mascot: ChildProfile['mascot']
    dailyLimitMinutes: number
    createdAt: string
    homeworks: NonNullable<ChildProfile['homeworks']>
  }
  progress: ChildProgress | null
  learn: LearnChild | null
  universe: UniverseChild | null
  gallery: { id: string; createdAt: string; bytes: number }[]
}

export function buildChildExport(input: {
  child: ChildProfile
  progress: ChildProgress | undefined
  learn: LearnChild | undefined
  universe: UniverseChild | undefined
  gallery: readonly WorkMeta[]
  storage: 'device' | 'cloud'
  now?: Date
}): ChildExport {
  const { child } = input
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    storage: input.storage,
    profile: {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender,
      mascot: child.mascot,
      dailyLimitMinutes: child.dailyLimitMinutes,
      createdAt: child.createdAt,
      homeworks: child.homeworks ?? [],
    },
    progress: input.progress ?? null,
    learn: input.learn ?? null,
    universe: input.universe ?? null,
    // metadata only: the picture itself (a Blob) never goes into the file
    gallery: input.gallery
      .filter((work) => work.childKey === child.id)
      .map((work) => ({
        id: work.id,
        createdAt: new Date(work.createdAt).toISOString(),
        bytes: work.bytes,
      })),
  }
}

/** A safe file name: `kiddo-<name>-<YYYY-MM-DD>.json` (letters and digits of the name only). */
export function exportFileName(name: string, day: string): string {
  const safe =
    name
      .normalize('NFC')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'child'
  return `kiddo-${safe}-${day}.json`
}
