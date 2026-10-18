import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AlphabetPage } from '@/features/alphabet/AlphabetPage'
import { LetterPage } from '@/features/alphabet/LetterPage'
import { HomePage } from '@/features/home/HomePage'
import { LanguagePage } from '@/features/onboarding/LanguagePage'
import { RequireLanguage } from './RequireLanguage'

export const routes: RouteObject[] = [
  { path: '/', element: <LanguagePage /> },
  {
    element: <RequireLanguage />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/alphabet', element: <AlphabetPage /> },
      { path: '/alphabet/:letterId', element: <LetterPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
