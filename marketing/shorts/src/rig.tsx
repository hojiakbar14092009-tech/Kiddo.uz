import React from 'react'
import { Img, staticFile, useCurrentFrame } from 'remotion'
import { usePop } from './parts'

/*
 * The two storytellers, rigged from the app's own pictures (400 × 480): the head, the
 * body and the loose parts (antenna, ears, tuft) are the same picture cut with clip
 * paths, so each can move on its own: breathing, squash and stretch, a head that nods
 * with the voice, parts that swing a beat late (follow-through), blinks, and a mouth
 * that opens with the loudness of the voice. Mini is Lumi (the girl's voice), Piku is
 * KidoBot (the boy's voice).
 */

export type Who = 'mini' | 'piku'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
interface RigDef {
  src: string
  neck: number
  /** Pivot of the head's nod. */
  pivot: [number, number]
  /** Loose parts: swing about their own pivot, a beat after the head. */
  loose: { rect: Rect; pivot: [number, number]; lag: number; gain: number }[]
  eyes: [number, number][]
  eye: [number, number]
  lid: string
  lash?: string
  mouth: [number, number]
  mouthColor: string
  mouthWidth: number
}

const RIGS: Record<Who, RigDef> = {
  piku: {
    src: 'art/kidobot.webp',
    neck: 256,
    pivot: [200, 256],
    loose: [{ rect: { x: 186, y: 40, w: 36, h: 58 }, pivot: [204, 98], lag: 7, gain: 2.4 }],
    eyes: [
      [151, 177],
      [199, 175],
    ],
    eye: [26, 36],
    lid: '#141a27',
    mouth: [173, 205],
    mouthColor: '#9fe2ff',
    mouthWidth: 22,
  },
  mini: {
    src: 'art/lumi.webp',
    neck: 256,
    pivot: [196, 256],
    loose: [
      { rect: { x: 36, y: 30, w: 104, h: 142 }, pivot: [142, 150], lag: 6, gain: 3 },
      { rect: { x: 258, y: 30, w: 120, h: 142 }, pivot: [262, 130], lag: 8, gain: -3 },
      { rect: { x: 188, y: 66, w: 46, h: 46 }, pivot: [208, 112], lag: 5, gain: 2 },
    ],
    eyes: [
      [148, 176],
      [202, 172],
    ],
    eye: [40, 44],
    lid: '#e9e4de',
    lash: '#8c5a3e',
    mouth: [176, 207],
    mouthColor: '#7a3b2e',
    mouthWidth: 18,
  },
}

/** The loudness at a frame, smoothed over the last frames (so the body lags the voice). */
export function lagged(series: readonly number[], frame: number, frames: number): number {
  let sum = 0
  let weight = 0
  for (let k = 0; k < frames; k++) {
    const w = 1 - k / frames
    sum += (series[Math.max(0, Math.min(series.length - 1, frame - k))] ?? 0) * w
    weight += w
  }
  return sum / weight
}

/** 0 → 1 → 0 over six frames, once in a while (a blink). */
function blink(frame: number, seed: number): number {
  const at = (frame + seed * 37) % 118
  if (at > 5) return 0
  return at < 3 ? at / 3 : (6 - at) / 3
}

const rectPath = (r: Rect) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}z`

export const Actor: React.FC<{
  who: Who
  x: number
  /** The feet. */
  y: number
  /** Width in pixels (the picture is 400 × 480). */
  size: number
  /** The voice's loudness per frame (0–1) of this actor's lines; all zeros when silent. */
  voice: readonly number[]
  /** The other one is speaking: look at them, nod. */
  listening?: boolean
  /** Looks to the left (-1) or right (1). */
  side?: 1 | -1
  /** Pops in (spring) after this many frames; undefined: already there (a later scene). */
  delay?: number
  /** Frames already played before this scene, so breathing and blinks carry on across scenes. */
  phase?: number
}> = ({ who, x, y, size, voice, listening = false, side = 1, delay, phase = 0 }) => {
  const local = useCurrentFrame()
  const frame = local + phase
  const popped = usePop(delay ?? 0, 9, 170)
  const pop = delay === undefined ? 1 : popped
  const rig = RIGS[who]
  const s = size / 400
  const amp = lagged(voice, local, 2)
  const slow = lagged(voice, local, 9)
  const seed = who === 'mini' ? 1 : 2
  const breathe = Math.sin(frame / 14 + seed)
  // squash and stretch: a loud syllable stretches the body up, a pause settles it back
  const sy = 1 + 0.012 * breathe + 0.05 * slow
  const sx = 1 - 0.008 * breathe - 0.03 * slow
  const nod = 3.2 * slow + (listening ? Math.sin(frame / 9) * 1.4 : 0)
  const tilt = Math.sin(frame / 23 + seed) * 2 + (listening ? 5 * side : 2.5 * slow * side)
  const lift = -6 * slow - (listening ? 2 : 0)
  const id = `rig-${who}`
  const L = rig.loose
  const full: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 400,
    height: 480,
  }
  const looseSwing = (i: number) =>
    lagged(voice, local, L[i]!.lag) * L[i]!.gain * 3 + Math.sin(frame / 11 + i + seed) * 1.6
  const closed = blink(frame, seed)
  const open = Math.min(1, amp * 2.2)
  const [mw, mh] = [rig.mouthWidth * (0.8 + 0.4 * open), 3 + open * 20]
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size * 1.2,
        width: size,
        height: size * 1.2,
        scale: String(pop),
        transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 14px 16px rgba(40,30,70,0.22))',
      }}
    >
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={`${id}-body`}>
            <rect x={0} y={rig.neck} width={400} height={480 - rig.neck} />
          </clipPath>
          <clipPath id={`${id}-head`}>
            <path
              clipRule="evenodd"
              d={`M0 0h400v${rig.neck}h-400z ${L.map((l) => rectPath(l.rect)).join(' ')}`}
            />
          </clipPath>
          {L.map((l, i) => (
            <clipPath key={i} id={`${id}-l${i}`}>
              <rect x={l.rect.x} y={l.rect.y} width={l.rect.w} height={l.rect.h} />
            </clipPath>
          ))}
        </defs>
      </svg>
      <div
        style={{
          width: 400,
          height: 480,
          transformOrigin: '0 0',
          scale: String(s),
        }}
      >
        <div
          style={{
            ...full,
            transformOrigin: '200px 480px',
            transform: `scale(${(side * sx).toFixed(4)}, ${sy.toFixed(4)})`,
          }}
        >
          <Img src={staticFile(rig.src)} style={{ ...full, clipPath: `url(#${id}-body)` }} />
          <div
            style={{
              ...full,
              transformOrigin: `${rig.pivot[0]}px ${rig.pivot[1]}px`,
              transform: `translateY(${lift}px) rotate(${(tilt + nod).toFixed(3)}deg)`,
            }}
          >
            <Img src={staticFile(rig.src)} style={{ ...full, clipPath: `url(#${id}-head)` }} />
            {L.map((l, i) => (
              <Img
                key={i}
                src={staticFile(rig.src)}
                style={{
                  ...full,
                  clipPath: `url(#${id}-l${i})`,
                  transformOrigin: `${l.pivot[0]}px ${l.pivot[1]}px`,
                  transform: `rotate(${looseSwing(i).toFixed(3)}deg)`,
                }}
              />
            ))}
            {closed > 0 &&
              rig.eyes.map(([ex, ey], i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: ex - rig.eye[0] / 2,
                    top: ey - rig.eye[1] / 2,
                    width: rig.eye[0],
                    height: rig.eye[1],
                    borderRadius: '50%',
                    background: rig.lid,
                    borderBottom: rig.lash ? `3px solid ${rig.lash}` : undefined,
                    transformOrigin: '50% 0%',
                    transform: `scaleY(${closed})`,
                  }}
                />
              ))}
            {open > 0.06 && (
              <div
                style={{
                  position: 'absolute',
                  left: rig.mouth[0] - mw / 2,
                  top: rig.mouth[1] - mh / 2,
                  width: mw,
                  height: mh,
                  borderRadius: '50%',
                  background: rig.mouthColor,
                  boxShadow: who === 'piku' ? '0 0 8px #9fe2ff' : 'inset 0 -5px 0 #e8808a',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
