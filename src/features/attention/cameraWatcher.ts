/*
 * The camera half of the attention helper (Phase 58): only with a grown-up's
 * consent, only while a learning screen is open and the app is visible.
 *
 * Everything happens on this device: a small face detector (face-api, MIT, its
 * tiny models under /models/face, ≈ 0.3 MB) looks at a 160 px picture about
 * three times a second and answers one question: is a face turned to the screen?
 * No picture is kept, drawn, sent or stored; only that yes/no leaves this file.
 * The detector (≈ 1.3 MB) is downloaded the first time the camera is used.
 */

/** How the face sits: turned towards the screen or not (or no face at all). */
export type Gaze = 'screen' | 'away'

export interface FacePoints {
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  nose: { x: number; y: number }
}

/** The nose this far (in eye distances) to one side of the eyes' middle: the head is turned. */
export const TURNED_RATIO = 0.42
/** The nose this far below or above its usual place: looking down at the table or up. */
export const TILTED_RATIO = 1.25

/**
 * Turned away or not, from three points of a face. Pure: tested on its own.
 * A face turned more than about 40° sideways moves the nose past an eye; a head
 * bent far down pushes the nose far below the eyes (seen from the camera).
 */
export function gazeOf(points: FacePoints | null): Gaze {
  if (!points) return 'away'
  const { leftEye, rightEye, nose } = points
  const eyes = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
  if (eyes < 1) return 'away'
  const middle = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }
  const sideways = Math.abs(nose.x - middle.x) / eyes
  const down = (nose.y - middle.y) / eyes
  if (sideways > TURNED_RATIO) return 'away'
  if (down > TILTED_RATIO || down < 0.15) return 'away'
  return 'screen'
}

const MODELS = '/models/face'
const EVERY_MS = 350

function average(points: { x: number; y: number }[]) {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

export interface CameraWatch {
  stop: () => void
}

/**
 * Starts the camera and calls `onGaze` whenever the answer changes.
 * Rejects when there is no camera or the browser refused it (the helper then
 * keeps working without the camera).
 */
export async function watchCamera(
  onGaze: (gaze: Gaze) => void,
  onOpen: () => void = () => undefined,
): Promise<CameraWatch> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera')
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
    audio: false,
  })
  onOpen()
  let stopped = false
  const stopStream = () => stream.getTracks().forEach((track) => track.stop())
  try {
    const faceapi = await import('@vladmandic/face-api')
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS),
    ])
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.45 })
    let last: Gaze | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const look = async () => {
      if (stopped) return
      if (document.visibilityState === 'visible' && video.readyState >= 2) {
        try {
          const found = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true)
          const points = found
            ? {
                leftEye: average(found.landmarks.getLeftEye()),
                rightEye: average(found.landmarks.getRightEye()),
                nose: average(found.landmarks.getNose().slice(3)),
              }
            : null
          const gaze = gazeOf(points)
          if (!stopped && gaze !== last) {
            last = gaze
            onGaze(gaze)
          }
        } catch {
          // one bad frame is skipped
        }
      }
      if (!stopped) timer = setTimeout(() => void look(), EVERY_MS)
    }
    void look()
    return {
      stop: () => {
        stopped = true
        clearTimeout(timer)
        video.srcObject = null
        stopStream()
      },
    }
  } catch (error) {
    stopStream()
    throw error
  }
}
