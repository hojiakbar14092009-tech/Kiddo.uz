/**
 * Performance budget of a production build (MVP stage 1): fails when a file or the
 * first screen's JavaScript grows past its limit. Run after `vite build`:
 *   node scripts/perf-budget.mjs [dist]
 * A limit may grow only with a reason written next to it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIR = process.argv[2] ?? 'dist'
const KB = 1024
const LIMITS = {
  /** index.html's own scripts (the app shell), gzip. Measured 360 KB on 2026-11-12 (70 scripts: react-dom, router, framer-motion, i18n uz, stores). */
  shellJsGzip: 370 * KB,
  /** the service worker's offline copy (precache), raw bytes. Was 8.26 MB before stage 1. */
  precache: 2.5 * KB * KB,
  /** per file, by extension (raw bytes) */
  file: {
    '.mp4': 3 * KB * KB,
    '.glb': 450 * KB,
    '.webp': 200 * KB,
    '.png': 200 * KB,
    '.mp3': 400 * KB,
    '.woff2': 60 * KB,
    '.css': 150 * KB,
    '.js': 600 * KB,
  },
  /** lazily loaded chunks allowed above the .js limit, with the reason */
  bigChunks: {
    // three.js scene code, loaded only on 3D screens
    prepareRenderer: 700 * KB,
    // the attention helper's face detector, loaded only when a parent turned the camera on
    'face-api': 1400 * KB,
  },
}

const problems = []
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

for (const path of walk(DIR)) {
  if (path.includes(`${join(DIR, 'audio', 'voice')}`)) continue // voice clips: many small files, cached on use
  const ext = path.slice(path.lastIndexOf('.'))
  const size = statSync(path).size
  let limit = LIMITS.file[ext]
  if (ext === '.js') {
    const big = Object.entries(LIMITS.bigChunks).find(([name]) => path.includes(name))
    if (big) limit = big[1]
  }
  if (limit && size > limit)
    problems.push(
      `${relative(DIR, path)}: ${(size / KB).toFixed(0)} KB > ${(limit / KB).toFixed(0)} KB`,
    )
}

const html = readFileSync(join(DIR, 'index.html'), 'utf8')
const shell = [...html.matchAll(/(?:src|href)="\/([^"]+\.js)"/g)].map((m) => m[1])
const shellGzip = shell.reduce(
  (sum, file) => sum + gzipSync(readFileSync(join(DIR, file))).length,
  0,
)
if (shellGzip > LIMITS.shellJsGzip)
  problems.push(
    `app shell JS ${(shellGzip / KB).toFixed(0)} KB gzip > ${LIMITS.shellJsGzip / KB} KB`,
  )

const sw = readFileSync(join(DIR, 'sw.js'), 'utf8')
const precached = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
const precache = precached.reduce((sum, url) => sum + statSync(join(DIR, url)).size, 0)
if (precache > LIMITS.precache)
  problems.push(`precache ${(precache / KB / KB).toFixed(2)} MB > ${LIMITS.precache / KB / KB} MB`)

console.log(
  `app shell: ${shell.length} scripts, ${(shellGzip / KB).toFixed(0)} KB gzip · precache: ${precached.length} files, ${(precache / KB / KB).toFixed(2)} MB`,
)
if (problems.length) {
  console.error(`Performance budget exceeded:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log('Performance budget: OK')
