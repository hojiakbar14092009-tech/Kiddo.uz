/*
 * The camera half of the attention helper (Phase 58, MVP: MediaPipe): only with a grown-up's
 * consent, only while a learning screen is open and the app is visible.
 *
 * Everything happens on this device: MediaPipe Face Landmarker (Apache-2.0; the model and its
 * WebAssembly come from Kiddo's own server, downloaded the first time the camera is used and
 * never precached) looks at a small picture about three times a second and answers one
 * question: is a face turned to the screen? No picture is kept, drawn, sent or stored.
 *
 * The answer is steadied before it counts: the child's usual head position is learned in the
 * first frames (a tablet on the table sees the face from below), a lost face waits a moment
 * (bad light, a hand in front), and a change needs several frames in a row (hysteresis).
 */
import simdBinary from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import simdLoader from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import plainBinary from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url'
import plainLoader from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url'

/** How the face sits: turned towards the screen or not (or no face at all). */
export type Gaze = 'screen' | 'away'

interface Point {
  x: number
  y: number
}

export interface FacePoints {
  leftEye: Point
  rightEye: Point
  nose: Point
}

/** The nose this far (in eye distances) to one side of the eyes' middle: the head is turned. */
export const TURNED_RATIO = 0.42
/** Where the nose tip usually sits below the eyes (in eye distances) before calibration. */
export const TYPICAL_DOWN = 0.6
/** This much lower than the child's usual place: the head is bent down (at the table). */
export const DOWN_TILT = 0.45
/** This much higher: looking up, over the screen. */
export const UP_TILT = 0.35

export interface GazeRules {
  /** The child's usual nose position (learned from the first frames), or null before that. */
  baseline: number | null
  /** Drawing screens: looking down at the picture is the task, not a distraction. */
  allowDown: boolean
}

function ratios({ leftEye, rightEye, nose }: FacePoints) {
  const eyes = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
  if (eyes < 1) return null
  const middle = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }
  return { sideways: Math.abs(nose.x - middle.x) / eyes, down: (nose.y - middle.y) / eyes }
}

/** Turned away or not, from three points of one face. Pure: tested on its own. */
export function gazeOf(points: FacePoints | null, rules: GazeRules): Gaze {
  const r = points && ratios(points)
  if (!r) return 'away'
  if (r.sideways > TURNED_RATIO) return 'away'
  const tilt = r.down - (rules.baseline ?? TYPICAL_DOWN)
  if (tilt < -UP_TILT) return 'away'
  if (tilt > DOWN_TILT && !rules.allowDown) return 'away'
  return 'screen'
}

/** Frames looking straight ahead that teach the child's usual head position. */
export const CALIBRATION_FRAMES = 6
/** A face missing this long counts as away (a moment of bad light or a hand does not). */
export const FACE_LOST_MS = 1_500
/** Frames in a row before the answer changes: away is slower to say than back. */
export const AWAY_FRAMES = 3
export const BACK_FRAMES = 2

/**
 * Steadies the raw per-frame answers: calibration, a grace time for a lost face, hysteresis.
 * Pure (time comes in), tested without a camera.
 */
export class GazeFilter {
  private state: Gaze = 'screen'
  private streak = 0
  private lostSince: number | null = null
  private samples: number[] = []
  baseline: number | null = null
  private readonly allowDown: boolean

  constructor(allowDown: boolean) {
    this.allowDown = allowDown
  }

  push(points: FacePoints | null, now: number): Gaze {
    let candidate: Gaze
    if (!points) {
      this.lostSince ??= now
      if (now - this.lostSince < FACE_LOST_MS) return this.state
      candidate = 'away'
    } else {
      this.lostSince = null
      this.learn(points)
      candidate = gazeOf(points, { baseline: this.baseline, allowDown: this.allowDown })
    }
    if (candidate === this.state) {
      this.streak = 0
      return this.state
    }
    this.streak += 1
    if (this.streak >= (candidate === 'away' ? AWAY_FRAMES : BACK_FRAMES)) {
      this.state = candidate
      this.streak = 0
    }
    return this.state
  }

  /** The median nose position of the first frames that look straight ahead. */
  private learn(points: FacePoints) {
    if (this.baseline !== null) return
    const r = ratios(points)
    // a head turned aside, or far from any usual position, teaches nothing
    if (!r || r.sideways > TURNED_RATIO / 2 || r.down < 0.1 || r.down > 1.4) return
    this.samples.push(r.down)
    if (this.samples.length < CALIBRATION_FRAMES) return
    const sorted = [...this.samples].sort((a, b) => a - b)
    this.baseline = sorted[Math.floor(sorted.length / 2)]!
  }
}

interface Landmark {
  x: number
  y: number
}

// MediaPipe's face mesh: the corners of each eye and the tip of the nose
const RIGHT_EYE = [33, 133]
const LEFT_EYE = [362, 263]
const NOSE_TIP = 1

/**
 * The face nearest the camera (the widest eyes: the child, not a parent behind), as three
 * points in pixels (landmarks come normalised to the picture's width and height).
 */
export function nearestFace(
  faces: readonly (readonly Landmark[])[],
  width: number,
  height: number,
): FacePoints | null {
  let best: FacePoints | null = null
  let widest = 0
  for (const face of faces) {
    const at = (index: number) => ({ x: face[index]!.x * width, y: face[index]!.y * height })
    const mean = (indices: number[]) => {
      const points = indices.map(at)
      return {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      }
    }
    if (face.length <= Math.max(...LEFT_EYE, ...RIGHT_EYE, NOSE_TIP)) continue
    const points = { leftEye: mean(LEFT_EYE), rightEye: mean(RIGHT_EYE), nose: at(NOSE_TIP) }
    const eyes = Math.hypot(
      points.rightEye.x - points.leftEye.x,
      points.rightEye.y - points.leftEye.y,
    )
    if (eyes > widest) {
      widest = eyes
      best = points
    }
  }
  return best
}

const MODEL = '/models/mediapipe/face_landmarker.task'
const EVERY_MS = 350

export interface CameraWatch {
  stop: () => void
}

/** The front camera; a computer without one named "user" gets its only camera. */
async function frontCamera(): Promise<MediaStream> {
  const size = { width: { ideal: 320 }, height: { ideal: 240 } }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: 'user' }, ...size },
      audio: false,
    })
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'OverconstrainedError') throw error
    return navigator.mediaDevices.getUserMedia({ video: size, audio: false })
  }
}

/**
 * Starts the camera and calls `onGaze` whenever the steadied answer changes.
 * Rejects when there is no camera, the browser refused it, or the detector cannot run
 * (the helper then keeps working without the camera).
 */
export async function watchCamera(
  onGaze: (gaze: Gaze) => void,
  {
    onOpen = () => undefined,
    allowDown = false,
  }: { onOpen?: () => void; allowDown?: boolean } = {},
): Promise<CameraWatch> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera')
  const stream = await frontCamera()
  onOpen()
  let stopped = false
  const stopStream = () => stream.getTracks().forEach((track) => track.stop())
  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const simd = await FilesetResolver.isSimdSupported()
    const fileset = simd
      ? { wasmLoaderPath: simdLoader, wasmBinaryPath: simdBinary }
      : { wasmLoaderPath: plainLoader, wasmBinaryPath: plainBinary }
    const create = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO',
        numFaces: 2,
      })
    // the GPU is faster, but some phones' WebGL cannot run it
    const landmarker = await create('GPU').catch(() => create('CPU'))
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    const filter = new GazeFilter(allowDown)
    let last: Gaze = 'screen'
    let timer: ReturnType<typeof setTimeout> | undefined

    const look = () => {
      if (stopped) return
      if (document.visibilityState === 'visible' && video.readyState >= 2) {
        try {
          const now = performance.now()
          const result = landmarker.detectForVideo(video, now)
          const points = nearestFace(result.faceLandmarks, video.videoWidth, video.videoHeight)
          const gaze = filter.push(points, now)
          if (gaze !== last) {
            last = gaze
            onGaze(gaze)
          }
        } catch {
          // one bad frame is skipped
        }
      }
      if (!stopped) timer = setTimeout(look, EVERY_MS)
    }
    look()
    return {
      stop: () => {
        stopped = true
        clearTimeout(timer)
        video.srcObject = null
        stopStream()
        landmarker.close()
      },
    }
  } catch (error) {
    stopStream()
    throw error
  }
}
