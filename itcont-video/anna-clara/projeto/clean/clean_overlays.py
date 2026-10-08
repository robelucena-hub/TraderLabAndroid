#!/usr/bin/env python3
"""Remove burned-in overlays (captions + top-right signature) from the graded frames.

Stages (default: all):
  decode   - decode graded frames 0..N-1 into <work>/frames.npy (uint8 memmap, N x 1920 x 1080 x 3)
  analyze  - caption band/segments/templates, signature stroke mask, per-frame homographies
  render   - per-frame removal; writes <out>/rgb/NNNNN.png and <out>/mask/NNNNN.png
  compare  - before/after JPGs in <out>/compare

Method
  Signature (fixed screen-space overlay over a planar poster that moves because of zoom / camera drift):
    * stroke mask = pixels that are near-white (min(RGB)>200, max-min<40) in >=85% of frames, components>=15px
    * per-frame homography of the poster (ECC, MOTION_HOMOGRAPHY, signature masked out) to a reference frame
    * temporal fill: for frame t, warp nearby frames t' into t; a pixel hidden by the signature in t is
      taken from frames where the same poster point is NOT under the signature (source contamination
      mask = stroke dilated 4px).  Up to 3 samples per pixel (nearest in time first) -> median.
      Low-frequency photometric correction from the clean ring around the strokes (normalized conv.).
    * leftovers (never uncovered) -> cv2.INPAINT_TELEA.  Feathered paste (alpha 1 at <=3px from stroke,
      ramp to 0 at 5.5px).
  Captions (static white text, hard cuts, one line at y~1046-1090):
    * per-frame near-white mask inside the auto-detected band, segmentation into caption events by
      IoU between consecutive frames, per-event template = pixels white in >=60% of the event's frames
    * per-frame mask = template | (white & near template); dilated 4px on the shirt, 7px where skin is
      nearby (HEVC ringing around text over skin reaches further)
    * fade safety net: frames next to an event are tested for a faded copy of the template (contrast
      test with lower threshold); if found the template mask is applied there too
    * fill: LaMa (opencv_zoo inpainting_lama_2025jan.onnx) on native-resolution 512x512 crops; 1px feather.
"""
import argparse, json, os, subprocess, sys, time
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
DEF_SRC = os.path.abspath(os.path.join(HERE, '..', 'work', 'src.mp4'))
VF = ("scale=in_color_matrix=bt709:out_color_matrix=bt709,format=rgb24,eq=contrast=1.03:saturation=1.0:gamma=1.02,"
      "colorbalance=rs=-0.03:gs=0.0:bs=0.03:rm=-0.02:bm=0.02:rh=-0.02:bh=0.02,unsharp=5:5:0.25:5:5:0")
W, H = 1080, 1920


def K(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def whiteness(c, tmin=190, tsat=45):
    c = c.astype(np.int16)
    mn = c.min(-1); mx = c.max(-1)
    return (mn > tmin) & ((mx - mn) < tsat)


# ----------------------------------------------------------------------------------------------- decode
def stage_decode(a):
    out = os.path.join(a.work, 'frames.npy')
    if os.path.exists(out) and not a.redecode:
        print('decode: exists', out); return
    N = a.nframes
    mm = np.lib.format.open_memmap(out + '.tmp.npy', mode='w+', dtype=np.uint8, shape=(N, H, W, 3))
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-threads', '2', '-i', a.src, '-vf', VF, '-frames:v', str(N),
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    fs = W * H * 3
    for i in range(N):
        b = p.stdout.read(fs)
        if len(b) < fs:
            raise SystemExit('short read at frame %d' % i)
        mm[i] = np.frombuffer(b, np.uint8).reshape(H, W, 3)
    p.stdout.close(); p.wait(); mm.flush(); del mm
    os.replace(out + '.tmp.npy', out)
    print('decode: wrote', out)


def load_frames(a):
    return np.load(os.path.join(a.work, 'frames.npy'), mmap_mode='r')


# ---------------------------------------------------------------------------------------------- analyze
def analyze_captions(F, a):
    N = F.shape[0]
    # 1) find the caption band: rows with many near-white pixels across the clip
    Y0, Y1 = 900, 1250
    prof = np.zeros(Y1 - Y0)
    for i in range(0, N, 3):
        prof += whiteness(F[i, Y0:Y1], 200, 40).sum(1)
    thr = max(500.0, prof.max() * 0.02)
    rows = np.nonzero(prof > thr)[0]
    # keep the largest contiguous run (the text line)
    runs = np.split(rows, np.nonzero(np.diff(rows) > 3)[0] + 1)
    run = max(runs, key=lambda r: prof[r].sum())
    by0 = int(Y0 + run[0] - 12); by1 = int(Y0 + run[-1] + 15)
    print('captions: band y %d..%d' % (by0, by1))
    # 2) per-frame masks + segmentation
    Mw = np.zeros((N, by1 - by0, W), bool)
    for i in range(N):
        Mw[i] = whiteness(F[i, by0:by1])
    n = Mw.reshape(N, -1).sum(1)
    segs = []; cur = None
    for i in range(N):
        if n[i] > 500:
            if cur is not None and (Mw[i] & Mw[i - 1]).sum() / max(1, (Mw[i] | Mw[i - 1]).sum()) > 0.8:
                cur[1] = i
            else:
                if cur: segs.append(cur)
                cur = [i, i]
        else:
            if cur: segs.append(cur)
            cur = None
    if cur: segs.append(cur)
    segs = [s for s in segs if s[1] - s[0] >= 2]
    T = np.zeros((len(segs), by1 - by0, W), bool)
    for k, (s0, s1) in enumerate(segs):
        tk = Mw[s0:s1 + 1].mean(0) > 0.6
        # keep text-like components only (drop isolated specks)
        nl, lab, st, _ = cv2.connectedComponentsWithStats(tk.astype(np.uint8), 8)
        keep = np.zeros_like(tk)
        for c in range(1, nl):
            if st[c, 4] >= 6:
                keep[lab == c] = True
        T[k] = keep
    # 3) fade safety net: test frames adjacent to each event for a faded copy of its template
    ghosts = {}
    for k, (s0, s1) in enumerate(segs):
        tm = T[k].astype(np.uint8)
        ring = (cv2.dilate(tm, K(6)) > 0) & ~(cv2.dilate(tm, K(3)) > 0)
        for i in list(range(max(0, s0 - 4), s0)) + list(range(s1 + 1, min(N, s1 + 5))):
            if any(x0 <= i <= x1 for x0, x1 in segs):
                continue
            Lm = F[i, by0:by1].astype(np.float32).min(2)
            Lr = cv2.medianBlur(F[i, by0:by1].astype(np.uint8), 15).astype(np.float32).min(2)
            exc = (Lm - Lr)[T[k]]
            # faded white text: template pixels brighter than local background and ring is not
            frac = (exc > 25).mean()
            ringexc = ((Lm - Lr)[ring] > 25).mean()
            if frac > 0.35 and frac > 3 * ringexc:
                ghosts.setdefault(i, []).append(k)
    print('captions: %d events, ghost frames: %s' % (len(segs), sorted(ghosts)))
    np.savez_compressed(os.path.join(a.work, 'captions.npz'), band=np.array([by0, by1]), segs=np.array(segs),
                        T=T, Mw=Mw)
    with open(os.path.join(a.work, 'captions.json'), 'w') as f:
        json.dump({'band_y': [by0, by1], 'fps': 30,
                   'events': [{'k': k, 'f0': int(s0), 'f1': int(s1), 't0': round(s0 / 30, 3),
                               't1': round((s1 + 1) / 30, 3), 'px': int(T[k].sum())}
                              for k, (s0, s1) in enumerate(segs)],
                   'ghost_frames': {str(k): v for k, v in ghosts.items()}}, f, indent=1)


def analyze_signature(F, a):
    N = F.shape[0]
    y0, y1, x0, x1 = 60, 420, 480, 1080
    C = np.ascontiguousarray(F[:, y0:y1, x0:x1])
    frac = np.zeros((y1 - y0, x1 - x0), np.float32)
    for i in range(N):
        frac += whiteness(C[i], 200, 40)
    frac /= N
    del C
    core = (frac > 0.85).astype(np.uint8)
    nl, lab, st, _ = cv2.connectedComponentsWithStats(core, 8)
    keep = np.zeros_like(core)
    for c in range(1, nl):
        if st[c, 4] >= 15:
            keep[lab == c] = 1
    full = np.zeros((H, W), np.uint8); full[y0:y1, x0:x1] = keep * 255
    # safety: never include pixels that belong to the person (if a matte is available)
    adir = a.alpha_dir
    if adir and os.path.isdir(adir):
        mx = np.zeros((H, W), np.uint8)
        for i in range(0, N, 5):
            p = os.path.join(adir, '%05d.png' % i)
            if os.path.exists(p):
                al = cv2.imread(p, cv2.IMREAD_UNCHANGED)
                if al is not None:
                    if al.ndim == 3: al = al[..., 0]
                    np.maximum(mx, al, out=mx)
        # person pixels are only those present repeatedly; the signature zone is far above her head
        overlap = int(((mx > 200) & (full > 0)).sum())
        print('signature: overlap with person matte (max over frames):', overlap)
    ys, xs = np.nonzero(full)
    print('signature: %d stroke px, bbox x %d..%d y %d..%d' % (len(ys), xs.min(), xs.max(), ys.min(), ys.max()))
    cv2.imwrite(os.path.join(a.work, 'sig_core.png'), full)
    cv2.imwrite(os.path.join(a.work, 'sig_frac.png'), (np.clip(frac, 0, 1) * 255).astype(np.uint8))
    return full


def analyze_alignment(F, a, core):
    cv2.setNumThreads(a.threads)
    N = F.shape[0]
    md = cv2.dilate(core, K(4))
    RY0, RY1, RX0, RX1 = 30, 420, 430, 1080       # poster area above her head
    def prep(i):
        g = cv2.cvtColor(np.ascontiguousarray(F[i, RY0:RY1, RX0:RX1]), cv2.COLOR_RGB2GRAY)
        g = cv2.inpaint(g, md[RY0:RY1, RX0:RX1], 3, cv2.INPAINT_TELEA)
        return cv2.GaussianBlur(g, (0, 0), 1.0).astype(np.float32)
    REF = a.ref_frame
    T = prep(REF)
    mask = (255 - md[RY0:RY1, RX0:RX1]).astype(np.uint8)
    O = np.array([[1, 0, RX0], [0, 1, RY0], [0, 0, 1]], np.float64); Oi = np.linalg.inv(O)
    S = np.diag([0.5, 0.5, 1.0]); Si = np.linalg.inv(S)
    Ts = cv2.resize(T, None, fx=0.5, fy=0.5); ms = cv2.resize(mask, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_NEAREST)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-5)
    Hs = np.zeros((N, 3, 3)); cc = np.zeros(N)
    def run(i, init):
        I = prep(i)
        Is = cv2.resize(I, None, fx=0.5, fy=0.5)
        Wc = (S @ init @ Si).astype(np.float32)
        _, Wc = cv2.findTransformECC(Ts, Is, Wc, cv2.MOTION_HOMOGRAPHY, crit, ms, 3)
        Wf = (Si @ Wc.astype(np.float64) @ S).astype(np.float32)
        r, Wf = cv2.findTransformECC(T, I, Wf, cv2.MOTION_HOMOGRAPHY, crit, mask, 3)
        return r, Wf.astype(np.float64)
    # propagate from the reference outwards so each init is the neighbour's solution
    order = [list(range(REF, N)), list(range(REF - 1, -1, -1))]
    for seq in order:
        prev = np.eye(3)
        for i in seq:
            try:
                r, Wr = run(i, prev)
            except cv2.error:
                r, Wr = 0.0, prev
            prev = Wr
            Hs[i] = O @ Wr @ Oi; cc[i] = r
    print('alignment: ECC corr min %.4f mean %.4f' % (cc.min(), cc.mean()))
    np.save(os.path.join(a.work, 'H_ref2frame.npy'), Hs); np.save(os.path.join(a.work, 'H_cc.npy'), cc)


def stage_analyze(a):
    F = load_frames(a)
    t = time.time(); analyze_captions(F, a); print('  %.0fs' % (time.time() - t))
    t = time.time(); core = analyze_signature(F, a); print('  %.0fs' % (time.time() - t))
    t = time.time(); analyze_alignment(F, a, core); print('  %.0fs' % (time.time() - t))


# ----------------------------------------------------------------------------------------------- render
class Ctx:
    pass


def init_ctx(a):
    c = Ctx()
    c.a = a
    c.F = load_frames(a); c.N = c.F.shape[0]
    cap = np.load(os.path.join(a.work, 'captions.npz'))
    c.band = cap['band']; c.segs = cap['segs']; c.T = cap['T']; c.Mw = cap['Mw']
    with open(os.path.join(a.work, 'captions.json')) as f:
        c.ghosts = {int(k): v for k, v in json.load(f)['ghost_frames'].items()}
    c.Hs = np.load(os.path.join(a.work, 'H_ref2frame.npy'))
    core = cv2.imread(os.path.join(a.work, 'sig_core.png'), 0)
    ys, xs = np.nonzero(core)
    c.box = (max(0, ys.min() - 45), min(H, ys.max() + 46), max(0, xs.min() - 45), min(W, xs.max() + 46))
    BY0, BY1, BX0, BX1 = c.box
    # distance from stroke for feathering
    dist = cv2.distanceTransform((core == 0).astype(np.uint8), cv2.DIST_L2, 5)
    c.sig_alpha_full = np.clip((5.5 - dist) / 2.5, 0, 1).astype(np.float32)     # 1 at <=3px, 0 at >=5.5px
    c.sig_fill = (dist <= 5.5)[BY0:BY1, BX0:BX1]                                 # pixels we synthesize
    c.sig_alpha = c.sig_alpha_full[BY0:BY1, BX0:BX1]
    c.bad_full = (cv2.dilate(core, K(4)) > 0).astype(np.uint8) * 255              # contaminated in a source
    c.O = np.array([[1, 0, BX0], [0, 1, BY0], [0, 0, 1]], np.float64)
    c.sess = None
    return c


def lama_session(c):
    if c.sess is None:
        import onnxruntime as ort
        so = ort.SessionOptions(); so.intra_op_num_threads = c.a.threads; so.inter_op_num_threads = 1
        so.log_severity_level = 3
        c.sess = ort.InferenceSession(c.a.lama, so, providers=['CPUExecutionProvider'])
    return c.sess


def lama(c, img, hole):
    s = lama_session(c)
    o = s.run(None, {'image': (img.astype(np.float32) / 255.).transpose(2, 0, 1)[None],
                     'mask': hole.astype(np.float32)[None, None]})[0][0].transpose(1, 2, 0)
    return np.clip(o, 0, 255)


def nconv(val, wt, sig):
    num = cv2.GaussianBlur(val * wt[..., None], (0, 0), sig)
    den = cv2.GaussianBlur(wt, (0, 0), sig)[..., None]
    return num / np.maximum(den, 1e-3)


def signature_fill(c, t, frame):
    """returns (filled box float32, unfilled count, n_sources)"""
    BY0, BY1, BX0, BX1 = c.box
    bh, bw = BY1 - BY0, BX1 - BX0
    cur = frame[BY0:BY1, BX0:BX1].astype(np.float32)
    hole = c.sig_fill
    known = ~hole
    ringzone = (cv2.dilate(hole.astype(np.uint8), K(14)) > 0) & known
    MAXS = 3
    S = np.zeros((MAXS, bh, bw, 3), np.float32); cnt = np.zeros((bh, bw), np.int32)
    need = hole.copy()
    Hinv = np.linalg.inv(c.Hs[t])
    win = c.a.sig_window
    near = sorted([x for x in range(max(0, t - win), min(c.N, t + win + 1)) if x != t], key=lambda x: abs(x - t))
    far = sorted([x for x in range(c.N) if x != t and abs(x - t) > win], key=lambda x: abs(x - t))
    used = 0
    corners = np.array([[0, 0, 1], [bw, 0, 1], [0, bh, 1], [bw, bh, 1]], np.float64).T
    for phase, cands in enumerate((near, far)):
        if phase == 1:
            need = hole & (cnt == 0)          # far frames only for pixels never uncovered nearby
        for tp in cands:
            if not need.any() or (phase == 0 and used >= c.a.sig_max_sources):
                break
            Mx = c.Hs[tp] @ Hinv @ c.O                   # box coords of t -> full coords of tp
            vb = cv2.warpPerspective(c.bad_full, Mx, (bw, bh), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=255)
            valid = vb < 8
            newv = valid & need
            nn = int(newv.sum())
            if nn == 0 or (phase == 0 and nn < 15):
                continue
            pc = Mx @ corners; pc = pc[:2] / pc[2]
            sx0 = int(max(0, np.floor(pc[0].min()) - 4)); sx1 = int(min(W, np.ceil(pc[0].max()) + 5))
            sy0 = int(max(0, np.floor(pc[1].min()) - 4)); sy1 = int(min(H, np.ceil(pc[1].max()) + 5))
            src = np.ascontiguousarray(c.F[tp, sy0:sy1, sx0:sx1])
            Ms = np.array([[1, 0, -sx0], [0, 1, -sy0], [0, 0, 1]], np.float64) @ Mx
            w = cv2.warpPerspective(src, Ms, (bw, bh), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                                    borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
            ring = (ringzone & valid).astype(np.float32)
            if ring.sum() < 200:
                continue
            corr = nconv(cur - w, ring, 8.0)
            wc = w + corr
            idx = np.nonzero(newv)
            k = cnt[idx]
            S[k, idx[0], idx[1]] = wc[idx]
            cnt[idx] += 1
            need = hole & (cnt < MAXS) if phase == 0 else hole & (cnt == 0)
            used += 1
    out = cur.copy()
    for n in (1, 2, 3):
        sel = hole & (cnt == n)
        if not sel.any(): continue
        if n == 1: v = S[0][sel]
        elif n == 2: v = 0.5 * (S[0][sel] + S[1][sel])
        else: v = np.median(S[:3, sel], axis=0)
        out[sel] = v
    unf = hole & (cnt == 0)
    nunf = int(unf.sum())
    if nunf:
        o8 = np.clip(out, 0, 255).astype(np.uint8)
        o8 = cv2.inpaint(o8, unf.astype(np.uint8) * 255, 4, cv2.INPAINT_TELEA)
        out[unf] = o8[unf].astype(np.float32)
    a_ = c.sig_alpha[..., None]
    res = cur * (1 - a_) + out * a_
    return res, nunf, used


def skinprob(img):
    x = img.astype(np.float32); r, g, b = x[..., 0], x[..., 1], x[..., 2]
    return np.clip((r - b - 12) / 30, 0, 1) * np.clip((r - 45) / 45, 0, 1)


def caption_mask(c, t, frame):
    by0, by1 = c.band
    tm = None
    for k, (s0, s1) in enumerate(c.segs):
        if s0 <= t <= s1:
            tk = c.T[k].astype(np.uint8)
            tm = (tk | (c.Mw[t] & (cv2.dilate(tk, K(3)) > 0))).astype(np.uint8)
            break
    if tm is None and t in c.ghosts:
        tm = np.zeros(c.T.shape[1:], np.uint8)
        for k in c.ghosts[t]:
            tm |= c.T[k].astype(np.uint8)
    if tm is None:
        return None
    full = np.zeros((H, W), np.uint8); full[by0:by1] = tm * 255
    base = cv2.dilate(full, K(c.a.cap_dilate))
    big = cv2.dilate(full, K(c.a.cap_dilate_skin))
    y0 = max(0, by0 - 20); y1 = min(H, by1 + 20)
    sk = np.zeros((H, W), np.float32)
    sk[y0:y1] = cv2.GaussianBlur((skinprob(frame[y0:y1]) > 0.5).astype(np.float32), (0, 0), 4)
    return np.where((big > 0) & (sk > 0.15), 255, base).astype(np.uint8)


def caption_fill_half(c, frame, m):
    """Uma janela 1024x1024 reduzida para 512 (entrada fixa do LaMa): uma chamada por quadro, meia resolução."""
    ys, xs = np.nonzero(m)
    out = frame.astype(np.float32).copy()
    cy, cx = (ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2
    S_ = 1024
    y0 = int(np.clip(cy - S_ // 2, 0, H - S_)); x0 = int(np.clip(cx - S_ // 2, 0, W - S_))
    img = np.clip(out[y0:y0 + S_, x0:x0 + S_], 0, 255).astype(np.uint8)
    hole = m[y0:y0 + S_, x0:x0 + S_] > 0
    hs = cv2.dilate(cv2.resize(hole.astype(np.uint8), (512, 512), interpolation=cv2.INTER_AREA), K(1)) > 0
    Ls = lama(c, cv2.resize(img, (512, 512), interpolation=cv2.INTER_AREA), hs)
    L = cv2.resize(Ls, (S_, S_), interpolation=cv2.INTER_CUBIC)
    a_ = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 0.7)
    a_ = np.maximum(a_, cv2.erode(hole.astype(np.uint8), K(1)).astype(np.float32))[..., None]
    reg = out[y0:y0 + S_, x0:x0 + S_]
    out[y0:y0 + S_, x0:x0 + S_] = reg * (1 - a_) + L * a_
    return out


def caption_fill(c, frame, m):
    if c.a.lama_scale < 1:
        return caption_fill_half(c, frame, m)
    ys, xs = np.nonzero(m)
    out = frame.astype(np.float32).copy()
    cy = (ys.min() + ys.max()) // 2
    y0 = int(np.clip(cy - 256, 0, H - 512))
    xa, xb = xs.min(), xs.max()
    # tiles of 512 covering [xa,xb] with >=64px margin to each side when possible
    if xb - xa + 1 <= 512 - 40:
        cx = (xa + xb) // 2; x0s = [int(np.clip(cx - 256, 0, W - 512))]
    else:
        n = int(np.ceil((xb - xa + 1 + 64) / (512 - 128))) + 1
        x0s = [int(v) for v in np.linspace(max(0, xa - 64), min(W - 512, xb + 64 - 512), n)]
    for x0 in x0s:
        img = np.clip(out[y0:y0 + 512, x0:x0 + 512], 0, 255).astype(np.uint8)
        hole = m[y0:y0 + 512, x0:x0 + 512] > 0
        if not hole.any(): continue
        L = lama(c, img, hole)
        # paste only the hole pixels at least 40px from the tile's inner edges (or at the frame edge)
        sel = hole.copy()
        if len(x0s) > 1:
            lim = np.zeros_like(sel)
            lx0 = 0 if x0 == 0 else 40; lx1 = 512 if x0 + 512 >= W else 512 - 40
            lim[:, lx0:lx1] = True
            sel &= lim
        a_ = cv2.GaussianBlur(sel.astype(np.float32), (0, 0), 0.7)
        a_ = np.maximum(a_, cv2.erode(sel.astype(np.uint8), K(1)).astype(np.float32))[..., None]
        reg = out[y0:y0 + 512, x0:x0 + 512]
        out[y0:y0 + 512, x0:x0 + 512] = reg * (1 - a_) + L * a_
    return out


def process_frame(c, t):
    frame = np.ascontiguousarray(c.F[t])
    res = frame.astype(np.float32)
    mask = np.zeros((H, W), np.uint8)
    info = {'t': t}
    # captions first on the original frame (independent of the signature region)
    m = caption_mask(c, t, frame)
    if m is not None:
        res = caption_fill(c, frame, m.copy())
        mask |= cv2.dilate(m, K(1))
        info['cap_px'] = int((m > 0).sum())
    BY0, BY1, BX0, BX1 = c.box
    sres, nunf, used = signature_fill(c, t, frame)
    res[BY0:BY1, BX0:BX1] = sres
    mask[BY0:BY1, BX0:BX1] |= (c.sig_alpha > 0).astype(np.uint8) * 255
    info.update(sig_unfilled=nunf, sig_sources=used)
    out = np.clip(np.rint(res), 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(c.a.out, 'rgb', '%05d.png' % t), out[:, :, ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 1])
    cv2.imwrite(os.path.join(c.a.out, 'mask', '%05d.png' % t), mask, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return info


_CTX = None
def _winit(a):
    global _CTX
    cv2.setNumThreads(1)
    _CTX = init_ctx(a)
def _wrun(t):
    t0 = time.time(); info = process_frame(_CTX, t); info['sec'] = round(time.time() - t0, 2); return info


def stage_render(a):
    os.makedirs(os.path.join(a.out, 'rgb'), exist_ok=True); os.makedirs(os.path.join(a.out, 'mask'), exist_ok=True)
    f0, f1 = a.frames
    todo = [t for t in range(f0, f1 + 1)
            if a.force or not (os.path.exists(os.path.join(a.out, 'rgb', '%05d.png' % t)) and
                               os.path.exists(os.path.join(a.out, 'mask', '%05d.png' % t)))]
    print('render: %d frames to do' % len(todo), flush=True)
    logp = os.path.join(a.work, 'render_log.jsonl')
    t0 = time.time()
    if a.workers <= 1:
        _winit(a); it = map(_wrun, todo)
    else:
        import multiprocessing as mp
        pool = mp.get_context('fork').Pool(a.workers, initializer=_winit, initargs=(a,))
        it = pool.imap_unordered(_wrun, todo, chunksize=1)
    with open(logp, 'a') as lf:
        for n, info in enumerate(it, 1):
            lf.write(json.dumps(info) + '\n'); lf.flush()
            if n % 10 == 0 or n == len(todo):
                el = time.time() - t0
                print('render: %d/%d  %.1fs elapsed, eta %.0fs' % (n, len(todo), el, el / n * (len(todo) - n)), flush=True)


# ---------------------------------------------------------------------------------------------- compare
def stage_compare(a):
    F = load_frames(a)
    od = os.path.join(a.out, 'compare'); os.makedirs(od, exist_ok=True)
    core = cv2.imread(os.path.join(a.work, 'sig_core.png'), 0)
    ys, xs = np.nonzero(core)
    sy0, sy1, sx0, sx1 = ys.min() - 40, ys.max() + 41, max(0, xs.min() - 50), min(W, xs.max() + 51)
    cap = np.load(os.path.join(a.work, 'captions.npz')); by0, by1 = cap['band']
    cy0, cy1 = by0 - 60, by1 + 60
    font = cv2.FONT_HERSHEY_SIMPLEX
    def lab(img, s):
        img = img.copy(); cv2.putText(img, s, (8, 24), font, 0.7, (0, 0, 0), 4); cv2.putText(img, s, (8, 24), font, 0.7, (255, 255, 0), 2); return img
    for t in a.compare_frames:
        p = os.path.join(a.out, 'rgb', '%05d.png' % t)
        if not os.path.exists(p): continue
        aft = cv2.imread(p); bef = np.ascontiguousarray(F[t, :, :, ::-1])
        sb, sa = bef[sy0:sy1, sx0:sx1], aft[sy0:sy1, sx0:sx1]
        top = np.hstack([lab(sb, 'f%d before' % t), lab(sa, 'after')])
        top = cv2.resize(top, (W, int(top.shape[0] * W / top.shape[1])))
        cb, ca = bef[cy0:cy1], aft[cy0:cy1]
        img = np.vstack([top, np.full((6, W, 3), 255, np.uint8), lab(cb, 'f%d %.2fs before' % (t, t / 30)),
                         lab(ca, 'after'), ])
        cv2.imwrite(os.path.join(od, 'cmp_%05d.jpg' % t), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print('compare: wrote', od)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', default=DEF_SRC)
    ap.add_argument('--out', default=HERE)
    ap.add_argument('--work', default=os.path.join(HERE, 'work'))
    ap.add_argument('--lama', default=os.path.join(HERE, 'models', 'lama', 'lama.onnx'))
    ap.add_argument('--alpha-dir', default=os.path.abspath(os.path.join(HERE, '..', 'work', 'plates', 'alpha')))
    ap.add_argument('--nframes', type=int, default=675)
    ap.add_argument('--frames', default=None, help='a-b inclusive (default all)')
    ap.add_argument('--stage', default='all', choices=['all', 'decode', 'analyze', 'render', 'compare'])
    ap.add_argument('--workers', type=int, default=2)
    ap.add_argument('--threads', type=int, default=2)
    ap.add_argument('--ref-frame', type=int, default=300)
    ap.add_argument('--sig-window', type=int, default=240)
    ap.add_argument('--sig-max-sources', type=int, default=400)
    ap.add_argument('--cap-dilate', type=int, default=4)
    ap.add_argument('--cap-dilate-skin', type=int, default=7)
    ap.add_argument('--compare-frames', default='0,46,106,131,185,216,293,331,420,465,530,593,615,650,90,300,600,674')
    ap.add_argument('--lama-scale', type=float, default=1.0)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--redecode', action='store_true')
    a = ap.parse_args()
    a.frames = tuple(int(x) for x in a.frames.split('-')) if a.frames else (0, a.nframes - 1)
    a.compare_frames = [int(x) for x in a.compare_frames.split(',') if x]
    os.makedirs(a.work, exist_ok=True)
    st = a.stage
    if st in ('all', 'decode'): stage_decode(a)
    if st in ('all', 'analyze'): stage_analyze(a)
    if st in ('all', 'render'): stage_render(a)
    if st in ('all', 'compare'): stage_compare(a)


if __name__ == '__main__':
    main()
