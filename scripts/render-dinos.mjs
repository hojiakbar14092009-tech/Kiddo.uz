#!/usr/bin/env node
/*
 * Renders Kiddo's own low-poly dinosaur models
 * (src/features/worlds/dino/models.ts) into still pictures:
 * public/3d/worlds/dino-<id>.webp. They show first in the 3D Explorer, on
 * cards and answer choices, and stay when a device cannot show WebGL.
 *
 *   node scripts/render-dinos.mjs
 *
 * Like render-planets.mjs: a Vite dev server loads the TypeScript model code
 * in headless Chromium (SwiftShader WebGL) and every model is saved with a
 * clear background. Each file must stay ≤ 40 KB.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/3d/worlds')
const IDS = ['trex', 'triceratops', 'stegosaurus', 'brachiosaurus', 'pteranodon', 'ankylosaurus']
const SIZE = 384
const MAX_BYTES = 40 * 1024
const PORT = 4198

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
  // any same-origin document will do (it only needs to load the model module)
  await page.goto(`http://localhost:${PORT}/src/features/worlds/dino/content.ts`)
  await mkdir(out, { recursive: true })
  for (const id of IDS) {
    let quality = 0.82
    let bytes
    for (;;) {
      const dataUrl = await page.evaluate(
        async ({ id, size, quality }) => {
          const { renderDinoStill } = await import('/src/features/worlds/dino/still.ts')
          return renderDinoStill(id, size, quality)
        },
        { id, size: SIZE, quality },
      )
      if (!dataUrl.startsWith('data:image/webp')) throw new Error(`${id}: no webp output`)
      bytes = Buffer.from(dataUrl.split(',')[1], 'base64')
      if (bytes.length <= MAX_BYTES || quality < 0.4) break
      quality -= 0.1
    }
    const file = join(out, `dino-${id}.webp`)
    await writeFile(file, bytes)
    console.log('rendered', file, `${(bytes.length / 1024).toFixed(1)} KB`)
  }
} finally {
  await browser.close()
  await server.close()
}
