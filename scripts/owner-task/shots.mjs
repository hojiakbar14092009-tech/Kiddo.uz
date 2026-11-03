#!/usr/bin/env node
/*
 * Before/after screenshots for the owner's report (Phase 57).
 *
 *   node shots.mjs <dist dir> <out dir> <pages file>
 *
 * Serves the built app with `vite preview`, then photographs each page on a
 * phone and a tablet, as an onboarded family in Uzbek. Run from the repo root: Playwright and Vite come from
 * its node_modules, even when this file is the workflow's copy elsewhere.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const PORT = 4180
const BASE = `http://localhost:${PORT}`
const [dist, out, pagesFile] = process.argv.slice(2)
if (!dist || !out || !pagesFile) {
  console.error('usage: shots.mjs <dist dir> <out dir> <pages file>')
  process.exit(2)
}

const repo = process.cwd()
const require = createRequire(path.join(repo, 'package.json'))
const { chromium, devices } = require('@playwright/test')

const pages = readFileSync(pagesFile, 'utf8')
  .split('\n')
  .filter((p) => /^\/[A-Za-z0-9/_-]*$/.test(p))
const DEVICES = [
  ['1phone', devices['Pixel 7']],
  ['2tablet', devices['iPad (gen 7) landscape']],
]

/** Onboarded, in Uzbek, the welcome tours off: the screen a returning family sees. */
const STATE = {
  cookies: [],
  origins: [
    {
      origin: BASE,
      localStorage: [
        {
          name: 'kiddo.settings',
          value: JSON.stringify({
            state: { language: 'uz', volume: 0, onboarded: true },
            version: 2,
          }),
        },
        { name: 'kiddo.e2e.tours', value: 'off' },
      ],
    },
  ],
}

const server = spawn(
  process.execPath,
  [
    path.join(repo, 'node_modules/vite/bin/vite.js'),
    'preview',
    '--outDir',
    path.resolve(dist),
    '--port',
    String(PORT),
    '--strictPort',
  ],
  { cwd: repo, stdio: 'ignore' },
)

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('vite preview did not start')
}

let failed = 0
try {
  await waitForServer()
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  for (const [index, page] of pages.entries()) {
    const slug = page.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'root'
    for (const [name, device] of DEVICES) {
      const context = await browser.newContext({
        ...device,
        storageState: STATE,
        reducedMotion: 'reduce',
      })
      const tab = await context.newPage()
      try {
        await tab.goto(`${BASE}${page}`, { waitUntil: 'load', timeout: 20_000 })
        await tab.waitForTimeout(2500)
        await tab.screenshot({ path: path.join(out, `${index}-${slug}-${name}.png`) })
      } catch (error) {
        failed += 1
        console.error(`${page} ${name}: ${error instanceof Error ? error.message : error}`)
      }
      await context.close()
    }
  }
  await browser.close()
} finally {
  server.kill()
}
console.log(`shots: ${pages.length} pages, ${failed} failed`)
