export interface CertificateText {
  heading: string
  name: string
  body: string
  /** e.g. “10 / 10” */
  score: string
  date: string
  footer: string
}

export const CERTIFICATE_WIDTH = 1600
export const CERTIFICATE_HEIGHT = 1130

const COLORS = {
  paper: '#FFFAF0',
  border: '#13917E',
  borderSoft: '#DCF3EE',
  ink: '#352A4A',
  inkSoft: '#6B6180',
  gold: '#FFC93C',
  goldDark: '#E0A21B',
  pink: '#F27BA6',
} as const

const DISPLAY_FONT = '"Rubik", "Nunito", system-ui, sans-serif'
const BODY_FONT = '"Nunito", "Rubik", system-ui, sans-serif'

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function star(context: CanvasRenderingContext2D, cx: number, cy: number, outer: number) {
  context.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : outer * 0.45
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
    context.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
  }
  context.closePath()
}

/** Shrinks the font until the text fits the width – long names stay on one line. */
function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: number,
  family: string,
) {
  let current = size
  context.font = `${weight} ${current}px ${family}`
  while (context.measureText(text).width > maxWidth && current > 24) {
    current -= 4
    context.font = `${weight} ${current}px ${family}`
  }
}

/** Draws the whole certificate. Pure canvas, so it works offline and prints sharply. */
export function drawCertificate(context: CanvasRenderingContext2D, text: CertificateText) {
  const W = CERTIFICATE_WIDTH
  const H = CERTIFICATE_HEIGHT
  context.clearRect(0, 0, W, H)

  context.fillStyle = COLORS.paper
  context.fillRect(0, 0, W, H)

  // double frame
  context.lineWidth = 18
  context.strokeStyle = COLORS.border
  roundedRect(context, 40, 40, W - 80, H - 80, 48)
  context.stroke()
  context.lineWidth = 6
  context.strokeStyle = COLORS.borderSoft
  roundedRect(context, 76, 76, W - 152, H - 152, 32)
  context.stroke()

  // confetti dots in the corners
  const dots: [number, number, string][] = [
    [140, 150, COLORS.pink],
    [200, 210, COLORS.gold],
    [W - 150, 160, COLORS.gold],
    [W - 210, 220, COLORS.border],
    [140, H - 240, COLORS.border],
    [W - 140, H - 250, COLORS.pink],
  ]
  for (const [x, y, color] of dots) {
    context.fillStyle = color
    context.beginPath()
    context.arc(x, y, 16, 0, Math.PI * 2)
    context.fill()
  }

  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'

  // medal
  context.fillStyle = COLORS.gold
  context.strokeStyle = COLORS.goldDark
  context.lineWidth = 8
  context.beginPath()
  context.arc(W / 2, 220, 86, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.fillStyle = '#FFFFFF'
  star(context, W / 2, 222, 52)
  context.fill()

  context.fillStyle = COLORS.border
  context.font = `800 92px ${DISPLAY_FONT}`
  context.fillText(text.heading, W / 2, 410)

  context.fillStyle = COLORS.ink
  fitText(context, text.name, W - 360, 120, 800, DISPLAY_FONT)
  context.fillText(text.name, W / 2, 580)

  context.fillStyle = COLORS.inkSoft
  fitText(context, text.body, W - 320, 52, 700, BODY_FONT)
  context.fillText(text.body, W / 2, 680)

  // three stars and the score
  for (const offset of [-120, 0, 120]) {
    context.fillStyle = COLORS.gold
    star(context, W / 2 + offset, 790, offset === 0 ? 56 : 44)
    context.fill()
  }
  context.fillStyle = COLORS.ink
  context.font = `800 56px ${DISPLAY_FONT}`
  context.fillText(text.score, W / 2, 900)

  context.font = `600 36px ${BODY_FONT}`
  context.fillStyle = COLORS.inkSoft
  context.textAlign = 'left'
  context.fillText(text.date, 170, H - 140)
  context.textAlign = 'right'
  context.fillText(text.footer, W - 170, H - 140)
}
