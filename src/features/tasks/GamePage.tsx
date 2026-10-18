import { Navigate, useParams } from 'react-router-dom'
import { isGameOpen } from '@/features/age/ageLevel'
import { useAgeLevel } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'
import { ChoiceGame } from './ChoiceGame'
import { isChoiceGame, isGameType } from './games'
import { MemoryGame } from './MemoryGame'
import { TraceGame } from './TraceGame'

/** `/tasks/:type` – a new game type or language always starts a fresh game. */
export function GamePage() {
  const { type } = useParams()
  const language = useLanguage()
  const level = useAgeLevel()
  // Unknown games, and games for older children, lead back home.
  if (!isGameType(type) || !isGameOpen(type, level)) return <Navigate to="/home" replace />

  const key = `${type}-${language}`
  if (isChoiceGame(type)) return <ChoiceGame key={key} type={type} />
  if (type === 'memory') return <MemoryGame key={key} />
  return <TraceGame key={key} />
}
