#!/bin/sh
# One dialogue story (water or a new lesson): render, web copy (<= 3 MB), poster, installed into the app.
#   npx remotion bundle --out-dir=out/bundle   (once; sources must not change meanwhile)
#   sh marketing/shorts/render-story.sh crossing
set -e
cd "$(dirname "$0")"
APP=../../public/video/shorts
id=$1
npx remotion render out/bundle "$id-uz" "out/$id.mp4" --crf=18 --log=error
for crf in 31 33 35; do
  ffmpeg -loglevel error -y -i "out/$id.mp4" -c:v libx264 -preset slow -crf $crf -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 80k -ac 1 -movflags +faststart "out/web-$id.mp4"
  [ "$(wc -c < "out/web-$id.mp4")" -le 3000000 ] && break
done
npx remotion still out/bundle "poster-$id" "out/$id-poster.png" --frame=59 --log=error
ffmpeg -loglevel error -y -i "out/$id-poster.png" -vf scale=480:-2 -c:v libwebp -quality 78 "$APP/posters/$id.webp"
cp "out/web-$id.mp4" "$APP/uz/$id.mp4"
echo "$id installed"
