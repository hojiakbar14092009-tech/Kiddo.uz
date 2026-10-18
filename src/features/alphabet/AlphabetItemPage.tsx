import { useParams } from 'react-router-dom'
import { isNumberId } from '@/content/numbers'
import { LetterPage } from './LetterPage'
import { NumberPage } from './NumberPage'

/** `/alphabet/:itemId` shows a letter (`sh`) or a number (`num-3`). */
export function AlphabetItemPage() {
  const { itemId = '' } = useParams()
  return isNumberId(itemId) ? <NumberPage /> : <LetterPage />
}
