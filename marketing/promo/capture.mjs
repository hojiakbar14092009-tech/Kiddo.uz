// Renders the promo frame by frame with a fake clock.
// node marketing/promo/capture.mjs --lang en --fmt landscape --out dir [--times 1,2,3] [--fps 30]
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc),
      [],
    ),
)
const lang = args.lang ?? 'en'
const fmt = args.fmt ?? 'landscape'
const fps = Number(args.fps ?? 30)
const out = args.out ?? 'out'
const port = args.port ?? '5190'
const [w, h] = fmt === 'portrait' ? [1080, 1920] : [1920, 1080]
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: w, height: h } })
await page.clock.install({ time: 0 })
// framer-motion would hand opacity/transform to WAAPI, which ignores the fake clock
await page.addInitScript(() => {
  delete Element.prototype.animate
})
await page.goto(`http://localhost:${port}/?lang=${lang}&fmt=${fmt}`)
await page.waitForFunction(() => window.__ready)
await page.evaluate(() => window.__ready)
await page.waitForTimeout(300)

let clockMs = 0
async function seek(t) {
  const target = Math.round(t * 1000)
  if (target > clockMs) {
    await page.clock.runFor(target - clockMs)
    clockMs = target
  }
  await page.evaluate((v) => window.__setT(v), t)
  // let framer's frame loop run for the new frame
  await page.clock.runFor(1)
  clockMs += 1
}

if (args.times) {
  let now = 0
  for (const t of args.times.split(',').map(Number)) {
    while (now + 0.1 < t) {
      now += 0.1
      await seek(now)
    }
    now = t
    await seek(t)
    await page.screenshot({ path: `${out}/${lang}-${fmt}-${t.toFixed(2)}.png` })
  }
} else {
  const total = Math.round(30 * fps)
  const ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '17',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `${out}/${lang}-${fmt}.mp4`,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  for (let f = 0; f < total; f += 1) {
    await seek(f / fps)
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    if (f % 90 === 0) console.log(`${lang} ${fmt} frame ${f}/${total}`)
  }
  ff.stdin.end()
  await new Promise((r) => ff.on('close', r))
}
await browser.close()
