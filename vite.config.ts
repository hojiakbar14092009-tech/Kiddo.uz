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

export default defineConfig(({ mode }) => {
  const voicePrivate = isVoicePrivateBuild(loadEnv(mode, process.cwd(), 'VITE_'))
  return {
    plugins: [
      react(),
      tailwindcss(),
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
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'audio/ui/*.mp3', '3d/**/*.webp'],
          globIgnores: ['**/node_modules/**', ...VOICE_GLOB_IGNORES],
          runtimeCaching: voiceRuntimeCaching(voicePrivate),
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
