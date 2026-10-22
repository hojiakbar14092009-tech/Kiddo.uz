import {
  BACKGROUNDS,
  BOARD_ASPECT,
  DOTS_ACROSS,
  DOTS_DOWN,
  type BackgroundId,
  type StudioDoc,
  type StudioPoint,
  type StudioStroke,
} from './studioDoc'

/** Width of the saved picture in pixels (height follows the board's 4:3). */
export const SAVE_WIDTH = 640

export function backgroundOf(id: BackgroundId) {
  return BACKGROUNDS.find((background) => background.id === id) ?? BACKGROUNDS[0]
}

/** The board background as CSS (the same look the saved picture gets). */
export function backgroundCss(id: BackgroundId): React.CSSProperties {
  const background = backgroundOf(id)
  if (!('dots' in background)) return { backgroundColor: background.color }
  return {
    backgroundColor: background.color,
    backgroundImage: `radial-gradient(circle, ${background.dots} 28%, transparent 32%)`,
    backgroundSize: `${100 / DOTS_ACROSS}% ${100 / DOTS_DOWN}%`,
  }
}

export function paintBackground(
  context: CanvasRenderingContext2D,
  id: BackgroundId,
  width: number,
  height: number,
) {
  const background = backgroundOf(id)
  context.fillStyle = background.color
  context.fillRect(0, 0, width, height)
  if (!('dots' in background)) return
  const cellX = width / DOTS_ACROSS
  const cellY = height / DOTS_DOWN
  const radius = Math.min(cellX, cellY) * 0.3
  context.fillStyle = background.dots
  for (let row = 0; row < DOTS_DOWN; row += 1) {
    for (let column = 0; column < DOTS_ACROSS; column += 1) {
      context.beginPath()
      context.arc((column + 0.5) * cellX, (row + 0.5) * cellY, radius, 0, Math.PI * 2)
      context.fill()
    }
  }
}

/** One line segment of a stroke (used while the child is drawing). */
export function paintSegment(
  context: CanvasRenderingContext2D,
  stroke: Pick<StudioStroke, 'color' | 'size' | 'erase'>,
  from: StudioPoint,
  to: StudioPoint,
  width: number,
  height: number,
) {
  context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
  context.strokeStyle = stroke.color
  context.lineWidth = stroke.size * width
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  context.moveTo(from.x * width, from.y * height)
  context.lineTo(to.x * width, to.y * height)
  context.stroke()
  context.globalCompositeOperation = 'source-over'
}

/** All strokes on a transparent layer (the eraser cuts through to the background below). */
export function paintStrokes(
  context: CanvasRenderingContext2D,
  strokes: readonly StudioStroke[],
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height)
  for (const stroke of strokes) {
    context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.size * width
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    stroke.points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x * width, point.y * height)
      context.lineTo(point.x * width, point.y * height)
    })
    context.stroke()
  }
  context.globalCompositeOperation = 'source-over'
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return element
}

/**
 * The picture flattened into one PNG: background, drawing, then the stickers
 * on top. Null where the browser cannot draw (no canvas support).
 */
export async function flattenDoc(doc: StudioDoc, width = SAVE_WIDTH): Promise<Blob | null> {
  const height = Math.round(width / BOARD_ASPECT)
  const output = canvas(width, height)
  const layer = canvas(width, height)
  const context = output.getContext('2d')
  const layerContext = layer.getContext('2d')
  if (!context || !layerContext) return null

  paintBackground(context, doc.background, width, height)
  paintStrokes(layerContext, doc.strokes, width, height)
  context.drawImage(layer, 0, 0)

  const images = await Promise.all(
    doc.stickers.map((sticker) => loadImage(`/3d/${sticker.name}.webp`)),
  )
  doc.stickers.forEach((sticker, index) => {
    const image = images[index]
    if (!image) return
    const side = sticker.size * width
    context.drawImage(
      image,
      sticker.x * width - side / 2,
      sticker.y * height - side / 2,
      side,
      side,
    )
  })

  return new Promise((resolve) => output.toBlob((blob) => resolve(blob), 'image/png'))
}
