/** A browser that never answers (a dismissed prompt) counts as "no" after this long. */
export const CAMERA_ASK_MS = 10_000

/** Opens the camera once, so the browser asks now; the picture is closed at once. */
export async function askCamera(waitMs: number = CAMERA_ASK_MS): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false
  let timer: ReturnType<typeof setTimeout> | undefined
  const asked = navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop())
      return true
    })
    .catch(() => false)
  const late = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), waitMs)
  })
  const allowed = await Promise.race([asked, late])
  clearTimeout(timer)
  // a camera allowed after the wait is still closed again at once (above)
  return allowed
}
