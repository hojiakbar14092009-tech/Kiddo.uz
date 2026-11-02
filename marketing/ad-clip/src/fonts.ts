import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

const RANGES = {
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext':
    'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
}

export const DISPLAY = 'KiddoRubik'
export const BODY = 'KiddoNunito'

export const fontsReady = Promise.all(
  (['rubik', 'nunito'] as const).flatMap((family) =>
    (['latin', 'latin-ext', 'cyrillic'] as const).flatMap((subset) =>
      (['700', '800'] as const).map((weight) =>
        loadFont({
          family: family === 'rubik' ? DISPLAY : BODY,
          url: staticFile(`fonts/${family}-${subset}-${weight}-normal.woff2`),
          weight,
          unicodeRange: RANGES[subset],
        }),
      ),
    ),
  ),
)
