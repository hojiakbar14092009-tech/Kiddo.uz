# World Card Evolution (Phase 28)

Each world's card on the Adventure Map grows with what the child has done in that world.

- **Stages** (`src/domain/universe/worldStage.ts`, deterministic): _new world_ (no stars yet), _explorer_ (a first
  star), _expert_ (half of the world's stars), _world master_ (every activity of the world with three stars). Only the
  best stars of the world's own activities count; stars are never spent, so a stage does not drop — except when a
  later release adds an activity to a world, until that one is played too.
- **The card** (`WorldStop`): its frame, a stage chip, a medal (expert) or crown (master) on the world's picture, the
  stars earned in this world and the stars to the next stage (unlocked worlds only).
- **New stage**: a card whose stage rose since the child last opened the map shows "New stage!" once, with a small
  pop (none with reduced motion); screen readers hear one sentence for all new stages. The stages already shown are
  kept per child in `ChildProgress.worldStages` (only raised).
