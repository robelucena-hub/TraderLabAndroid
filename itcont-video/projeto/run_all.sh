#!/usr/bin/env bash
# Reproduz a edição completa do vídeo-convite ITCONT.
# Requisitos: ffmpeg (com zimg), Python 3.10+ (numpy, opencv-python-headless, onnxruntime, scipy, soundfile, sherpa-onnx*),
#             Node 18+ com Playwright (Chromium).  *sherpa-onnx só para a transcrição/QC.
# uso: ./run_all.sh <video_original> <pasta_modelos> <pasta_de_trabalho>
set -euo pipefail
SRC="$1"; MODELS="$2"; WORK="$3"; HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$WORK/build"
# 1) tratamento de cor + máscara do apresentador (RobustVideoMatting resnet50)
[ -d "$WORK/plates/alpha" ] || python3 "$HERE/matte.py" "$SRC" "$MODELS/rvm_resnet50_fp32.onnx" "$WORK/plates"
# 2) linha do tempo (EDL, legendas .srt, câmera, deixas)
python3 "$HERE/build_timeline.py" "$WORK/build"
# 3) áudio (voz tratada + trilha original sintetizada + efeitos)
python3 "$HERE/audio.py" "$SRC" "$WORK/build"
# 4) camadas gráficas
node "$HERE/render_graphics.mjs" "$WORK/build/timeline.json" "$WORK/build/gfx" 3
# 5) composição + codificação final (H.264 1080x1920 30 fps + AAC)
AUDIO="$WORK/build/mix_final.wav" python3 "$HERE/composite.py" "$WORK/build/timeline.json" "$WORK/plates" "$WORK/build/gfx" "$WORK/ITCONT_convite_1080x1920.mp4"
