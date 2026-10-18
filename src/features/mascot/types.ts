export type MascotMood = 'idle' | 'wave' | 'talk' | 'happy' | 'oops' | 'sleepy' | 'celebrate'

/** What happened, from the child’s point of view. The mascot turns each into a mood and a message. */
export type MascotEvent =
  'greet' | 'peek' | 'instruct' | 'correct' | 'wrong' | 'rest' | 'locked' | 'celebrate'

export interface MascotMessage {
  /** Shown in the thought bubble (Free) or as a subtitle (PRO). */
  text: string
  /** Large picture next to the text, so a child who cannot read still understands. */
  emoji?: string
  /** What PRO says aloud, when it differs from `text` (e.g. a letter’s spoken name). */
  spoken?: string
}

export interface RobotPalette {
  /** Light → mid → dark stops of the accent gradient (ears, feet, badge). */
  accent: readonly [string, string, string]
  /** Colour of the glowing eyes and mouth on the visor. */
  glow: string
}
