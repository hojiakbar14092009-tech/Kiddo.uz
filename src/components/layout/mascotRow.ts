/*
 * The mascot + instruction row of a game on a narrow phone (320–479 px): the
 * robot is smaller and the buttons beside it stack, so the bubble keeps room
 * for its words and never slides under the buttons (as LearnShell and Math
 * Lab already do). On a phone the robot is sized in px: it is a picture and
 * does not grow with large system text, so the words keep the room. Full
 * literal class names, so Tailwind finds them.
 */
export const MASCOT_ROW = {
  robot: 'w-[56px] min-[480px]:w-20 sm:w-32',
  actions:
    'ml-auto flex shrink-0 flex-col items-center gap-2 min-[480px]:flex-row min-[480px]:gap-3',
} as const
