#!/usr/bin/env bash
# Reproduz a edição do vídeo do Angelo Loula para o ITCONT.
# uso: ./run_all.sh <video_original.mp4> <pasta_de_trabalho>
# Requisitos: ffmpeg, Python 3 (numpy, opencv-python-headless, onnxruntime, scipy, soundfile), Node 18+ com Playwright.
# Modelo (GitHub releases), em <pasta_de_trabalho>/models/: rvm_resnet50_fp32.onnx (github.com/PeterL1n/RobustVideoMatting)
set -euo pipefail
SRC="$(realpath "$1")"; WORK="$(realpath -m "$2")"; HERE="$(cd "$(dirname "$0")" && pwd)"
# original 478x850 a 29,5 qps: 30 qps, redução leve de ruído, ampliação Lanczos para 1080x1920, nitidez e cor levemente mais fria
GRADE="fps=30,hqdn3d=1.2:1.0:3:3,scale=1080:1920:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709,format=rgb24,unsharp=5:5:0.45:5:5:0,eq=contrast=1.04:saturation=1.0:gamma=1.0,colorbalance=rm=-0.02:bm=0.02:rh=-0.02:bh=0.02"
mkdir -p "$WORK/build"

# 1) tratamento de cor + máscara do apresentador
if [ ! -d "$WORK/plates/alpha" ]; then
  GRADE="$GRADE" python3 "$HERE/matte.py" "$SRC" "$WORK/models/rvm_resnet50_fp32.onnx" "$WORK/plates"
  # a conversão 29,5 → 30 qps repete um quadro a cada ~58: troca cada repetição por um quadro interpolado
  python3 "$HERE/dedup.py" "$WORK/plates"
fi

# 2) (opcional) recalcula a curva de enquadramento (cabeça abaixo dos títulos, barba acima da legenda) e o edit.json.
#    O edit.json entregue já contém a curva.
# python3 "$HERE/head_track.py" "$WORK/plates" "$WORK/head_top.json" && python3 "$HERE/mk_edit.py" "$HERE/edit.json" "$WORK/head_top.json"

# 3) linha do tempo, áudio, gráficos e composição
python3 "$HERE/build_timeline.py" "$WORK/build"
VOICE_FX="$(cat "$HERE/voice_fx.txt")" python3 "$HERE/audio.py" "$SRC" "$WORK/build"
node "$HERE/render_graphics.mjs" "$WORK/build/timeline.json" "$WORK/build/gfx" 3
AUDIO="$WORK/build/mix_final.wav" \
  python3 "$HERE/composite.py" "$WORK/build/timeline.json" "$WORK/plates" "$WORK/build/gfx" "$WORK/ITCONT_AngeloLoula_1080x1920.mp4"
