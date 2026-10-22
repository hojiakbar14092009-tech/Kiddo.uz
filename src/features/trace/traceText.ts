import type { TFunction } from 'i18next'
import type { ShapeId, TraceItem } from './traceItems'

/** "7" or the shape's name ("Doira"), for titles and labels. */
export function traceItemName(t: TFunction, item: Pick<TraceItem, 'set' | 'id'>): string {
  return item.set === 'numbers'
    ? t('trace.numberName', { number: item.id })
    : t(`trace.shapes.${item.id as ShapeId}`)
}
