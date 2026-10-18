import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AlphabetItemPage } from '@/features/alphabet/AlphabetItemPage'
import { AlphabetPage } from '@/features/alphabet/AlphabetPage'
import { HomePage } from '@/features/home/HomePage'
import { ChildSelectPage } from '@/features/profiles/ChildSelectPage'
import { LanguagePage } from '@/features/onboarding/LanguagePage'
import { GamePage } from '@/features/tasks/GamePage'
import { RewardPage } from '@/features/tasks/RewardPage'
import { AppShell } from './AppShell'
import { RequireLanguage } from './RequireLanguage'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <LanguagePage /> },
      {
        element: <RequireLanguage />,
        children: [
          { path: '/child-select', element: <ChildSelectPage /> },
          { path: '/home', element: <HomePage /> },
          { path: '/alphabet', element: <AlphabetPage /> },
          { path: '/alphabet/:itemId', element: <AlphabetItemPage /> },
          { path: '/tasks/:type', element: <GamePage /> },
          { path: '/reward', element: <RewardPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
