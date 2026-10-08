#!/usr/bin/env python3
"""Versão rápida da remoção de sobreposições (usa a análise de clean_overlays.py).

Assinatura: em vez de buscar dezenas de quadros-fonte por quadro, monta UMA placa limpa do pôster
(mediana de amostras alinhadas por homografia, só onde a assinatura não cobre) e, em cada quadro,
deforma essa placa para a posição atual + correção fotométrica pelo anel limpo ao redor dos traços.
Legendas: LaMa (janela 1024 reduzida a 512) só quando o texto encosta em pele; sobre a camisa, Telea.

uso: python3 -I clean_fast.py --out <dir> [--frames a-b] [--workers 3]
"""
import argparse, os, sys, time, json
import numpy as np, cv2
cv2.setNumThreads(1)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import clean_overlays as co

H, W = co.H, co.W
REG = (40, 400, 420, 1080)          # região do pôster (coords do quadro de referência) para a placa


def build_plate(c, step=2, K=9):
    y0, y1, x0, x1 = REG
    rh, rw = y1 - y0, x1 - x0
    OR = np.array([[1, 0, x0], [0, 1, y0], [0, 0, 1]], np.float64)
    S = np.zeros((K, rh, rw, 3), np.float32); cnt = np.zeros((rh, rw), np.int32)
    ref = c.a.ref_frame
    order = sorted(range(0, c.N, step), key=lambda t: abs(t - ref))
    for tp in order:
        M = c.Hs[tp] @ np.linalg.inv(c.Hs[ref]) @ OR        # coords locais da região (ref) -> quadro tp
        bad = cv2.warpPerspective(c.bad_full, M, (rw, rh), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                                  borderMode=cv2.BORDER_CONSTANT, borderValue=255)
        val = bad < 8
        ap = os.path.join(c.a.alpha_dir, '%05d.png' % tp)
        if os.path.exists(ap):   # exclui a apresentadora
            al = cv2.imread(ap, 0)
            alw = cv2.warpPerspective(al, M, (rw, rh), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                                      borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            val &= alw < 20
        sel = val & (cnt < K)
        if not sel.any(): continue
        w = cv2.warpPerspective(np.ascontiguousarray(c.F[tp]), M, (rw, rh), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                                borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        idx = np.nonzero(sel); k = cnt[idx]
        S[k, idx[0], idx[1]] = w[idx]; cnt[idx] += 1
        if (cnt >= K).all(): break
    plate = np.zeros((rh, rw, 3), np.float32)
    for n in range(1, K + 1):
        m = cnt == n
        if m.any(): plate[m] = np.median(S[:n, m], axis=0)
    return plate, cnt, OR


def sig_fill_plate(c, t, frame, plate, pcnt, OR):
    BY0, BY1, BX0, BX1 = c.box
    bh, bw = BY1 - BY0, BX1 - BX0
    cur = frame[BY0:BY1, BX0:BX1].astype(np.float32)
    hole = c.sig_fill
    ref = c.a.ref_frame
    Mb = np.linalg.inv(OR) @ c.Hs[ref] @ np.linalg.inv(c.Hs[t]) @ c.O     # caixa (quadro t) -> placa
    w = cv2.warpPerspective(plate, Mb, (bw, bh), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    v = cv2.warpPerspective((pcnt > 0).astype(np.uint8) * 255, Mb, (bw, bh), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=0) > 0
    ring = ((cv2.dilate(hole.astype(np.uint8), co.K(14)) > 0) & ~hole & v).astype(np.float32)
    corr = co.nconv(cur - w, ring, 8.0)
    out = cur.copy()
    fill = hole & v
    out[fill] = (w + corr)[fill]
    unf = hole & ~v
    if unf.any():
        o8 = cv2.inpaint(np.clip(out, 0, 255).astype(np.uint8), unf.astype(np.uint8) * 255, 4, cv2.INPAINT_TELEA)
        out[unf] = o8[unf]
    a_ = c.sig_alpha[..., None]
    return cur * (1 - a_) + out * a_, int(unf.sum())


_C = None
def winit(a, plate_path):
    global _C
    cv2.setNumThreads(1)
    _C = co.init_ctx(a)
    z = np.load(plate_path); _C.plate, _C.pcnt, _C.OR = z['plate'], z['cnt'], z['OR']


def wrun(t):
    c = _C; t0 = time.time()
    frame = np.ascontiguousarray(c.F[t])
    res = frame.astype(np.float32); mask = np.zeros((H, W), np.uint8); info = {'t': t}
    m = co.caption_mask(c, t, frame)
    if m is not None:
        by0, by1 = c.band
        sk = co.skinprob(frame[by0 - 20:by1 + 20]) > 0.5
        near = cv2.dilate(m[by0 - 20:by1 + 20], co.K(9)) > 0
        skin_touch = (sk & near).sum() > 0.02 * max(1, near.sum())
        if skin_touch:
            res = co.caption_fill(c, frame, m.copy()); info['cap'] = 'lama'
        else:
            res = cv2.inpaint(frame, m, 5, cv2.INPAINT_TELEA).astype(np.float32); info['cap'] = 'telea'
        mask |= cv2.dilate(m, co.K(1))
    BY0, BY1, BX0, BX1 = c.box
    sres, nunf = sig_fill_plate(c, t, frame, c.plate, c.pcnt, c.OR)
    res[BY0:BY1, BX0:BX1] = sres
    mask[BY0:BY1, BX0:BX1] |= (c.sig_alpha > 0).astype(np.uint8) * 255
    out = np.clip(np.rint(res), 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(c.a.out, 'rgb', '%05d.png' % t), out[:, :, ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 1])
    cv2.imwrite(os.path.join(c.a.out, 'mask', '%05d.png' % t), mask, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    info.update(sig_unfilled=nunf, sec=round(time.time() - t0, 2)); return info


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True); ap.add_argument('--frames', default='0-674')
    ap.add_argument('--workers', type=int, default=3); ap.add_argument('--threads', type=int, default=1)
    ap.add_argument('--lama-scale', type=float, default=0.5)
    a0 = ap.parse_args()
    a = argparse.Namespace(src=co.DEF_SRC, out=a0.out, work=os.path.join(here, 'work'),
                           lama=os.path.join(here, 'models', 'lama', 'lama.onnx'),
                           alpha_dir=os.path.abspath(os.path.join(here, '..', 'work', 'plates', 'alpha')),
                           nframes=675, ref_frame=300, sig_window=240, sig_max_sources=12,
                           cap_dilate=4, cap_dilate_skin=7, threads=a0.threads, lama_scale=a0.lama_scale)
    os.makedirs(os.path.join(a.out, 'rgb'), exist_ok=True); os.makedirs(os.path.join(a.out, 'mask'), exist_ok=True)
    plate_path = os.path.join(a.work, 'poster_plate.npz')
    if not os.path.exists(plate_path):
        t0 = time.time(); c = co.init_ctx(a); p, n, OR = build_plate(c)
        np.savez_compressed(plate_path, plate=p, cnt=n, OR=OR)
        cv2.imwrite(os.path.join(a.work, 'poster_plate.png'), np.clip(p, 0, 255).astype(np.uint8)[:, :, ::-1])
        print('placa: %.1fs, pixels sem amostra: %d' % (time.time() - t0, int((n == 0).sum())), flush=True)
    f0, f1 = map(int, a0.frames.split('-'))
    todo = list(range(f0, f1 + 1))
    import multiprocessing as mp
    t0 = time.time(); stats = {'lama': 0, 'telea': 0}
    with mp.get_context('spawn').Pool(a0.workers, initializer=winit, initargs=(a, plate_path)) as pool, \
         open(os.path.join(a.work, 'render_fast_log.jsonl'), 'a') as lf:
        for k, info in enumerate(pool.imap_unordered(wrun, todo, chunksize=2), 1):
            lf.write(json.dumps(info) + '\n')
            if 'cap' in info: stats[info['cap']] += 1
            if k % 25 == 0 or k == len(todo):
                el = time.time() - t0
                print('%d/%d %.0fs eta %.0fs %s' % (k, len(todo), el, el / k * (len(todo) - k), stats), flush=True)
