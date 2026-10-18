/** The four games a child can play. */
export const GAME_TYPES = ['find-letter', 'find-picture', 'memory', 'trace'] as const

export type GameType = (typeof GAME_TYPES)[number]

/** Games where the child picks one answer out of a few options. */
export type ChoiceGameType = Extract<GameType, 'find-letter' | 'find-picture'>

export function isGameType(value: unknown): value is GameType {
  return typeof value === 'string' && (GAME_TYPES as readonly string[]).includes(value)
}

export function isChoiceGame(type: GameType): type is ChoiceGameType {
  return type === 'find-letter' || type === 'find-picture'
}
