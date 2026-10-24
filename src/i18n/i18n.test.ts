import { afterEach, describe, expect, it, vi } from 'vitest'

/*
 * A fresh copy of the i18n module (the shared one in tests has every language
 * registered by the test setup), to check what the app really ships first.
 */
async function freshI18n() {
  vi.resetModules()
  return import('./index')
}

describe('interface languages', () => {
  afterEach(() => vi.resetModules())

  it('ships only Uzbek up front; Russian and English load on demand', async () => {
    const { default: i18n, loadLanguage } = await freshI18n()
    expect(i18n.hasResourceBundle('uz', 'translation')).toBe(true)
    expect(i18n.getResource('ru', 'translation', 'common.home')).toBeUndefined()
    await loadLanguage('ru')
    expect(i18n.getResource('ru', 'translation', 'common.home')).toBe('Главная')
  })

  it('shares one request when the same language is asked for twice', async () => {
    const { loadLanguage } = await freshI18n()
    const first = loadLanguage('en')
    expect(loadLanguage('en')).toBe(first)
    await first
    await expect(loadLanguage('en')).resolves.toBeUndefined()
  })

  it('a world’s own words do not count as the language being loaded', async () => {
    const { default: i18n, loadLanguage } = await freshI18n()
    i18n.addResourceBundle('ru', 'translation', { dino: { title: 'Долина динозавров' } }, true)
    await loadLanguage('ru')
    expect(i18n.getResource('ru', 'translation', 'common.home')).toBe('Главная')
    expect(i18n.getResource('ru', 'translation', 'dino.title')).toBe('Долина динозавров')
  })

  it('switches once the texts are in, and the last choice wins', async () => {
    const { default: i18n, applyLanguage, loadLanguage } = await freshI18n()
    applyLanguage('ru')
    applyLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    await Promise.all([loadLanguage('ru'), loadLanguage('en')])
    await vi.waitFor(() => expect(i18n.language).toBe('en'))
    expect(i18n.t('common.home')).toBe('Home')
  })

  it('texts that cannot load leave the screen as it was and report the language on screen', async () => {
    vi.doMock('./locales/en', () => Promise.reject(new Error('offline')))
    const { default: i18n, applyLanguage } = await freshI18n()
    const onFail = vi.fn()
    applyLanguage('en', onFail)
    await vi.waitFor(() => expect(onFail).toHaveBeenCalledWith('uz'))
    expect(i18n.language).toBe('uz')
    expect(document.documentElement.lang).toBe('uz')
    vi.doUnmock('./locales/en')
  })
})
