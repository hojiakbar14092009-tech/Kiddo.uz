import { OUTFITS, type Outfit, type OutfitCategory } from './outfits'

export type Shelf = 'all' | 'for-you' | OutfitCategory

/**
 * The wardrobe in the order a learner of this stage looks for things: their
 * stage's categories first, then the rest. Nothing is hidden or locked.
 */
export function wardrobe(featured: readonly string[], shelf: Shelf): Outfit[] {
  const rank = (outfit: Outfit) => {
    const index = featured.indexOf(outfit.category)
    return index < 0 ? featured.length : index
  }
  const sorted = [...OUTFITS].sort((a, b) => rank(a) - rank(b))
  if (shelf === 'all') return sorted
  if (shelf === 'for-you') return sorted.filter((outfit) => featured.includes(outfit.category))
  return sorted.filter((outfit) => outfit.category === shelf)
}
