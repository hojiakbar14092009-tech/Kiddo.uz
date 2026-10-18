#!/usr/bin/env bash
# Mixes one language's voice-over with the music bed and muxes it onto the silent video.
# mix.sh <lang> <silent.mp4> <music.wav> <voice-dir> <out.mp4>
# The voice dir holds <lang>0.wav … <lang>6.wav, one line per scene, silence trimmed.
set -euo pipefail
lang=$1 video=$2 music=$3 vo=$4 out=$5

# where each line starts (s): "Meet Kiddo" with the title, then just after each scene's wipe
starts=(1.35 4.75 9.15 13.55 17.95 22.35 26.75)
# speed per line (Uzbek line 4 runs long)
tempo=(1 1 1 1 1 1 1)
if [ "$lang" = uz ]; then tempo=(1 1.03 1 1 1.08 1 1); fi

inputs=(-i "$video" -i "$music")
filters=""
labels=""
for i in 0 1 2 3 4 5 6; do
  inputs+=(-i "$vo/${lang}${i}.wav")
  n=$((i + 2))
  ms=$(python3 -c "print(int(${starts[$i]}*1000))")
  filters+="[$n:a]aresample=48000,atempo=${tempo[$i]},highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,loudnorm=I=-15:TP=-2:LRA=7,aresample=48000,adelay=${ms}|${ms},apad=whole_dur=30[v$i];"
  labels+="[v$i]"
done
filters+="${labels}amix=inputs=7:normalize=0:duration=longest,atrim=0:30,aformat=channel_layouts=stereo,asplit=2[vo][key];"
filters+="[1:a]aresample=48000,volume=0.62[mus];"
filters+="[mus][key]sidechaincompress=threshold=0.04:ratio=5:attack=25:release=350:makeup=1[duck];"
filters+="[duck][vo]amix=inputs=2:normalize=0,alimiter=limit=0.89:attack=4:release=60,loudnorm=I=-14:TP=-1.2:LRA=9,aresample=48000[a]"

ffmpeg -nostdin -v error -y "${inputs[@]}" -filter_complex "$filters" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -t 30 -movflags +faststart "$out"
echo "mixed $out"
