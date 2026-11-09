#!/bin/sh
# The first twelve cartoons, two at a time; the web copies are put into the app only when all three
# languages of a cartoon are done (so a stopped run never leaves half a cartoon behind).
#   sh marketing/shorts/render-legacy.sh            (resumes: a cartoon with out/done-<id> is skipped)
cd "$(dirname "$0")"
APP=../../public/video/shorts
LIST=${SHORTS:-magnet float dayNight planets seed scale robot train shop shapes habitats plate}
mkdir -p out
for short in $LIST; do [ -f "out/done-$short" ] || echo "$short"; done |
  xargs -P 2 -I{} sh -c 'sh ./render-one.sh {} > out/log-{}.txt 2>&1 && for l in uz ru en; do cp out/web-{}-$l.mp4 ../../public/video/shorts/$l/{}.mp4; done && cp out/poster-{}.webp ../../public/video/shorts/posters/{}.webp && touch out/done-{} && echo "{} installed"'
