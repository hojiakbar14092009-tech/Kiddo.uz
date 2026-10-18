import { useEffect, useRef } from 'react'

const GLYPHS = [
  'A',
  'B',
  'Oʻ',
  'Gʻ',
  'Sh',
  'Б',
  'Ж',
  'Я',
  'Ю',
  'K',
  'Q',
  '1',
  '2',
  '3',
  '5',
  '7',
  '9',
  'Ch',
]
const LINK_DISTANCE = 150

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  glyph: string
  size: number
  /** 0–1: how much of a gold flash is left after a payment. */
  flash: number
}

/**
 * The admin panel's backdrop: letters and numbers from Kiddo's three
 * alphabets drifting like a constellation, joined by faint lines when they
 * come close. Every new payment sends a gold ripple through it.
 */
export function AdminBackground({ pulseKey }: { pulseKey: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const ripple = useRef<{ start: number } | null>(null)

  useEffect(() => {
    if (pulseKey > 0) ripple.current = { start: performance.now() }
  }, [pulseKey])

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let width = 0
    let height = 0
    let stars: Star[] = []
    let frame = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = element.clientWidth
      height = element.clientHeight
      element.width = width * ratio
      element.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const count = Math.round(Math.min(70, (width * height) / 22_000))
      stars = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        glyph: GLYPHS[index % GLYPHS.length]!,
        size: 11 + Math.random() * 9,
        flash: 0,
      }))
    }

    const draw = (now: number) => {
      const styles = getComputedStyle(element)
      const glyph = styles.getPropertyValue('--a-glyph').trim() || '157 220 206'
      const gold = styles.getPropertyValue('--a-gold').trim() || '#f2b740'
      context.clearRect(0, 0, width, height)

      const wave = ripple.current
      const radius = wave ? (now - wave.start) * 0.9 : -1
      if (wave && radius > Math.hypot(width, height)) ripple.current = null

      for (const star of stars) {
        if (!reduce) {
          star.x += star.vx
          star.y += star.vy
          if (star.x < -20) star.x = width + 20
          if (star.x > width + 20) star.x = -20
          if (star.y < -20) star.y = height + 20
          if (star.y > height + 20) star.y = -20
        }
        if (wave) {
          const distance = Math.hypot(star.x - width / 2, star.y - height / 3)
          if (Math.abs(distance - radius) < 40) star.flash = 1
        }
        star.flash *= 0.975
      }

      context.lineWidth = 1
      for (let i = 0; i < stars.length; i += 1) {
        for (let j = i + 1; j < stars.length; j += 1) {
          const a = stars[i]!
          const b = stars[j]!
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance > LINK_DISTANCE) continue
          const alpha = (1 - distance / LINK_DISTANCE) * 0.18
          context.strokeStyle = `rgb(${glyph} / ${alpha})`
          context.beginPath()
          context.moveTo(a.x, a.y)
          context.lineTo(b.x, b.y)
          context.stroke()
        }
      }

      context.textAlign = 'center'
      context.textBaseline = 'middle'
      for (const star of stars) {
        context.font = `600 ${star.size}px Rubik, system-ui, sans-serif`
        if (star.flash > 0.05) {
          context.globalAlpha = Math.min(1, 0.35 + star.flash)
          context.fillStyle = gold
        } else {
          context.globalAlpha = 1
          context.fillStyle = `rgb(${glyph} / 0.32)`
        }
        context.fillText(star.glyph, star.x, star.y)
      }
      context.globalAlpha = 1

      if (wave && radius > 0) {
        context.strokeStyle = gold
        context.globalAlpha = Math.max(0, 0.5 - radius / 1600)
        context.lineWidth = 2
        context.beginPath()
        context.arc(width / 2, height / 3, radius, 0, Math.PI * 2)
        context.stroke()
        context.globalAlpha = 1
      }
      frame = requestAnimationFrame(draw)
    }

    resize()
    frame = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div aria-hidden="true" className="kd-aurora pointer-events-none fixed inset-0">
      <canvas ref={canvas} className="size-full" />
    </div>
  )
}
