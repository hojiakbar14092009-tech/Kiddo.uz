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
import { EXAM_MIN_LEVEL } from '@/features/age/ageLevel'
import { RequireAge } from '@/features/age/RequireAge'
import { AppShell } from './AppShell'
import { LoadingScreen } from './LoadingScreen'
import { RequireLanguage } from './RequireLanguage'
import { RouteErrorScreen } from './errors/RouteErrorScreen'

/*
 * Everyday child screens are in the main bundle so they open instantly.
 * The shop, the big test and the parent area (with Supabase) load on demand.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    hydrateFallbackElement: <LoadingScreen />,
    // a screen that fails to render or to load never leaves the child on a blank page
    errorElement: <RouteErrorScreen />,
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
                element: <RequireAge min={EXAM_MIN_LEVEL} />,
                children: [
                  {
                    path: '/exam',
                    lazy: async () => ({
                      Component: (await import('@/features/exam/ExamPage')).ExamPage,
                    }),
                  },
                ],
              },
              // The new learning sections load on demand (3D and content only when opened).
              {
                path: '/learn/words',
                lazy: async () => ({
                  Component: (await import('@/features/firstWords/FirstWordsPage')).FirstWordsPage,
                }),
              },
              {
                path: '/learn/help',
                lazy: async () => ({
                  Component: (await import('@/features/helpMascot/HelpMascotPage')).HelpMascotPage,
                }),
              },
              {
                path: '/learn/tales/*',
                lazy: async () => ({
                  Component: (await import('@/features/tales/TalesPage')).TalesPage,
                }),
              },
              {
                path: '/learn/space/*',
                lazy: async () => ({
                  Component: (await import('@/features/space/SpacePage')).SpacePage,
                }),
              },
              {
                path: '/learn/math',
                lazy: async () => ({
                  Component: (await import('@/features/math/MathPage')).MathPage,
                }),
              },
              {
                path: '/learn/garden',
                lazy: async () => ({
                  Component: (await import('@/features/garden/GardenPage')).GardenPage,
                }),
              },
              // Tracing numbers and shapes, and the Creative Studio (linked from Kiddo City).
              ...['/trace', '/trace/:set', '/trace/:set/:item'].map((path) => ({
                path,
                lazy: async () => ({
                  Component: (await import('@/features/trace/TracePage')).TracePage,
                }),
              })),
              {
                path: '/studio',
                lazy: async () => ({
                  Component: (await import('@/features/studio/StudioPage')).StudioPage,
                }),
              },
              {
                path: '/studio/gallery',
                lazy: async () => ({
                  Component: (await import('@/features/studio/StudioGalleryPage'))
                    .StudioGalleryPage,
                }),
              },
              // Kiddo City's map and museum.
              {
                path: '/adventure',
                lazy: async () => ({
                  Component: (await import('@/features/adventure/AdventurePage')).AdventurePage,
                }),
              },
              {
                path: '/collection',
                lazy: async () => ({
                  Component: (await import('@/features/collection/CollectionPage')).CollectionPage,
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
      {
        path: '/admin',
        lazy: async () => ({
          Component: (await import('@/features/admin/AdminPage')).AdminPage,
        }),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
