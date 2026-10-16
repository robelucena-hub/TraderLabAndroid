"""Quadros repetidos pela conversão 29,5 → 30 qps: substitui cada repetição por um quadro intermediário
interpolado por fluxo óptico (DIS) entre o anterior e o seguinte (imagem e máscara).
Se as duas imagens deformadas discordam demais (movimento rápido/oclusão: >0,8 % dos pixels com diferença >25),
a interpolação criaria rasgos; nesse caso o quadro repetido original é mantido.

uso: python3 dedup.py <plates_dir>   (os originais repetidos ficam em <plates_dir>/dup_orig/)
"""
import sys, os, glob, shutil
import numpy as np, cv2
P = sys.argv[1]
n = len(glob.glob(f"{P}/rgb/*.png"))
small = lambda k: cv2.imread(f"{P}/rgb/{k:05d}.png", 0)[::4, ::4].astype(np.float32)
diff = [0.0] + [float(np.abs(small(k) - small(k - 1)).mean()) for k in range(1, n)]
med = float(np.median(diff[1:]))
dups = [k for k in range(1, n - 1) if diff[k] < 0.25 * med]
print("mediana da diferença entre quadros", round(med, 3), "| repetidos:", dups)
os.makedirs(f"{P}/dup_orig", exist_ok=True)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
for k in dups:
    for sub in ("rgb", "alpha"):
        dst = f"{P}/dup_orig/{sub}_{k:05d}.png"
        if not os.path.exists(dst): shutil.copy(f"{P}/{sub}/{k:05d}.png", dst)
    A, C = cv2.imread(f"{P}/rgb/{k - 1:05d}.png"), cv2.imread(f"{P}/rgb/{k + 1:05d}.png")
    aA, aC = cv2.imread(f"{P}/alpha/{k - 1:05d}.png", 0), cv2.imread(f"{P}/alpha/{k + 1:05d}.png", 0)
    gA, gC = cv2.cvtColor(A, cv2.COLOR_BGR2GRAY), cv2.cvtColor(C, cv2.COLOR_BGR2GRAY)
    fAC, fCA = dis.calc(gA, gC, None), dis.calc(gC, gA, None)
    h, w = gA.shape; gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    def warp(im, f): return cv2.remap(im, gx - 0.5 * f[..., 0], gy - 0.5 * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wA, wC = warp(A, fAC).astype(np.float32), warp(C, fCA).astype(np.float32)
    bad = float((np.abs(wA - wC).max(2) > 25).mean())
    if bad > 0.008:
        for sub in ("rgb", "alpha"): shutil.copy(f"{P}/dup_orig/{sub}_{k:05d}.png", f"{P}/{sub}/{k:05d}.png")
        print(f"  {k}: mantido (discordância {100 * bad:.2f} %)"); continue
    M = 0.5 * wA + 0.5 * wC
    aM = 0.5 * warp(aA, fAC).astype(np.float32) + 0.5 * warp(aC, fCA).astype(np.float32)
    cv2.imwrite(f"{P}/rgb/{k:05d}.png", np.clip(M + 0.5, 0, 255).astype(np.uint8))
    cv2.imwrite(f"{P}/alpha/{k:05d}.png", np.clip(aM + 0.5, 0, 255).astype(np.uint8))
print("ok")
