import type { TFunction } from 'i18next'

/**
 * Translates a key that is built at run time (e.g. a domain's `nameKey`,
 * `universe.buildings.<id>`), which the typed `t` cannot check. Tests keep
 * every such key present in all three languages.
 */
export function tDynamic(t: TFunction, key: string, options?: Record<string, unknown>): string {
  return (t as unknown as (key: string, options?: Record<string, unknown>) => string)(key, options)
}
