/** Pets a child can adopt in the shop; the chosen one stays by the robot’s feet. */
export const PET_IDS = ['cat', 'parrot', 'hamster', 'guinea-pig', 'bunny'] as const
export type PetId = (typeof PET_IDS)[number]

export const PET_PRICE = 75

/** The six poses of every pet, as drawn in public/pets/{pet}/{emotion}.webp. */
export const PET_EMOTIONS = ['happy', 'surprised', 'sad', 'angry', 'scared', 'shy'] as const
export type PetEmotion = (typeof PET_EMOTIONS)[number]

export function isPetId(value: unknown): value is PetId {
  return typeof value === 'string' && (PET_IDS as readonly string[]).includes(value)
}

export function petFrame(pet: PetId, emotion: PetEmotion): string {
  return `/pets/${pet}/${emotion}.webp`
}
