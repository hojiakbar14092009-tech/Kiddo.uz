import { Navigate, useParams } from 'react-router-dom'
import { isDinoId } from './content'
import { DigGame } from './DigGame'
import { DINO_ROOT, DinoDetail, DinoHub, DinoList } from './explore'
import { QuizGame } from './QuizGame'
import { useDinoLanguage } from './text'

/**
 * The Dinosaur world (`/worlds/dino`, the Dinosaur Valley of the Adventure
 * Map and the Dino Park of Kiddo City): explore six animals in the 3D
 * Explorer, dig up bones, and a short quiz. The dig and the quiz adapt to
 * the 'science' challenge level and report to the universe.
 */
export function DinoPage() {
  const { mode, dinoId } = useParams()
  // the texts are per language: a new language starts the screen again in it
  const language = useDinoLanguage()

  if (dinoId !== undefined) {
    if (!isDinoId(dinoId)) return <Navigate to={`${DINO_ROOT}/explore`} replace />
    return <DinoDetail key={`${dinoId}-${language}`} id={dinoId} />
  }
  switch (mode) {
    case undefined:
      return <DinoHub key={language} />
    case 'explore':
      return <DinoList key={language} />
    case 'dig':
      return <DigGame key={language} />
    case 'quiz':
      return <QuizGame key={language} />
    default:
      return <Navigate to={DINO_ROOT} replace />
  }
}
