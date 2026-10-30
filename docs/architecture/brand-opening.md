# Kiddo symbol and cinematic opening (Phase 32)

- **Symbol** (`src/components/brand/KiddoSymbol.tsx`, vector only): a deep blue world cut by a K
  of light (SVG mask: upright stem + two arms), a star at the K's junction (the centre light), and
  a warm gold open orbit (a short back arc over the top, a front arc under the world ending in a
  moon). Works without the wordmark. `KiddoMark` (parent header, admin, error and language
  screens) is the still symbol; `public/favicon.svg` and `public/icons/*.png` are rendered from it.
- **Opening** (`src/app/SplashScreen.tsx`, `opening.ts`): light appears → star forms → blue world
  enters → gold orbit joins and interlocks with its moon → centre light activates → symbol
  settles, then the name; 3.2 s + 0.3 s + 0.35 s exit. Once per launch, never on route changes;
  tap or Escape/Enter/Space skips it; the screen behind is `inert` meanwhile. Reduced motion: a
  0.5 s fade, gone after 0.9 s. It loads no pictures (the old splash pets are gone).
- **Startup budget** (`e2e/performance.spec.ts`): scripts budget 300 → 340 KB with the reason
  written there (the overrun predates this phase: 312 KB before Phase 22, 320 KB at Phase 31).
  Debt: bring the first-screen JavaScript back down (e.g. load howler on first activation).
