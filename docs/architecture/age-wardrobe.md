# Age-evolving avatar, wardrobe and character maturity (Phase 31)

- **One age policy.** `CHARACTER_STYLES` in `src/domain/adaptive/ageProfile.ts` has three stages
  (young: toy/garden bands, middle: workbook, older: calm/grown), chosen by `characterStyle(age)`
  from the real age only (`useCharacterStyle()` for the active child). A strong young learner keeps
  the young robot; an older beginner never gets the preschool one. Guests are young.
- **Character maturity without new models.** One robot (2D `Robot.tsx`, 3D KidoBot) and per-stage
  variants: breathing and head sway get smaller, the playful head tilt straightens, the arms rest
  closer to the body, jumps and hops get smaller (2D `bodyActions`), the 3D idle loop slows
  (`idleTempo`) and spontaneous gestures come less often (`idleCalm`); small celebrations become an
  encouraging gesture (`reactions.ts composed`, big moments stay). Proportions change only gently:
  the head sits a little smaller on the body (`headScale` 1 / 0.95 / 0.9). The robot is never
  made taller.
- **Wardrobe.** 18 items in 10 categories (casual, sport, science, space, explorer, creative,
  traditional — the doppi —, tech, smart, seasonal), `src/features/shop/outfits.ts`. No gender or
  age lock: the stage only orders the shelves (`wardrobe.ts`, its `featured` categories first, a
  "for you" shelf) and sets the colour tone (bright / rich / muted, `toneColor`), shared by the 2D
  and 3D drawings. Shop cards show the item itself on a robot bust (`OutfitPreview`).
- **Server.** New prices in migration `0015_age_wardrobe.sql` (owner applies); `serverPrices.test.ts`
  checks 0009 + 0015 against the app.
- **Avatars.** `ChildAvatar` draws each child at their own stage.
