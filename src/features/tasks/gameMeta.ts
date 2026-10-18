import type { GameType } from './games'

interface GameMeta {
  titleKey:
    'task.findLetterTitle' | 'task.findPictureTitle' | 'task.memoryTitle' | 'task.traceTitle'
  emoji: string
}

/** How each game is shown on the home screen. */
export const GAME_META: Record<GameType, GameMeta> = {
  'find-letter': { titleKey: 'task.findLetterTitle', emoji: '🔤' },
  'find-picture': { titleKey: 'task.findPictureTitle', emoji: '🖼️' },
  memory: { titleKey: 'task.memoryTitle', emoji: '🃏' },
  trace: { titleKey: 'task.traceTitle', emoji: '✏️' },
}
