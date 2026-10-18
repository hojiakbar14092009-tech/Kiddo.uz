import 'i18next'
import type { uz } from './locales/uz'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof uz }
  }
}
