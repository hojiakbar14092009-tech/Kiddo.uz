/// <reference types="vitest/config" />
import { rmSync } from 'node:fs'
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

export default defineConfig(({ mode }) => {
  const voicePrivate = isVoicePrivateBuild(loadEnv(mode, process.cwd(), 'VITE_'))
  return {
    plugins: [
      react(),
      tailwindcss(),
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
          // Everything the child area needs is precached, so it works fully offline.
          // Voice clips (several MB) are cached as they are first played instead
          // (public mode only: private-mode signed URLs are never cached).
          // pets: every pose, so a companion can turn sad or surprised offline (≈ 0.6 MB)
          globPatterns: [
            '**/*.{js,css,html,svg,png,woff2}',
            'audio/ui/*.mp3',
            '3d/**/*.webp',
            'pets/**/*.webp',
            // the mascots' still pictures (≈ 0.1 MB): a mascot is never missing offline
            'mascots/posters/*.webp',
          ],
          globIgnores: ['**/node_modules/**', ...VOICE_GLOB_IGNORES],
          runtimeCaching: [
            ...voiceRuntimeCaching(voicePrivate),
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
          ],
          // The 3D robot chunk (three.js) is about 1 MB.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // Only the lazily loaded 3D robot (three.js) is above the default 500 kB.
      chunkSizeWarningLimit: 1100,
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // the first lazy route import can be slow on a busy machine
      testTimeout: 15_000,
    },
  }
})
