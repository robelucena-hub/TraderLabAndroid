"""Remove a marca d'água "clideo.com" (estática, canto inferior direito) dos quadros tratados.

1) máscara: mediana temporal da região + realce morfológico do contorno escuro e do miolo claro do texto;
2) cada quadro: LaMa (ONNX, entrada fixa 512 x 512) numa janela 512 x 512 do canto, só os pixels da máscara
   são substituídos (borda suavizada);
3) suavização temporal (mediana de 5 quadros) dentro da máscara, contra cintilação.
uso: python3 wm_clean.py <fill|merge> <plates_dir> <lama.onnx> <saida_dir> [quadro_ini quadro_fim] [threads]
   fill : roda o LaMa e grava cada preenchimento (512 x 512) em <saida_dir>/fill/ (retomável: pula os já feitos)
   merge: mediana temporal dentro da máscara e grava os quadros limpos em <saida_dir>/
"""
import sys, os, glob
import numpy as np, cv2, onnxruntime as ort
stage, plates, model, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
fa = int(sys.argv[5]) if len(sys.argv) > 5 else 0
fb = int(sys.argv[6]) if len(sys.argv) > 6 else len(glob.glob(f"{plates}/rgb/*.png")) - 1
thr = int(sys.argv[7]) if len(sys.argv) > 7 else 4
os.makedirs(f"{out}/fill", exist_ok=True)
WX, WY = 568, 1408                         # janela 512 x 512 (canto inferior direito)
ry0, ry1, rx0, rx1 = 1780, 1920, 700, 1080 # região de análise
# ---- 1) máscara ----
fs = sorted(glob.glob(f"{plates}/rgb/*.png"))[::6]
med = np.median(np.stack([cv2.imread(f)[ry0:ry1, rx0:rx1].astype(np.float32) for f in fs]), 0)
g = cv2.cvtColor(med.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
k = np.ones((15, 15), np.uint8)
dark = cv2.morphologyEx(g, cv2.MORPH_CLOSE, k) - g; bright = g - cv2.morphologyEx(g, cv2.MORPH_OPEN, k)
m = ((dark > 12) | (bright > 12)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
keep = np.zeros_like(m)
for i in range(1, n):                       # só componentes na faixa do texto
    x, y, w, h, a = st[i]
    if a >= 8 and 40 <= y and y + h <= 130 and 60 <= x: keep[lab == i] = 1
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
keep = cv2.dilate(keep, np.ones((9, 9), np.uint8))
full = np.zeros((1920, 1080), np.uint8); full[ry0:ry1, rx0:rx1] = keep
if not os.path.exists(f"{out}/_mask.png"): cv2.imwrite(f"{out}/_mask.png", full * 255)
full = (cv2.imread(f"{out}/_mask.png", 0) > 127).astype(np.uint8)   # todos os processos usam a mesma máscara
ys, xs = np.where(full); print("máscara bbox x", xs.min(), xs.max(), "y", ys.min(), ys.max(), "px", int(full.sum()))
hole = full[WY:WY + 512, WX:WX + 512].astype(np.float32)
soft = cv2.GaussianBlur(cv2.dilate(full, np.ones((5, 5), np.uint8)).astype(np.float32), (0, 0), 2.0)[..., None]
# ---- 2) LaMa por quadro (grava cada preenchimento) ----
if stage == "fill":
    so = ort.SessionOptions(); so.intra_op_num_threads = thr; so.log_severity_level = 3
    sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
    for f in range(fa, fb + 1):
        dst = f"{out}/fill/{f:05d}.png"
        if os.path.exists(dst): continue
        im = cv2.imread(f"{plates}/rgb/{f:05d}.png")
        win = cv2.cvtColor(im[WY:WY + 512, WX:WX + 512], cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        o = sess.run(None, {"image": win.transpose(2, 0, 1)[None], "mask": hole[None, None]})[0][0].transpose(1, 2, 0)
        cv2.imwrite(dst + ".tmp.png", cv2.cvtColor(np.clip(o, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)); os.replace(dst + ".tmp.png", dst)
        if (f - fa) % 25 == 0: print("lama", f, flush=True)
    print("fill ok", fa, fb)
# ---- 3) mediana temporal na máscara e gravação ----
if stage == "merge":
    rd = lambda j: cv2.imread(f"{out}/fill/{j:05d}.png").astype(np.float32)
    for f in range(fa, fb + 1):
        im = cv2.imread(f"{plates}/rgb/{f:05d}.png").astype(np.float32)
        fill = np.median(np.stack([rd(j) for j in range(max(fa, f - 2), min(fb, f + 2) + 1)]), 0)
        reg = im[WY:WY + 512, WX:WX + 512]; sm = soft[WY:WY + 512, WX:WX + 512]
        im[WY:WY + 512, WX:WX + 512] = reg * (1 - sm) + fill * sm
        cv2.imwrite(f"{out}/{f:05d}.png", np.clip(im + 0.5, 0, 255).astype(np.uint8), [cv2.IMWRITE_PNG_COMPRESSION, 1])
    print("merge ok", fb - fa + 1)
