#!/usr/bin/env node
/*
 * Renders the "My Uzbekistan" landmark models
 * (src/features/worlds/uzbekistan/models.ts) into still pictures:
 * public/3d/worlds/uz-<id>.webp (≤ 40 KB each). They are shown first, on
 * devices without WebGL and as answer pictures in the map game.
 *
 *   node scripts/render-uzbekistan.mjs
 *
 * Like render-planets.mjs: a Vite dev server loads the TypeScript model code
 * into headless Chromium (software WebGL), which saves each picture.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/3d/worlds')
const IDS = ['registan', 'kalta-minor', 'ark', 'yurt', 'doppi', 'tandir']
const SIZE = 384
const MAX_BYTES = 40 * 1024
const PORT = Number(process.env.PORT ?? 4209)

const server = await createServer({
  root,
  logLevel: 'error',
  server: { port: PORT, strictPort: true },
})
await server.listen()

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
try {
  const page = await browser.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('[page]', message.text())
  })
  await page.goto(`http://localhost:${PORT}/src/features/worlds/uzbekistan/content.ts`)
  await mkdir(out, { recursive: true })
  for (const id of IDS) {
    let bytes = null
    // lower the webp quality until the picture fits the budget
    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      const dataUrl = await page.evaluate(
        async ({ id, size, quality }) => {
          const { renderStill } = await import('/src/features/worlds/uzbekistan/still.ts')
          return renderStill(id, size, quality)
        },
        { id, size: SIZE, quality },
      )
      if (!dataUrl.startsWith('data:image/webp')) throw new Error(`${id}: no webp output`)
      bytes = Buffer.from(dataUrl.split(',')[1], 'base64')
      if (bytes.length <= MAX_BYTES) break
    }
    const file = join(out, `uz-${id}.webp`)
    await writeFile(file, bytes)
    console.log('rendered', file, `${Math.round(bytes.length / 1024)} KB`)
  }
} finally {
  await browser.close()
  await server.close()
}
