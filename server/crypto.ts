import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { requireEnv } from './env.js'

/** Node's crypto only (no home-made algorithms): random tokens, SHA-256, HMAC-SHA256. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')
export const randomId = () => randomBytes(16).toString('hex')
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
/** A keyed hash with AUTH_SECRET: a stolen database alone cannot test guesses of a 6-digit code. */
export const hmac = (value: string) =>
  createHmac('sha256', requireEnv('AUTH_SECRET')).update(value).digest('hex')
export const sixDigits = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

export function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
