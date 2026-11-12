import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AlphabetItemPage } from '@/features/alphabet/AlphabetItemPage'
import { AlphabetPage } from '@/features/alphabet/AlphabetPage'
import { HomePage } from '@/features/home/HomePage'
import { ExploreHub } from '@/features/hubs/ExploreHub'
import { LearnHub } from '@/features/hubs/LearnHub'
import { MyWorldHub } from '@/features/hubs/MyWorldHub'
import { LanguagePage } from '@/features/onboarding/LanguagePage'
import { WelcomePage } from '@/features/onboarding/WelcomePage'
import { RequireParentGate } from '@/features/parent/gate/RequireParentGate'
import { RequireParentSession } from '@/features/parent/RequireParentSession'
import { ChildSelectPage } from '@/features/profiles/ChildSelectPage'
import { ScreenTimeGuard } from '@/features/rest/ScreenTimeGuard'
import { GamePage } from '@/features/tasks/GamePage'
import { RewardPage } from '@/features/tasks/RewardPage'
import { AppShell } from './AppShell'
import { LoadingScreen } from './LoadingScreen'
import { RequireLanguage } from './RequireLanguage'
import { RouteErrorScreen } from './errors/RouteErrorScreen'

/** Development and the e2e build only: the Mascot Lab route does not exist in production. */
const MASCOT_LAB = import.meta.env.DEV || import.meta.env.MODE === 'e2e'

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
      // Open to anyone (a store listing or a parent's browser links here), so outside RequireLanguage.
      {
        path: '/privacy',
        lazy: async () => ({
          Component: (await import('@/features/legal/PrivacyPage')).PrivacyPage,
        }),
      },
      {
        element: <RequireLanguage />,
        // a section that fails shows the error screen inside the shell; the app around it lives on
        errorElement: <RouteErrorScreen />,
        children: [
          {
            element: <ScreenTimeGuard />,
            children: [
              { path: '/welcome', element: <WelcomePage /> },
              { path: '/child-select', element: <ChildSelectPage /> },
              { path: '/home', element: <HomePage /> },
              { path: '/learn', element: <LearnHub /> },
              { path: '/explore', element: <ExploreHub /> },
              { path: '/my-world', element: <MyWorldHub /> },
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
              // open at any age: the big test waits for mastery, not a birthday
              {
                path: '/exam',
                lazy: async () => ({
                  Component: (await import('@/features/exam/ExamPage')).ExamPage,
                }),
              },
              // The new learning sections load on demand (3D and content only when opened).
              {
                path: '/learn/words',
                lazy: async () => ({
                  Component: (await import('@/features/firstWords/FirstWordsPage')).FirstWordsPage,
                }),
              },
              // Phase 49: an own story, three-language words and the find-at-home game
              {
                path: '/learn/my-story',
                lazy: async () => ({
                  Component: (await import('@/features/myStory/MyStoryPage')).MyStoryPage,
                }),
              },
              {
                path: '/learn/three-words',
                lazy: async () => ({
                  Component: (await import('@/features/threeWords/ThreeWordsPage')).ThreeWordsPage,
                }),
              },
              {
                path: '/explore/find-home',
                lazy: async () => ({
                  Component: (await import('@/features/findHome/FindHomePage')).FindHomePage,
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
              // Shadow Lab (Phase 34): Lumi's shadow puzzles
              {
                path: '/shadow-lab',
                lazy: async () => ({
                  Component: (await import('@/features/shadowLab/ShadowLabPage')).ShadowLabPage,
                }),
              },
              // Scale Portal (Phase 33): Astro's journey from a cell to the galaxy
              {
                path: '/scale-portal',
                lazy: async () => ({
                  Component: (await import('@/features/scalePortal/ScalePortalPage'))
                    .ScalePortalPage,
                }),
              },
              // The Story Engine: longer picture stories with choices (Story Library in Kiddo City).
              ...['/stories', '/stories/:storyId'].map((path) => ({
                path,
                lazy: async () => ({
                  Component: (await import('@/features/stories/StoriesPage')).StoriesPage,
                }),
              })),
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
              // Adaptive maths practice (Math Land in Kiddo City; /learn/math stays the lessons).
              {
                path: '/math-lab',
                lazy: async () => ({
                  Component: (await import('@/features/mathLab/MathLabPage')).MathLabPage,
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
              // Emotions & Social Skills (the Friendship House in Kiddo City).
              ...['/feelings', '/feelings/:kind'].map((path) => ({
                path,
                lazy: async () => ({
                  Component: (await import('@/features/feelings/FeelingsPage')).FeelingsPage,
                }),
              })),
              // Kiddo City's map and museum.
              {
                path: '/adventure',
                lazy: async () => ({
                  Component: (await import('@/features/adventure/AdventurePage')).AdventurePage,
                }),
              },
              // The Dinosaur world (Adventure Map, Dino Park in Kiddo City); 3D loads inside it.
              ...['/worlds/dino', '/worlds/dino/:mode', '/worlds/dino/explore/:dinoId'].map(
                (path) => ({
                  path,
                  lazy: async () => ({
                    Component: (await import('@/features/worlds/dino/DinoPage')).DinoPage,
                  }),
                }),
              ),
              // "My Uzbekistan": landmarks in 3D, the map, the dasturxon and patterns.
              ...[
                '/worlds/uzbekistan',
                '/worlds/uzbekistan/:section',
                '/worlds/uzbekistan/:section/:item',
              ].map((path) => ({
                path,
                lazy: async () => ({
                  Component: (await import('@/features/worlds/uzbekistan/UzbekistanPage'))
                    .UzbekistanPage,
                }),
              })),
              // The connected world (Phase 14): the rocket and Mars, the Practice
              // (Mistake) Garden, and the Science Lab the Mars flower opens.
              {
                path: '/spaceport',
                lazy: async () => ({
                  Component: (await import('@/features/spaceport/SpaceportPage')).SpaceportPage,
                }),
              },
              {
                path: '/spaceport/mars',
                lazy: async () => ({
                  Component: (await import('@/features/spaceport/MarsPage')).MarsPage,
                }),
              },
              {
                path: '/mistake-garden',
                lazy: async () => ({
                  Component: (await import('@/features/mistakeGarden/MistakeGardenPage'))
                    .MistakeGardenPage,
                }),
              },
              {
                path: '/science-lab',
                lazy: async () => ({
                  Component: (await import('@/features/scienceLab/ScienceLabPage')).ScienceLabPage,
                }),
              },
              // Phase 62: every game and practice, by subject
              {
                path: '/games',
                lazy: async () => ({
                  Component: (await import('@/features/games/GamesPage')).GamesPage,
                }),
              },
              // Phase 59: the three short science games (the attention helper offers them too)
              {
                path: '/sci/:id',
                lazy: async () => ({
                  Component: (await import('@/features/sciGames/SciGamePage')).SciGamePage,
                }),
              },
              // Phase 60: the cartoons
              {
                path: '/shorts',
                lazy: async () => ({
                  Component: (await import('@/features/shorts/ShortsPage')).ShortsPage,
                }),
              },
              {
                path: '/collection',
                lazy: async () => ({
                  Component: (await import('@/features/collection/CollectionPage')).CollectionPage,
                }),
              },
              // no daily limit since Phase 75: an old link to the rest screen goes home
              { path: '/rest', element: <Navigate to="/home" replace /> },
            ],
          },
        ],
      },
      {
        path: '/parent',
        element: <RequireParentGate />,
        errorElement: <RouteErrorScreen />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          {
            path: 'login',
            lazy: async () => ({
              Component: (await import('@/features/parent/login/ParentLoginPage')).ParentLoginPage,
            }),
          },
          {
            // back from Google or the e-mail sign-in link (Phase 44)
            path: 'auth',
            lazy: async () => ({
              Component: (await import('@/features/parent/login/AuthReturnPage')).AuthReturnPage,
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
              // Phase 49: a printable A4 sheet (the browser's print dialog also saves a PDF)
              {
                path: 'print/:sheet',
                lazy: async () => ({
                  Component: (await import('@/features/worksheets/PrintSheetPage')).PrintSheetPage,
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
      // Developers only (never in a production build): the 3D mascot inspection lab.
      ...(MASCOT_LAB
        ? [
            {
              path: '/dev/mascots',
              lazy: async () => ({
                Component: (await import('@/features/mascot/lab/MascotLab')).MascotLab,
              }),
            },
          ]
        : []),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
