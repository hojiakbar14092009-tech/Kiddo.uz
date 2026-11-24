import type { CapacitorConfig } from '@capacitor/cli'

// appId is permanent once the store listings exist – change it before the first upload, never after
const config: CapacitorConfig = {
  appId: 'uz.kiddo.app',
  appName: 'Kiddo',
  webDir: 'dist',
}

export default config
