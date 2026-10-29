# Interactive onboarding (Phase 25)

- First visit: choose a language → `/welcome`, a five-step tour with KidoBot (`features/onboarding/WelcomePage.tsx`),
  then home (or "who is playing?" when the family has profiles).
- Each step has one big target to try, answered at once: wave to KidoBot, collect a coin (a picture only, nothing
  is paid), press the speaker (it speaks where voice is allowed), light the help bulb, meet the grown-ups' area.
  "Next" is never locked; "Skip" is always there.
- Saved: only `settingsStore.onboarded` (per device; settings v2). A device already in use before Phase 25 (a
  language saved) skips the tour. Later language choices go straight on. Parents can show the tour again
  (Parent → Settings → "Show the tour again"): the grown-ups' area closes first, so Back never reopens it.
- Without the voice (a Free account outside the demo) the speaker step says so honestly ("a grown-up can turn
  the voice on") instead of claiming the child heard it.
- Accessible: a heading per step that takes focus on change, step dots with a label, ≥ 44 px buttons, live
  feedback text, reduced motion honoured (the robot and the coin hold still), fits 320 px and a phone held sideways. The robot is the child's own (the boy's for a guest).
- Tests: `features/onboarding/WelcomePage.test.tsx`, `e2e/onboarding.spec.ts`. Other e2e specs start with the tour
  seen (`e2e/state/onboarded.json`, Playwright `storageState`).
