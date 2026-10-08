#!/usr/bin/env bash
# Reproduz a edição do vídeo da Anna Clara Silva para o ITCONT.
# uso: ./run_all.sh <video_original.mp4> <pasta_de_trabalho>
# Requisitos: ffmpeg, Python 3 (numpy, opencv-python-headless, onnxruntime, scipy, soundfile), Node 18+ com Playwright.
# Modelos (GitHub releases):
#   - RobustVideoMatting: rvm_resnet50_fp32.onnx (github.com/PeterL1n/RobustVideoMatting)
#   - MDX-Net: Kim_Vocal_2.onnx e UVR-MDX-NET-Voc_FT.onnx (github.com/TRvlvr/model_repo, release all_public_uvr_models)
#   - LaMa ONNX (opencv_zoo, inpainting_lama_2025jan.onnx) -> clean/models/lama/lama.onnx
set -euo pipefail
SRC="$(realpath "$1")"; WORK="$(realpath -m "$2")"; HERE="$(cd "$(dirname "$0")" && pwd)"
GRADE="scale=in_color_matrix=bt709:out_color_matrix=bt709,format=rgb24,eq=contrast=1.03:saturation=1.0:gamma=1.02,colorbalance=rs=-0.03:gs=0.0:bs=0.03:rm=-0.02:bm=0.02:rh=-0.02:bh=0.02,unsharp=5:5:0.25:5:5:0"
mkdir -p "$WORK"/{build,sep}
ln -sf "$SRC" "$WORK/src.mp4"

# 1) tratamento de cor + máscara da apresentadora
[ -d "$WORK/plates/alpha" ] || GRADE="$GRADE" python3 "$HERE/matte.py" "$SRC" "$WORK/models/rvm_resnet50_fp32.onnx" "$WORK/plates"

# 2) remoção das legendas queimadas e da assinatura (quadros 0–674)
python3 -I "$HERE/clean/clean_overlays.py" --src "$SRC" --work "$HERE/clean/work" --alpha-dir "$WORK/plates/alpha" --stage decode
python3 -I "$HERE/clean/clean_overlays.py" --src "$SRC" --work "$HERE/clean/work" --alpha-dir "$WORK/plates/alpha" --stage analyze
python3 -I "$HERE/clean/clean_fast.py" --out "$WORK/clean" --frames 0-674 --workers 3

# 3) voz isolada da trilha original (MDX-Net, dois modelos, média)
ffmpeg -v error -y -i "$SRC" -vn -c:a pcm_s24le "$WORK/sep/audio_orig.wav"
python3 -I "$HERE/sep/sep.py" run "$WORK/models/Kim_Vocal_2.onnx" 7680 1.009 "$WORK/sep/kim.npy" --overlap 0.75 --denoise --in "$WORK/sep/audio_orig.wav"
python3 -I "$HERE/sep/sep.py" run "$WORK/models/UVR-MDX-NET-Voc_FT.onnx" 7680 1.021 "$WORK/sep/vft.npy" --overlap 0.75 --denoise --in "$WORK/sep/audio_orig.wav"
python3 -I "$HERE/sep/sep.py" final "$WORK/sep" "$WORK/sep/kim.npy" "$WORK/sep/vft.npy"

# 4) linha do tempo, áudio, gráficos e composição
python3 "$HERE/build_timeline.py" "$WORK/build"
VOICE_FX="highpass=f=75,equalizer=f=300:t=q:w=1.1:g=-2,equalizer=f=3400:t=q:w=1.0:g=2,acompressor=threshold=-24dB:ratio=2.5:attack=6:release=140:makeup=2,deesser=i=0.2" \
  python3 "$HERE/audio.py" "$WORK/sep/vocals_48k.wav" "$WORK/build"
node "$HERE/render_graphics.mjs" "$WORK/build/timeline.json" "$WORK/build/gfx" 3
CLEAN="$WORK/clean/rgb" AUDIO="$WORK/build/mix_final.wav" \
  python3 "$HERE/composite.py" "$WORK/build/timeline.json" "$WORK/plates" "$WORK/build/gfx" "$WORK/ITCONT_AnnaClara_1080x1920.mp4"
