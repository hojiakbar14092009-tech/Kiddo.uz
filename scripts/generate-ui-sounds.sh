#!/usr/bin/env bash
# Synthesises Kiddo's interface sounds with ffmpeg, so no third-party audio is needed.
#   ui_click   – soft wooden "tok" for every tap (Free and PRO)
#   ui_success – two bright rising notes for a right answer
#   ui_soft    – gentle low "boop" for a wrong answer (never harsh)
set -euo pipefail

OUT="$(dirname "$0")/../public/audio/ui"
mkdir -p "$OUT"

synth() {
  local name="$1" duration="$2" expr="$3"
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "aevalsrc='${expr}':s=44100:d=${duration}" \
    -af "afade=t=out:st=$(awk "BEGIN{printf \"%.3f\", $duration - 0.01}"):d=0.01" \
    -ac 1 -codec:a libmp3lame -b:a 64k "$OUT/${name}.mp3"
}

# Wood block: a short damped partial pair plus a tiny noise transient.
synth ui_click 0.09 \
  "0.55*sin(2*PI*1750*t)*exp(-t*85)+0.25*sin(2*PI*2900*t)*exp(-t*140)+0.18*(random(0)-0.5)*exp(-t*420)"

# Chime: C6 then G6 with a soft bell-like decay.
synth ui_success 0.42 \
  "0.42*sin(2*PI*1046.5*t)*exp(-t*9)*lt(t,0.14)+0.42*sin(2*PI*1568*(t-0.12))*exp(-(t-0.12)*7)*gte(t,0.12)"

# Boop: a low sine sliding gently downwards.
synth ui_soft 0.28 \
  "0.4*sin(2*PI*(330-160*t)*t)*exp(-t*9)"

echo "UI sounds written to $OUT"
