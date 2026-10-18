/*
 * Promo codes kept on the device (when there is no Supabase account) are never
 * stored or shipped as plain text: each one is kept as a salted SHA-256 hash
 * (to check a code someone types) and a sealed copy (to hand the code out
 * after an ad). Sealing is an obfuscation, not encryption: it keeps codes out
 * of the bundle, local storage and devtools searches. With Supabase the codes
 * live only on the server (supabase/migrations/0004_promo_ads.sql).
 */

const KEY = 'pixi+bipbot/kiddo-promo'

export interface SealedCode {
  /** sha256("kiddo-promo:" + code), hex. */
  hash: string
  /** The code XOR-ed with a keystream from KEY and the nonce, base64. */
  sealed: string
  nonce: number
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/** A small deterministic keystream (xorshift32) from the key and a nonce. */
function keystream(length: number, nonce: number): number[] {
  let seed = nonce >>> 0 || 1
  for (let i = 0; i < KEY.length; i += 1)
    seed = Math.imul(seed ^ KEY.charCodeAt(i), 2654435761) >>> 0 || 1
  const out: number[] = []
  for (let i = 0; i < length; i += 1) {
    seed ^= seed << 13
    seed >>>= 0
    seed ^= seed >>> 17
    seed ^= seed << 5
    seed >>>= 0
    out.push(seed & 0xff)
  }
  return out
}

function xor(bytes: number[], nonce: number): number[] {
  const stream = keystream(bytes.length, nonce)
  return bytes.map((byte, i) => byte ^ stream[i]!)
}

export function seal(code: string, nonce: number): string {
  const bytes = [...new TextEncoder().encode(normalizeCode(code))]
  return btoa(String.fromCharCode(...xor(bytes, nonce)))
}

export function unseal({ sealed, nonce }: Pick<SealedCode, 'sealed' | 'nonce'>): string {
  const bytes = [...atob(sealed)].map((char) => char.charCodeAt(0))
  return new TextDecoder().decode(new Uint8Array(xor(bytes, nonce)))
}

export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(`kiddo-promo:${normalizeCode(code)}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function sealCode(code: string): Promise<SealedCode> {
  const nonce = (Math.random() * 0xffffffff) >>> 0
  return { hash: await hashCode(code), sealed: seal(code, nonce), nonce }
}
