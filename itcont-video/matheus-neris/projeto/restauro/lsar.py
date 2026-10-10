"""Janssen / LSAR autoregressive declipping, local to clipped regions (identity elsewhere).

Unreliable samples = |x| >= th_core (sign-consistent "core"), dilated by `dil` samples.
Each cluster of unreliable samples is re-synthesised by least-squares AR interpolation
(Janssen iterations: AR fit by covariance method on reliable rows, then LS interpolation),
with the amplitude constraint sign(y)=sign(x), |y| >= lb on core samples (iterative clamping).
"""
import numpy as np
from scipy.ndimage import binary_dilation, label
from numpy.lib.stride_tricks import sliding_window_view
from scipy.linalg import solveh_banded


def ar_cov(y, rel, p, ridge=1e-4):
    """AR(p) prediction coeffs a (a[0]=1) by covariance LS on rows whose p+1 samples are all reliable."""
    W = sliding_window_view(y, p + 1)            # rows: y[t-p..t]
    R = sliding_window_view(rel, p + 1).all(1)
    if R.sum() < 2 * p:
        R = np.ones(len(W), bool)
    X = W[R][:, :p][:, ::-1]                     # y[t-1], ..., y[t-p]
    t = W[R][:, p]
    G = X.T @ X; G += ridge * np.trace(G) / p * np.eye(p) + 1e-12 * np.eye(p)
    c = np.linalg.solve(G, X.T @ t)
    return np.concatenate([[1.0], -c])


def lsar_fill(y, unk, a):
    """Minimise ||a * y||^2 over y[unk] (unk indices must be >= p from both ends)."""
    p = len(a) - 1
    y0 = y.copy(); y0[unk] = 0
    e = np.convolve(y0, a, mode="valid")         # e[t] = sum a_k y0[t+p-k] ... (full-rows residual)
    # gradient wrt y: A^T e ; A rows = reversed a at positions
    g = np.convolve(e, a[::-1])                  # A^T e, length N
    ra = np.correlate(a, a, mode="full")[p:]     # autocorr of a, lags 0..p
    n = len(unk)
    if n <= 64:
        d = np.abs(unk[:, None] - unk[None, :])
        M = np.where(d <= p, ra[np.minimum(d, p)], 0.0) + 1e-9 * np.eye(n)
        return np.linalg.solve(M, -g[unk])
    # banded (upper) storage: index differences in the sorted unknown list are <= sample lag
    ab = np.zeros((p + 1, n))
    for k in range(0, min(p, n - 1) + 1):
        d = unk[k:] - unk[:n - k]
        ab[p - k, k:] = np.where(d <= p, ra[np.minimum(d, p)], 0.0)
    ab[p] += 1e-9
    return solveh_banded(ab, -g[unk])


def declip(x, th_core=0.85, dil=2, p=40, ctx=1024, lb=None, n_iter=3, merge=None, ridge=1e-4,
           relax=1.0, max_clamp=20, th_lo=None, lb_lo=None):
    x = np.asarray(x, float); y = x.copy(); N = len(x)
    lb = th_core if lb is None else lb
    core = np.abs(x) >= th_core
    U = binary_dilation(core, np.ones(2 * dil + 1, bool)) if dil > 0 else core.copy()
    if th_lo is not None:                      # hysteresis: runs of |x|>=th_lo touching a core sample
        lab_lo, _ = label(np.abs(x) >= th_lo)
        keep = np.unique(lab_lo[core]); keep = keep[keep > 0]
        U |= np.isin(lab_lo, keep)
    merge = 2 * p if merge is None else merge
    Um = binary_dilation(U, np.ones(merge, bool))      # merge nearby runs into one cluster
    lab, n = label(Um)
    if n == 0:
        return y, U
    from scipy.ndimage import find_objects
    objs = find_objects(lab)
    rel_g = ~U
    for ob in objs:
        s0, s1 = ob[0].start, ob[0].stop
        a0, a1 = max(0, s0 - ctx), min(N, s1 + ctx)
        seg = y[a0:a1].copy(); rel = rel_g[a0:a1].copy()
        uidx = np.flatnonzero(~rel[(s0 - a0):(s1 - a0)]) + (s0 - a0)
        uidx = uidx[(uidx >= p) & (uidx < len(seg) - p)]
        if len(uidx) == 0:
            continue
        sgn = np.sign(seg[uidx]); iscore = core[a0:a1][uidx]
        # limite inferior = valor observado: o corte só reduz a amplitude, então a reconstrução nunca fica abaixo
        # do que foi gravado (evita "achatar" picos de novo num patamar fixo, como ±0,80)
        lbv = np.where(iscore, np.maximum(lb, np.abs(x[a0 + uidx])), -np.inf if lb_lo is None else lb_lo)
        for it in range(n_iter):
            a = ar_cov(seg, rel if it == 0 else np.ones_like(rel), p, ridge)
            free = np.ones(len(uidx), bool); vals = seg[uidx].copy()
            for _ in range(max_clamp):
                fi = uidx[free]
                tmp = seg.copy(); tmp[uidx[~free]] = vals[~free]
                v = lsar_fill(tmp, fi, a)
                vals[free] = v
                viol = free & (vals * sgn < lbv)
                if not viol.any():
                    break
                vals[viol] = sgn[viol] * lbv[viol]; free &= ~viol
            seg[uidx] = vals
        y[a0 + uidx] = x[a0 + uidx] + relax * (seg[uidx] - x[a0 + uidx])
        rel_g[a0 + uidx] = True
    return y, U
