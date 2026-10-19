#!/usr/bin/env node
/*
 * Renders Kiddo's own 3D planet models (src/features/space/three/planetModel.ts)
 * into still pictures: public/3d/space/<id>.webp. They are used on cards and
 * answer choices, and as the fallback when a device cannot show WebGL.
 *
 *   node scripts/render-planets.mjs
 *
 * It starts a Vite dev server (to load the TypeScript model code), opens it in
 * headless Chromium through Playwright and saves every planet with a clear
 * background.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/3d/space')
const IDS = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]
const SIZE = 512
const PORT = 4197

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
  // any same-origin HTML document will do (it only needs to load the model module)
  await page.goto(`http://localhost:${PORT}/src/features/space/content.ts`)
  await mkdir(out, { recursive: true })
  for (const id of IDS) {
    const dataUrl = await page.evaluate(
      async ({ id, size }) => {
        const { renderStill } = await import('/src/features/space/three/still.ts')
        return renderStill(id, size)
      },
      { id, size: SIZE },
    )
    if (!dataUrl.startsWith('data:image/webp')) throw new Error(`${id}: no webp output`)
    const file = join(out, `${id}.webp`)
    await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
    console.log('rendered', file)
  }
} finally {
  await browser.close()
  await server.close()
}
