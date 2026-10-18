import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AlphabetItemPage } from '@/features/alphabet/AlphabetItemPage'
import { AlphabetPage } from '@/features/alphabet/AlphabetPage'
import { HomePage } from '@/features/home/HomePage'
import { LanguagePage } from '@/features/onboarding/LanguagePage'
import { RequireParentGate } from '@/features/parent/gate/RequireParentGate'
import { RequireParentSession } from '@/features/parent/RequireParentSession'
import { ChildSelectPage } from '@/features/profiles/ChildSelectPage'
import { RestPage } from '@/features/rest/RestPage'
import { ScreenTimeGuard } from '@/features/rest/ScreenTimeGuard'
import { GamePage } from '@/features/tasks/GamePage'
import { RewardPage } from '@/features/tasks/RewardPage'
import { AppShell } from './AppShell'
import { LoadingScreen } from './LoadingScreen'
import { RequireLanguage } from './RequireLanguage'

/*
 * Everyday child screens are in the main bundle so they open instantly.
 * The shop, the big test and the parent area (with Supabase) load on demand.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      { path: '/', element: <LanguagePage /> },
      {
        element: <RequireLanguage />,
        children: [
          {
            element: <ScreenTimeGuard />,
            children: [
              { path: '/child-select', element: <ChildSelectPage /> },
              { path: '/home', element: <HomePage /> },
              { path: '/alphabet', element: <AlphabetPage /> },
              { path: '/alphabet/:itemId', element: <AlphabetItemPage /> },
              { path: '/tasks/:type', element: <GamePage /> },
              { path: '/reward', element: <RewardPage /> },
              {
                path: '/shop',
                lazy: async () => ({
                  Component: (await import('@/features/shop/ShopPage')).ShopPage,
                }),
              },
              {
                path: '/exam',
                lazy: async () => ({
                  Component: (await import('@/features/exam/ExamPage')).ExamPage,
                }),
              },
              { path: '/rest', element: <RestPage /> },
            ],
          },
        ],
      },
      {
        path: '/parent',
        element: <RequireParentGate />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          {
            path: 'login',
            lazy: async () => ({
              Component: (await import('@/features/parent/login/ParentLoginPage')).ParentLoginPage,
            }),
          },
          {
            element: <RequireParentSession />,
            children: [
              {
                path: 'dashboard',
                lazy: async () => ({
                  Component: (await import('@/features/parent/dashboard/ParentDashboardPage'))
                    .ParentDashboardPage,
                }),
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
