# The child's four sections (Phase 40)

The child's app is four sections, one tab each, in a bar at the bottom of the
section pages (`features/hubs/ChildTabBar`). The parent area stays apart,
behind its gate (the small link at the end of Bugun).

| Tab           | Page        | What is there                                                                         |
| ------------- | ----------- | ------------------------------------------------------------------------------------- |
| Bugun         | `/home`     | greeting, homework, one big "Davom etish", today's 3 steps, the treasure, the journey |
| O‘rgan        | `/learn`    | extra practice quests, the learning places, the small games and the big test          |
| Kashf et      | `/explore`  | the Adventure Map and the worlds (dinosaurs, Uzbekistan, space, labs)                 |
| Mening dunyom | `/my-world` | Kiddo City with the treasures, the shop, the museum and the art studio                |

"Davom etish" leads to the next game of today's plan; when the plan is done it
leads to O‘rgan ("Yana o‘ynash"). Nothing is ever locked by the plan.

## Section worlds

Every child page belongs to one section (`features/hubs/sections.ts`,
`sectionOf`: the longest path prefix wins; the language page, onboarding, the
parent and admin areas have none). `app/SectionWorld` puts it on
`<html data-world>`, and `styles/index.css` gives each world a calm wash of
colour from the top and a faint motif over the age theme: a sunny morning
(Bugun), a mint notebook (O‘rgan), a starry sky (Kashf et), a warm evening
with hills (Mening dunyom). It is one fixed, static layer: cheap on weak
tablets, nothing to switch off for reduced motion; older learners (13+) get a
quieter one.
