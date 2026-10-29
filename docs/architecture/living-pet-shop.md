# Living pet shop (Phase 27)

The pets in the shop and at the robot's feet are alive and become the child's friends.

- **Friendship hearts** (`src/features/pets/bond.ts`, deterministic, no AI): the pet walking with the robot gains one
  day of friendship on each local day the child finishes any activity (`activity.completed` domain event, listened to
  app-wide by `PetBridge`). Five hearts, at 1, 3, 7, 14 and 30 days. A day counts once; skipped days take nothing
  away; nothing is paid or unlocked. A short toast says when a new heart fills.
- **Shop cards** (`PetsPanel`): an owned pet shows its hearts and how many days are left until the next one (read
  out in the card's label as well). Tapping any pet makes it answer: a surprised face, then a happy one, with its
  sound. The pet at the robot's feet (`PetCompanion`) answers a tap the same way.
- **Storage**: `ChildProgress.petBond` (optional; persist version unchanged). It stays on this device (not sent to
  the server, like the birthday gifts list); a guest's friendship starts over with the guest's progress.
