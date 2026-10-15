"""Curva do enquadramento ("head_track" do edit.json), medida nas máscaras e nos quadros tratados.

uso: python3 head_track.py <plates_dir> <saida.json> [alvo_topo=440] [topo_min=425] [barba_max=1453]

A câmera desloca o quadro (sobre o teto sintetizado) para o topo da cabeça ficar em y≈alvo_topo na saída,
o que abre a faixa de títulos acima da cabeça. Duas restrições por quadro:
  - topo da cabeça ≥ topo_min (os títulos terminam em y≈415);
  - borda inferior da barba ≤ barba_max (a caixa da legenda, de uma linha, começa em y≈1463).
Quando ele abaixa o queixo, a câmera sobe o quadro só o necessário; se as duas não cabem, divide a diferença.
A saída é o "topo efetivo" por quadro da fonte (y0 = topo_efetivo − alvo_topo, escala 1).
"""
import sys, glob, json
import numpy as np, cv2
from scipy.ndimage import median_filter, gaussian_filter1d, maximum_filter1d, binary_opening, label

P, OUT = sys.argv[1], sys.argv[2]
TARGET, HEAD_MIN, BEARD_MAX = [float(a) for a in (sys.argv[3:6] + ["440", "425", "1453"][len(sys.argv[3:6]):])]
fs = sorted(glob.glob(P + "/alpha/*.png"))
top, cx = [], []
for p in fs:
    a = cv2.imread(p, 0) > 128
    rows = np.where(a.sum(1) > 12)[0]
    t = rows[0] if len(rows) else (top[-1] if top else 300); top.append(t)
    cols = np.where(a[t:t + 200].any(0))[0]; cx.append(int(cols.mean()) if len(cols) else 540)
top_s = gaussian_filter1d(median_filter(np.array(top, float), 7, mode="nearest"), 9, mode="nearest")

def beard(k):
    """borda inferior da barba no centro do queixo: pixels claros pouco saturados, componente mais densa"""
    im = cv2.imread(fs[k].replace("/alpha/", "/rgb/")); a = cv2.imread(fs[k], 0) > 128
    h = cv2.cvtColor(cv2.GaussianBlur(im, (5, 5), 0), cv2.COLOR_BGR2HSV).astype(int)
    m = (h[..., 1] < 72) & (h[..., 2] > 105) & a
    t = int(top_s[k]); y0, y1, x0, x1 = t + 700, min(1920, t + 1130), max(0, cx[k] - 85), min(1080, cx[k] + 85)
    sub = binary_opening(m[y0:y1, x0:x1], np.ones((5, 5)))
    seed = int(np.argmax(np.convolve(sub.sum(1), np.ones(30), "same")))
    lab, _ = label(sub); band = lab[max(0, seed - 15):seed + 15]
    ids, cnt = np.unique(band[band > 0], return_counts=True)
    if len(ids) == 0: return np.nan
    comp = lab == ids[np.argmax(cnt)]
    cols = np.where(comp.any(0))[0]
    return float(np.percentile([np.where(comp[:, c])[0].max() for c in cols], 90)) + y0
B = np.array([beard(k) for k in range(len(fs))])
d = B - top_s
bad = np.isnan(d) | (d > 1035)            # mão na frente do queixo / gola confundida com barba
idx = np.arange(len(B)); B[bad] = np.interp(idx[bad], idx[~bad], B[~bad])

lo = maximum_filter1d(B, 17) - BEARD_MAX          # y0 mínimo para a barba ficar acima da legenda
hi = top_s - HEAD_MIN                               # y0 máximo para a cabeça ficar abaixo dos títulos
y0 = np.clip(top_s - TARGET, lo, None)
y0 = np.where(lo > hi, (lo + hi) / 2, np.minimum(y0, hi))
y0 = gaussian_filter1d(y0, 4, mode="nearest")
json.dump([round(float(v + TARGET), 1) for v in y0], open(OUT, "w"))
head = top_s - y0; brd = B - y0
print(f"quadros {len(fs)} | barba substituída por interpolação em {int(bad.sum())} | quadros erguidos {int(np.sum(lo > top_s - TARGET))}")
print(f"topo da cabeça na saída: mín {head.min():.1f} | barba na saída: máx {brd.max():.1f} | y0 {y0.min():.1f}..{y0.max():.1f} | passo máx {np.abs(np.diff(y0)).max():.2f} px/quadro")
