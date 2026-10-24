import { describe, expect, it } from 'vitest'
import vercel from '../../vercel.json'

/*
 * The browser security headers Vercel sends with every response (vercel.json).
 * The policy was checked against the running app (Phase 13: 27 routes, no
 * violation); these tests keep anyone from loosening it by accident.
 */
interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

const config: VercelConfig = vercel
const all = config.headers.find((entry) => entry.source === '/(.*)')
const header = (name: string) => all?.headers.find((item) => item.key === name)?.value ?? ''
const directive = (name: string) =>
  header('Content-Security-Policy')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? ''

describe('security headers', () => {
  it('apply to every path', () => {
    expect(all).toBeDefined()
  })

  it('scripts only from Kiddo itself: no inline or eval code', () => {
    expect(directive('script-src')).toBe("script-src 'self'")
    expect(header('Content-Security-Policy')).not.toContain('unsafe-eval')
  })

  it('no plugins, no other site may frame Kiddo, no base or form hijack', () => {
    expect(directive('object-src')).toBe("object-src 'none'")
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive('base-uri')).toBe("base-uri 'self'")
    expect(header('X-Frame-Options')).toBe('DENY')
  })

  it('talks only to its own server and Supabase', () => {
    expect(directive('connect-src')).toBe(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    )
  })

  it('no MIME sniffing, a short referrer, and no camera, microphone or location', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    const permissions = header('Permissions-Policy')
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()']) {
      expect(permissions).toContain(feature)
    }
  })

  it('the app shell is never cached stale, built files are cached for good', () => {
    const cache = (source: string) =>
      config.headers
        .find((entry) => entry.source === source)
        ?.headers.find((item) => item.key === 'Cache-Control')?.value
    expect(cache('/sw.js')).toContain('no-cache')
    expect(cache('/index.html')).toBe('no-cache')
    expect(cache('/assets/(.*)')).toContain('immutable')
  })
})
