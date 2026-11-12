/// <reference types="vitest/config" />
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  isVoicePrivateBuild,
  VOICE_DIST_DIR,
  VOICE_GLOB_IGNORES,
  voiceRuntimeCaching,
} from './src/services/audio/voiceBuild.ts'
import { shellOnly } from './src/app/pwaShell.ts'
import { devApi } from './scripts/dev-api.ts'

/**
 * VITE_VOICE_PRIVATE=true: the recorded clips stay out of dist (they are
 * served as signed URLs from the private bucket, docs/architecture/audio-security.md).
 */
function dropPublicVoice(): Plugin {
  let outDir = 'dist'
  return {
    name: 'kiddo:drop-public-voice',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      rmSync(resolve(outDir, VOICE_DIST_DIR), { recursive: true, force: true })
    },
  }
}

/**
 * A Russian or English child's interface texts are their own chunk (src/i18n).
 * A tiny script in <head> reads the stored language and preloads that chunk
 * at once, in parallel with the app, so the first paint does not wait one more
 * round trip for it. It is a file of its own (/lang-preload.js, not inline), so
 * a Content-Security-Policy needs no 'unsafe-inline' for scripts; it is written
 * after the bundle, when the hashed chunk names are known.
 */
function preloadStoredLanguage(): Plugin {
  const FILE = 'lang-preload.js'
  return {
    name: 'kiddo:preload-stored-language',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: () => [
      { tag: 'script', attrs: { src: `/${FILE}` }, injectTo: 'head-prepend' },
    ],
    generateBundle(_options, bundle) {
      const files: Record<string, string> = {}
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        const match = /src\/i18n\/locales\/(ru|en)\.ts$/.exec(chunk.facadeModuleId ?? '')
        if (match?.[1]) files[match[1]] = `/${chunk.fileName}`
      }
      const source = `(function(){try{var s=JSON.parse(localStorage.getItem('kiddo.settings')||'null');var f=${JSON.stringify(files)}[s&&s.state&&s.state.language];if(f){var l=document.createElement('link');l.rel='modulepreload';l.href=f;document.head.appendChild(l)}}catch(e){}})()\n`
      this.emitFile({ type: 'asset', fileName: FILE, source })
    },
  }
}

/**
 * MVP stage 1: the offline copy is only the app shell – index.html's own scripts and
 * styles (its <script> and modulepreload links). Before, every chunk and picture was
 * precached (8.3 MB) and on a first visit over a slow network that download competed
 * with the screen the child was looking at. Section chunks, pictures and fonts are
 * cached the first time they are used (runtimeCaching below).
 */
let builtDir = 'dist'
const rememberOutDir: Plugin = {
  name: 'kiddo:out-dir',
  apply: 'build',
  configResolved(config) {
    builtDir = resolve(config.root, config.build.outDir)
  },
}

export default defineConfig(({ mode }) => {
  const voicePrivate = isVoicePrivateBuild(loadEnv(mode, process.cwd(), 'VITE_'))
  return {
    plugins: [
      react(),
      tailwindcss(),
      rememberOutDir,
      devApi(),
      preloadStoredLanguage(),
      ...(voicePrivate ? [dropPublicVoice()] : []),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'audio/ui/*.mp3'],
        manifest: {
          name: 'Kiddo – alifbo va sonlar',
          short_name: 'Kiddo',
          description: '4–6 yoshli bolalar uchun o‘zbek, rus va ingliz alifbosi hamda sonlar',
          lang: 'uz',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          background_color: '#FFF8EC',
          theme_color: '#FFF8EC',
          categories: ['education', 'kids'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // The app shell is precached (shellOnly); everything else is cached at first use.
          // Voice clips (several MB) are cached as they are first played
          // (public mode only: private-mode signed URLs are never cached).
          globPatterns: ['**/*.{js,css,html}', 'audio/ui/*.mp3'], // + includeAssets and the manifest icons
          // the attention helper's face detector is only for families that turned
          // the camera on: cached when first used, never precached for everyone
          globIgnores: ['**/node_modules/**', '**/vision_wasm*', ...VOICE_GLOB_IGNORES],
          manifestTransforms: [
            (entries) => ({
              manifest: shellOnly(entries, readFileSync(resolve(builtDir, 'index.html'), 'utf8')),
              warnings: [],
            }),
          ],
          runtimeCaching: [
            ...voiceRuntimeCaching(voicePrivate),
            // pictures (3D icons, pets, still mascots, worksheets): a picture seen once works offline
            {
              urlPattern: ({ url }: { url: URL }) =>
                /^\/(3d|pets|pictures|icons|mascots\/posters)\/.*\.(webp|png|svg)$/.test(
                  url.pathname,
                ),
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'kiddo-pictures',
                expiration: { maxEntries: 600 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // 3D mascots (0.2–0.4 MB each) are cached when first met, not precached; a rebuilt
            // model replaces the cached one on the next visit (the cached one plays meanwhile)
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.pathname.startsWith('/mascots/') && url.pathname.endsWith('.glb'),
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'kiddo-mascots',
                expiration: { maxEntries: 20 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.pathname.startsWith('/models/mediapipe/') ||
                /\/assets\/vision_wasm[^/]*\.(js|wasm)$/.test(url.pathname),
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'kiddo-face',
                expiration: { maxEntries: 8 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // section chunks, fonts and styles: hashed names never change, so the first copy is final
            {
              urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/assets/'),
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'kiddo-assets',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
          // The 3D robot chunk (three.js) is about 1 MB.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
          // sign-in redirects and webhooks are the server's, never the app's index.html
          navigateFallbackDenylist: [/^\/api(\/|$)/],
          cleanupOutdatedCaches: true,
          // take the open page at once, so what a child opens on the first visit is cached for offline
          clientsClaim: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // Only the lazily loaded 3D robot (three.js, ≈ 1 MB) and the attention helper's face
      // detector (≈ 1.3 MB, loaded only when a parent turned the camera on) are above 500 kB.
      chunkSizeWarningLimit: 1400,
    },
    test: {
      css: false,
      // the first lazy route import can be slow on a busy machine
      testTimeout: 15_000,
      projects: [
        {
          extends: true,
          test: {
            name: 'app',
            environment: 'jsdom',
            include: [
              'src/**/*.test.{ts,tsx}',
              'supabase/functions/**/*.test.ts',
              'scripts/**/*.test.ts',
            ],
            setupFiles: ['./src/test/setup.ts'],
          },
        },
        // the API (server/): plain Node, an in-memory libSQL database, no browser setup
        {
          extends: true,
          test: { name: 'server', environment: 'node', include: ['server/**/*.test.ts'] },
        },
      ],
    },
  }
})
