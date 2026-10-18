import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AlphabetItemPage } from '@/features/alphabet/AlphabetItemPage'
import { AlphabetPage } from '@/features/alphabet/AlphabetPage'
import { HomePage } from '@/features/home/HomePage'
import { ChildSelectPage } from '@/features/profiles/ChildSelectPage'
import { LanguagePage } from '@/features/onboarding/LanguagePage'
import { RequireParentGate } from '@/features/parent/gate/RequireParentGate'
import { ParentDashboardPage } from '@/features/parent/dashboard/ParentDashboardPage'
import { ParentLoginPage } from '@/features/parent/login/ParentLoginPage'
import { RequireParentSession } from '@/features/parent/RequireParentSession'
import { ShopPage } from '@/features/shop/ShopPage'
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
          { path: '/shop', element: <ShopPage /> },
        ],
      },
      {
        path: '/parent',
        element: <RequireParentGate />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'login', element: <ParentLoginPage /> },
          {
            element: <RequireParentSession />,
            children: [{ path: 'dashboard', element: <ParentDashboardPage /> }],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
