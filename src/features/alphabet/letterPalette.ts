export interface TilePalette {
  background: string
  ink: string
  shadow: string
}

/** Low-saturation pastels: calm for young eyes, still easy to tell apart. */
const PALETTE: readonly TilePalette[] = [
  { background: '#DDF4EC', ink: '#0F6E5F', shadow: '#B5E3D2' },
  { background: '#FFF0C2', ink: '#8A5A00', shadow: '#F0D88A' },
  { background: '#DDEEFC', ink: '#1E5E9A', shadow: '#B7D7F2' },
  { background: '#FFE4D3', ink: '#A8461A', shadow: '#F6C2A3' },
  { background: '#EEE6FB', ink: '#5E43B8', shadow: '#D5C8F2' },
]

export function paletteFor(index: number): TilePalette {
  return PALETTE[index % PALETTE.length]!
}
