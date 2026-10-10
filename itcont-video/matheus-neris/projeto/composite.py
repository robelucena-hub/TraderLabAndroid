"""Composição final: vídeo tratado + máscara (RVM) + camadas gráficas (atrás/à frente do apresentador).

uso: python3 composite.py <timeline.json> <plates_dir> <gfx_dir> <saida.mp4 | pasta_preview> [quadros]
   - plates_dir: rgb/NNNNN.png (quadros com tratamento de cor), alpha/NNNNN.png (máscara)
   - gfx_dir: g_NNNNN.png (1080x3840: metade de cima = camada de trás, de baixo = frente)
"""
import sys, os, json, subprocess
import numpy as np, cv2
from multiprocessing import Pool
cv2.setNumThreads(1)  # cada processo do Pool usa 1 thread (evita sobrecarga)

TL, PLATES, GFX, OUT = sys.argv[1:5]
FRAMES_ARG = sys.argv[5] if len(sys.argv) > 5 else None
T = json.load(open(TL))
W, H, EXT = 1080, 1920, T["ext"]
LAST_SRC = max(f for f in T["src_frames"] if f >= 0)
CLEAN = os.environ.get("CLEAN")   # quadros com legendas/assinatura removidas (opcional)

def wall_estimate(rgb, a):
    """Cor da parede atrás de cada pixel (convolução normalizada só com pixels de fundo)."""
    m = (a < 0.02).astype(np.float32)
    small = cv2.resize(rgb * m[..., None], (135, 240), interpolation=cv2.INTER_AREA)
    ms = cv2.resize(m, (135, 240), interpolation=cv2.INTER_AREA)
    out, filled = None, None
    for k in (3, 8, 20):
        num = cv2.GaussianBlur(small, (0, 0), k); den = cv2.GaussianBlur(ms, (0, 0), k)
        est = num / np.maximum(den[..., None], 1e-4)
        if out is None: out, filled = est, den > 0.05
        else: out = np.where(filled[..., None], out, est); filled |= den > 0.01
    return cv2.resize(out, (W, H), interpolation=cv2.INTER_CUBIC)

def extend_top(img, rows):
    if rows <= 0: return img
    """Sintetiza parede acima do quadro: perfil médio das primeiras linhas, suavizado, com leve granulação."""
    prof = img[:24].mean(0, keepdims=True)
    prof = cv2.GaussianBlur(prof, (0, 0), sigmaX=6, sigmaY=0.1)
    slope = (img[:24].mean(0) - img[60:120].mean(0)) / 78.0          # tendência vertical da parede
    slope = cv2.GaussianBlur(slope[None], (0, 0), sigmaX=30, sigmaY=0.1)[0]
    d = np.arange(rows, 0, -1, dtype=np.float32)[:, None, None]
    ext = prof + np.clip(slope[None], -0.08, 0.08) * 40 * (1 - np.exp(-d / 40))
    rng = np.random.default_rng(int(img[5, 5, 0] * 1000) % 2**31)
    ext = ext + rng.normal(0, 0.9, ext.shape).astype(np.float32)
    canvas = np.concatenate([ext, img], 0)
    if rows < 16: return canvas
    # costura suave
    s0, s1 = rows - 8, rows + 8
    canvas[s0:s1] = cv2.GaussianBlur(canvas[s0 - 6:s1 + 6], (0, 0), sigmaX=0.1, sigmaY=3)[6:-6]
    return canvas

def render(f):
    src = T["src_frames"][f]
    src = LAST_SRC if src < 0 else src
    sc, x0, y0 = T["cam_frames"][f]
    cp = f"{CLEAN}/{src:05d}.png" if CLEAN else None
    rgb = cv2.imread(cp if cp and os.path.exists(cp) else f"{PLATES}/rgb/{src:05d}.png").astype(np.float32)
    a0 = cv2.imread(f"{PLATES}/alpha/{src:05d}.png", 0).astype(np.float32) / 255.0
    B = wall_estimate(rgb, a0)
    # primeiro plano "descontaminado" (remove a cor da parede das bordas semitransparentes)
    F = np.clip((rgb - (1 - a0[..., None]) * B) / np.maximum(a0, 0.05)[..., None], 0, 255)
    wi = np.clip((a0 - 0.92) / 0.06, 0, 1)[..., None]
    F = rgb * wi + F * (1 - wi)
    # nas bordas, a cor vem do interior (cabelo/pele/camiseta) espalhado para fora: elimina halo da parede
    m_in = (a0 > 0.97).astype(np.float32)
    num = cv2.GaussianBlur(F * m_in[..., None], (0, 0), 4); den = cv2.GaussianBlur(m_in, (0, 0), 4)
    Fx = num / np.maximum(den[..., None], 1e-3)
    we = (np.clip(den / 0.15, 0, 1) * (1 - np.clip((a0 - 0.9) / 0.07, 0, 1)))[..., None]
    F = F * (1 - we) + Fx * we
    ac = np.clip((a0 - 0.28) / 0.62, 0, 1)                            # máscara "apertada" p/ troca de fundo
    # tela estendida para cima (parede sintetizada) e transformação de câmera
    rgbE = extend_top(rgb, EXT)
    FE = np.concatenate([rgbE[:EXT], F], 0)
    aE = np.concatenate([np.zeros((EXT, W), np.float32), a0], 0)
    acE = np.concatenate([np.zeros((EXT, W), np.float32), ac], 0)
    M = np.float32([[sc, 0, -sc * x0], [0, sc, -sc * (y0 + EXT)]])
    wrp = lambda im, it: cv2.warpAffine(im, M, (W, H), flags=it, borderMode=cv2.BORDER_REPLICATE)
    rgbW, FW = wrp(rgbE, cv2.INTER_CUBIC), wrp(FE, cv2.INTER_CUBIC)
    aW, acW = np.clip(wrp(aE, cv2.INTER_LINEAR), 0, 1), np.clip(wrp(acE, cv2.INTER_LINEAR), 0, 1)
    # camadas gráficas
    g = cv2.imread(f"{GFX}/g_{f:05d}.png", cv2.IMREAD_UNCHANGED).astype(np.float32)
    back, front = g[:H], g[H:]
    ga = back[..., 3:4] / 255.0
    au = (aW + (acW - aW) * ga[..., 0])[..., None]
    out = rgbW + ga * ((1 - au) * back[..., :3] + au * FW - rgbW)
    fa = front[..., 3:4] / 255.0
    out = out * (1 - fa) + front[..., :3] * fa
    return np.clip(out + 0.5, 0, 255).astype(np.uint8)

if __name__ == "__main__":
    frames = list(range(T["total_frames"]))
    if FRAMES_ARG:
        frames = [int(x) for x in FRAMES_ARG.split(",")] if "," in FRAMES_ARG or FRAMES_ARG.isdigit() else \
            list(range(int(FRAMES_ARG.split("-")[0]), int(FRAMES_ARG.split("-")[1]) + 1))
    if not OUT.endswith(".mp4"):
        os.makedirs(OUT, exist_ok=True)
        with Pool(4) as p:
            for f, im in zip(frames, p.imap(render, frames)):
                cv2.imwrite(f"{OUT}/c_{f:05d}.jpg", im, [cv2.IMWRITE_JPEG_QUALITY, 92])
        sys.exit(0)
    AUDIO = os.environ.get("AUDIO")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(T["fps"]), "-i", "-"]
    if AUDIO: cmd += ["-i", AUDIO]
    cmd += ["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-level", "4.2",
            "-x264-params", "keyint=60:min-keyint=30",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
    if AUDIO: cmd += ["-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest"]
    cmd += ["-movflags", "+faststart", OUT]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(4) as p:
        for i, im in enumerate(p.imap(render, frames, chunksize=2)):
            enc.stdin.write(im.tobytes())
            if i % 100 == 0: print("quadro", i, flush=True)
    enc.stdin.close(); enc.wait()
    print("ok", OUT)
