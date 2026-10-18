export type MascotMood = 'idle' | 'wave' | 'talk' | 'happy' | 'oops'

export interface RobotPalette {
  /** Light → mid → dark stops of the accent gradient (ears, feet, badge). */
  accent: readonly [string, string, string]
  /** Colour of the glowing eyes and mouth on the visor. */
  glow: string
}
