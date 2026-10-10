#!/usr/bin/env bash
# Reproduz a edição do vídeo do Matheus Neris para o ITCONT.
# uso: ./run_all.sh <video_original.mp4> <pasta_de_trabalho>
# Requisitos: ffmpeg, Python 3 (numpy, opencv-python-headless, onnxruntime, scipy, soundfile), Node 18+ com Playwright.
# Modelos (GitHub releases), em <pasta_de_trabalho>/models/:
#   - rvm_resnet50_fp32.onnx (github.com/PeterL1n/RobustVideoMatting)
#   - lama.onnx = inpainting_lama_2025jan.onnx (github.com/opencv/opencv_zoo, models/inpainting_lama)
set -euo pipefail
SRC="$(realpath "$1")"; WORK="$(realpath -m "$2")"; HERE="$(cd "$(dirname "$0")" && pwd)"
# O arquivo vem marcado como HLG/BT.2020, mas o sinal é BT.709: interpretado como BT.709 + correção leve
GRADE="setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv,scale=in_color_matrix=bt709:out_color_matrix=bt709,format=rgb24,eq=contrast=1.06:saturation=1.04:gamma=0.97,colorbalance=rm=-0.03:gm=-0.005:bm=0.035:rh=-0.03:bh=0.03,unsharp=5:5:0.35:5:5:0"
mkdir -p "$WORK/build"

# 1) tratamento de cor + máscara do apresentador
[ -d "$WORK/plates/alpha" ] || GRADE="$GRADE" python3 "$HERE/matte.py" "$SRC" "$WORK/models/rvm_resnet50_fp32.onnx" "$WORK/plates"

# 2) remoção da marca d'água "clideo.com" (LaMa, só os quadros usados: 42–1095)
python3 "$HERE/marca/wm_clean.py" fill  "$WORK/plates" "$WORK/models/lama.onnx" "$WORK/clean" 42 1095 4
python3 "$HERE/marca/wm_clean.py" merge "$WORK/plates" "$WORK/models/lama.onnx" "$WORK/clean" 42 1095 4

# 3) áudio: restauração da saturação (Janssen/LSAR) e tratamento leve da voz
ffmpeg -v error -y -i "$SRC" -vn -c:a pcm_f32le "$WORK/audio_orig.wav"
python3 "$HERE/restauro/run.py" "$WORK/audio_orig.wav" "$WORK/build/voice_declip.wav"

# 4) linha do tempo, mixagem, gráficos e composição
python3 "$HERE/build_timeline.py" "$WORK/build"
VOICE_FX="$(cat "$HERE/voice_fx.txt")" python3 "$HERE/audio.py" "$WORK/build/voice_declip.wav" "$WORK/build"
node "$HERE/render_graphics.mjs" "$WORK/build/timeline.json" "$WORK/build/gfx" 3
CLEAN="$WORK/clean" AUDIO="$WORK/build/mix_final.wav" \
  python3 "$HERE/composite.py" "$WORK/build/timeline.json" "$WORK/plates" "$WORK/build/gfx" "$WORK/ITCONT_MatheusNeris_1080x1920.mp4"
