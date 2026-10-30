import { Navigate, useParams } from 'react-router-dom'
import { useLanguage } from '@/store/settingsStore'
import { CoachMarks } from '@/features/onboarding/CoachMarks'
import { ChoiceGame } from './ChoiceGame'
import { isChoiceGame, isGameType } from './games'
import { MemoryGame } from './MemoryGame'
import { TraceGame } from './TraceGame'

/** `/tasks/:type` – a new game type or language always starts a fresh game. */
export function GamePage() {
  const { type } = useParams()
  const language = useLanguage()
  // Unknown games lead back home; every game is open at any age.
  if (!isGameType(type)) return <Navigate to="/home" replace />

  const key = `${type}-${language}`
  const game = isChoiceGame(type) ? (
    <ChoiceGame key={key} type={type} />
  ) : type === 'memory' ? (
    <MemoryGame key={key} />
  ) : (
    <TraceGame key={key} />
  )
  return (
    <>
      {game}
      {/* how to answer and how to get home, shown on the game itself (per child) */}
      <CoachMarks tour="play" delayMs={1200} />
    </>
  )
}
