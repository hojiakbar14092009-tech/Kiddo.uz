#!/bin/sh
# One of the first twelve cartoons, the new way: silent pictures, then the old narration back on.
#   sh marketing/shorts/render-one.sh magnet          (needs: python lipsync.py once, for out/old-audio and the mouths)
set -e
cd "$(dirname "$0")"
APP=../../public/video/shorts
short=$1
for lang in uz ru en; do
  npx remotion render "$short-$lang" "out/$short-$lang.mp4" --crf=18 --log=error
  ffmpeg -loglevel error -y -i "out/$short-$lang.mp4" -i "out/old-audio/$lang-$short.m4a" \
    -map 0:v -map 1:a -c:v libx264 -preset slow -crf 30 -profile:v high -pix_fmt yuv420p \
    -c:a copy -movflags +faststart -shortest "out/web-$short-$lang.mp4"
  echo "$short-$lang done"
done
# the poster: the opening, settled (one for every language)
npx remotion still "poster-$short" "out/$short-poster.png" --frame=59 --log=error
ffmpeg -loglevel error -y -i "out/$short-poster.png" -vf scale=480:-2 -c:v libwebp -quality 78 "out/poster-$short.webp"
