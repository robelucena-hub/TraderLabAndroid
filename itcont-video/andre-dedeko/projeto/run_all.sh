#!/usr/bin/env bash
# Reproduz a edição do vídeo do André Dedeko para o ITCONT.
# uso: ./run_all.sh <video_original.mp4> <pasta_de_trabalho>
# Requisitos: ffmpeg, Python 3 (numpy, opencv-python-headless, onnxruntime, scipy, soundfile), Node 18+ com Playwright.
# Modelo (GitHub releases): RobustVideoMatting rvm_resnet50_fp32.onnx (github.com/PeterL1n/RobustVideoMatting)
#   -> <pasta_de_trabalho>/models/rvm_resnet50_fp32.onnx
set -euo pipefail
SRC="$(realpath "$1")"; WORK="$(realpath -m "$2")"; HERE="$(cd "$(dirname "$0")" && pwd)"
# O original é um vídeo do WhatsApp (576 × 1024, taxa de quadros variável):
# 30 fps constantes, redução leve de ruído, ampliação Lanczos para 1080 × 1920, nitidez suave e correção de cor.
GRADE="fps=30,hqdn3d=1.2:1.0:3:3,scale=1080:1920:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709,format=rgb24,unsharp=5:5:0.45:5:5:0,eq=contrast=1.03:saturation=1.02:gamma=1.03,colorbalance=rm=-0.015:bm=0.02:rh=-0.02:bh=0.02"
mkdir -p "$WORK/build"

# 1) tratamento de cor + ampliação + máscara do apresentador
[ -d "$WORK/plates/alpha" ] || GRADE="$GRADE" python3 "$HERE/matte.py" "$SRC" "$WORK/models/rvm_resnet50_fp32.onnx" "$WORK/plates"

# 2) linha do tempo, áudio (voz original tratada + trilha + efeitos), gráficos e composição
python3 "$HERE/build_timeline.py" "$WORK/build"
python3 "$HERE/audio.py" "$SRC" "$WORK/build"
node "$HERE/render_graphics.mjs" "$WORK/build/timeline.json" "$WORK/build/gfx" 3
AUDIO="$WORK/build/mix_final.wav" \
  python3 "$HERE/composite.py" "$WORK/build/timeline.json" "$WORK/plates" "$WORK/build/gfx" "$WORK/ITCONT_AndreDedeko_1080x1920.mp4"
