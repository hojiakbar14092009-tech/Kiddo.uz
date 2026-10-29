import { describe, expect, it } from 'vitest'
import {
  checkPhotoFile,
  isStoredPhoto,
  looksLikeImage,
  PHOTO_MAX_BYTES,
  photoFromFile,
} from './photo'

/* Phase 24: a child's photo — only real PNG, JPEG or WebP pictures. */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16])
const WEBP = new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')
const file = (bytes: BlobPart, name: string, type: string) => new File([bytes], name, { type })

describe('photo checks', () => {
  it('knows the first bytes of PNG, JPEG and WebP', () => {
    expect(looksLikeImage(PNG)).toBe(true)
    expect(looksLikeImage(JPEG)).toBe(true)
    expect(looksLikeImage(WEBP)).toBe(true)
    expect(looksLikeImage(new TextEncoder().encode('hello world'))).toBe(false)
    expect(looksLikeImage(new Uint8Array())).toBe(false)
  })

  it('refuses other types, empty or too big files, and a renamed non-picture', async () => {
    expect(await checkPhotoFile(file(PNG, 'a.png', 'image/png'))).toBeNull()
    expect(await checkPhotoFile(file(JPEG, 'a.jpg', 'image/jpeg'))).toBeNull()
    expect(await checkPhotoFile(file('<svg/>', 'a.svg', 'image/svg+xml'))).toBe('type')
    expect(await checkPhotoFile(file('%PDF-1.7', 'a.pdf', 'application/pdf'))).toBe('type')
    expect(await checkPhotoFile(file('', 'a.png', 'image/png'))).toBe('size')
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1)
    big.set(PNG)
    expect(await checkPhotoFile(file(big, 'big.png', 'image/png'))).toBe('size')
    // a text file renamed to .png
    expect(await checkPhotoFile(file('just text, honest', 'fake.png', 'image/png'))).toBe(
      'notImage',
    )
  })

  it('a file that passes the checks but does not decode is refused', async () => {
    // jsdom cannot decode pictures: the same path as a broken picture in a browser
    expect(await photoFromFile(file(PNG, 'broken.png', 'image/png'))).toEqual({
      ok: false,
      error: 'notImage',
    })
  })

  it('only our own small JPEG data URLs are shown', () => {
    expect(isStoredPhoto('data:image/jpeg;base64,AAAA')).toBe(true)
    expect(isStoredPhoto('data:image/svg+xml;base64,AAAA')).toBe(false)
    expect(isStoredPhoto('https://example.com/a.jpg')).toBe(false)
    expect(isStoredPhoto(`data:image/jpeg;base64,${'A'.repeat(300_000)}`)).toBe(false)
    expect(isStoredPhoto(undefined)).toBe(false)
  })
})
