#!/bin/sh
# Renders every cartoon (6 × uz/ru/en) and makes the app's web copies and posters.
#   REMOTION_BROWSER=<headless shell> sh marketing/shorts/render.sh
set -e
cd "$(dirname "$0")"
APP=../../public/video/shorts
mkdir -p out "$APP/posters" "$APP/uz" "$APP/ru" "$APP/en"
for short in ${SHORTS:-water magnet float dayNight planets seed scale robot train shop shapes habitats plate}; do
  for lang in uz ru en; do
    npx remotion render "$short-$lang" "out/$short-$lang.mp4" --crf=18 --log=error
    # the web copy: 720 × 1280 H.264, AAC, starts playing before it is fully loaded
    ffmpeg -loglevel error -y -i "out/$short-$lang.mp4" -c:v libx264 -preset slow -crf 27 \
      -profile:v high -pix_fmt yuv420p -c:a aac -b:a 96k -ac 1 -movflags +faststart \
      "$APP/$lang/$short.mp4"
    echo "$short-$lang done"
  done
  # the poster: the opening scene with the robot, no words (one for every language)
  npx remotion still "poster-$short" "out/$short-poster.png" --frame=59 --log=error
  ffmpeg -loglevel error -y -i "out/$short-poster.png" -vf scale=480:-2 -c:v libwebp -quality 78 \
    "$APP/posters/$short.webp"
done
