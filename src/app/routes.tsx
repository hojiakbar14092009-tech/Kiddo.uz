import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AlphabetPage } from '@/features/alphabet/AlphabetPage'
import { AlphabetItemPage } from '@/features/alphabet/AlphabetItemPage'
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
      { path: '/alphabet/:itemId', element: <AlphabetItemPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
