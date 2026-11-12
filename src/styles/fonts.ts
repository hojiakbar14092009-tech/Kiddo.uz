// Self-hosted fonts: they work offline. The weight files carry each subset's unicode-range
// (Latin, Latin Extended, Cyrillic, …), so a page downloads only the subsets its text uses.
// The per-subset files (e.g. `latin-700.css`) have no unicode-range: with them every subset
// was downloaded on every page (MVP stage 1: 12 font files on an Uzbek page instead of 3).
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/rubik/500.css'
import '@fontsource/rubik/700.css'
import '@fontsource/rubik/800.css'
