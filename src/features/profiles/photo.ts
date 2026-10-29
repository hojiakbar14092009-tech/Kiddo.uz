/*
 * A child's photo (Phase 24): only real images are accepted. The file must
 * say it is PNG, JPEG or WebP, be at most 5 MB, start with that format's own
 * bytes (a renamed file is refused) and decode as a picture. It is then made
 * into a small 256 × 256 JPEG on this device; the original never leaves it,
 * and the photo is never synced.
 */

export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_SIZE = 256

export type PhotoError = 'type' | 'size' | 'notImage'

/** Does the file start with the bytes of a PNG, JPEG or WebP picture? */
export function looksLikeImage(bytes: Uint8Array): boolean {
  const at = (i: number) => bytes[i] ?? -1
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)
  const jpeg = at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff
  const ascii = (from: number, text: string) =>
    [...text].every((char, i) => at(from + i) === char.charCodeAt(0))
  const webp = ascii(0, 'RIFF') && ascii(8, 'WEBP')
  return png || jpeg || webp
}

/** The quick checks before decoding: type, size and the file's first bytes. */
export async function checkPhotoFile(file: File): Promise<PhotoError | null> {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size === 0 || file.size > PHOTO_MAX_BYTES) return 'size'
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  return looksLikeImage(head) ? null : 'notImage'
}

/** A checked photo as a small square JPEG data URL (centre crop), or the reason it was refused. */
export async function photoFromFile(
  file: File,
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: PhotoError }> {
  const error = await checkPhotoFile(file)
  if (error) return { ok: false, error }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const side = Math.min(bitmap.width, bitmap.height)
    if (!(side > 0)) return { ok: false, error: 'notImage' }
    const canvas = document.createElement('canvas')
    canvas.width = PHOTO_SIZE
    canvas.height = PHOTO_SIZE
    const context = canvas.getContext('2d')
    if (!context) return { ok: false, error: 'notImage' }
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      PHOTO_SIZE,
      PHOTO_SIZE,
    )
    bitmap.close?.()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    if (!dataUrl.startsWith('data:image/jpeg')) return { ok: false, error: 'notImage' }
    return { ok: true, dataUrl }
  } catch {
    return { ok: false, error: 'notImage' }
  }
}

/** A stored photo is used only if it is our own small JPEG data URL. */
export function isStoredPhoto(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('data:image/jpeg;base64,') &&
    value.length < 200_000
  )
}
