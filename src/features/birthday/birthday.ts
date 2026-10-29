import { grantReward, wasRewarded } from '@/domain/rewards'
import { PET_IDS, type PetId } from '@/features/pets/pets'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'

/*
 * The birthday gift (Phase 24): in the child's birthday week (the birthday
 * and the six days after it) the child gets exactly 50 coins and chooses one
 * pet, once a year. One ledger entry carries both (`birthday|<year>|<pet>`,
 * also checked by the server, which owns the pet from it); the pet list never
 * holds a pet twice, and the profile's `birthdayGifts` keeps the party to once
 * a year (the ledger still decides if that write is ever lost).
 */

export const BIRTHDAY_COINS = 50
export const BIRTHDAY_WEEK_DAYS = 7

/** The ledger ref of a year's gift: the pet chosen is part of it (the server owns it from there). */
export const birthdayRef = (year: number, pet?: PetId | null) =>
  pet ? `birthday|${year}|${pet}` : `birthday|${year}`

/**
 * Today in Tashkent (YYYY-MM-DD): the birthday week is counted the way the
 * server counts it, whatever the device's time zone.
 */
export function tashkentDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Was this year's gift already given (the ledger, which outlives a lost
 * profile write)? `undefined`: not given; otherwise the pet given (or null).
 */
export function giftOfYear(childId: string, year: number): PetId | null | undefined {
  if (wasRewarded(childId, 'birthday', birthdayRef(year))) return null
  for (const pet of PET_IDS) {
    if (wasRewarded(childId, 'birthday', birthdayRef(year, pet))) return pet
  }
  return undefined
}

function utcDay(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
}

/** The birthday in a year (YYYY-MM-DD); 29 February is the 28th in other years. */
export function birthdayIn(birthDate: string, year: number): string {
  const [, m, d] = birthDate.split('-').map(Number) as [number, number, number]
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const day = m === 2 && d === 29 && !leap ? 28 : d
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The year whose birthday week holds `today`, or null (a late-December birthday reaches into January). */
export function birthdayWeekYear(birthDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null
  const year = Number(today.slice(0, 4))
  for (const y of [year, year - 1]) {
    if (y <= Number(birthDate.slice(0, 4))) continue
    const diff = (utcDay(today) - utcDay(birthdayIn(birthDate, y))) / 86_400_000
    if (diff >= 0 && diff < BIRTHDAY_WEEK_DAYS) return y
  }
  return null
}

/** Is a birthday party due for this child today (not given yet this year)? */
export function birthdayDue(child: ChildProfile, today: string): number | null {
  const year = birthdayWeekYear(child.birthDate, today)
  if (year === null || (child.birthdayGifts ?? []).includes(year)) return null
  if (giftOfYear(child.id, year) !== undefined) return null
  return year
}

/** Pets the child does not have yet: the choices of the gift. */
export function giftablePets(owned: readonly PetId[]): PetId[] {
  return PET_IDS.filter((pet) => !owned.includes(pet))
}

/**
 * Gives the year's gift: 50 coins (once, by the ledger ref) and the chosen
 * pet (once, if not owned), then marks the year. Calling it again changes
 * nothing. Returns false when the gift was already given.
 */
export function claimBirthdayGift(childId: string, year: number, pet: PetId | null): boolean {
  const child = useFamilyStore.getState().children.find((item) => item.id === childId)
  if (!child) return false
  const given = giftOfYear(childId, year)
  const fresh = given === undefined && !(child.birthdayGifts ?? []).includes(year)
  // one ledger entry carries the coins and the pet: the gift is given once, whole
  const gifted = fresh
    ? grantReward({
        childKey: childId,
        coins: BIRTHDAY_COINS,
        reason: 'birthday',
        refId: birthdayRef(year, pet),
      }) && pet
    : given
  // the pet follows the ledger (and is put back if an earlier write lost it)
  if (gifted) useProgressStore.getState().giftPet(childId, gifted)
  if (!(child.birthdayGifts ?? []).includes(year)) {
    useFamilyStore.getState().updateChild(childId, {
      birthdayGifts: [...(child.birthdayGifts ?? []), year].slice(-50),
    })
  }
  return fresh
}
