"""Gera timeline.json (tempos de saída) e legendas .srt a partir de edit.json."""
import json, sys, os

proj = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(f"{proj}/edit.json"))
FPS = E["fps"]
out_dir = sys.argv[1] if len(sys.argv) > 1 else proj

# ---- segmentos: posição na saída ----
segs, cur = [], 0
for s in E["segments"]:
    n = s["out"] - s["in"]
    segs.append({**s, "out_start": cur, "n": n, "t0": cur / FPS, "t1": (cur + n) / FPS,
                 "src0": s["in"] / FPS, "src1": s["out"] / FPS})
    cur += n
closing = {"start": cur, "n": E["closing_frames"], "t0": cur / FPS, "t1": (cur + E["closing_frames"]) / FPS}
total = cur + E["closing_frames"]
S = {s["id"]: s for s in segs}

def s2o(t, seg_id=None):
    """Tempo da fonte -> tempo de saída (procura o segmento do corpo que contém t)."""
    cands = [S[seg_id]] if seg_id else [s for s in segs if s["id"] != "H"]
    for s in cands:
        if s["src0"] - 1e-6 <= t <= s["src1"] + 1e-6:
            return s["t0"] + (t - s["src0"])
    raise ValueError(f"tempo {t} fora dos segmentos {seg_id}")

# ---- palavras e legendas ----
W = E["words"]
caps, words_out = [], []
for c in E["captions"]:
    i0, i1 = c["w"]
    ws = []
    for i in range(i0, i1 + 1):
        w = W[i]
        st = s2o(w[1], c["seg"])
        if len(w) > 2: en = s2o(w[2], c["seg"])
        elif i < i1: en = s2o(W[i + 1][1], c["seg"])
        else: en = st + 0.35
        ws.append({"w": w[0], "t0": round(st, 3), "t1": round(en, 3)})
    caps.append({"seg": c["seg"], "text": c["text"], "words": ws,
                 "t0": ws[0]["t0"] - 0.06, "t1": ws[-1]["t1"] + 0.25})
    words_out += ws
# sem sobreposição; não ultrapassa o fim do segmento
for k, c in enumerate(caps):
    seg_end = S[c["seg"]]["t1"]
    c["t1"] = min(c["t1"], seg_end - 0.02)
    if k + 1 < len(caps): c["t1"] = min(c["t1"], caps[k + 1]["t0"] - 0.02)
    c["t0"], c["t1"] = round(max(c["t0"], S[c["seg"]]["t0"]), 3), round(c["t1"], 3)

cues = {k: round(s2o(v), 3) for k, v in E["cues_src"].items() if not k.startswith("_")}
cues["closing"] = closing["t0"]
cues["hook_end"] = S["H"]["t1"]

# ---- câmera: s = escala, y0 = topo na fonte (negativo = parede estendida), dx = desvio horizontal ----
TALK, PUNCH, TITLE = (1.08, 8), (1.17, 66), (1.0, -232)
A, B, C, D, Eg = S["A"], S["B"], S["C"], S["D"], S["E"]
cam = [  # (t, s, y0, ease_para_este_ponto)
    (0.0, 1.05, -196, "cut"), (S["H"]["t1"] - 0.001, 1.11, -176, "lin"),
    (A["t0"], *TALK, "cut"), (s2o(6.70), 1.105, 14, "lin"),
    (s2o(6.70) + 0.85, *TITLE, "ease"), (A["t1"] - 0.001, 1.025, -224, "lin"),
    (B["t0"], 1.16, 60, "cut"), (s2o(16.45), 1.19, 70, "lin"),
    (s2o(16.45) + 0.75, 1.0, -240, "ease"), (cues["itcont"], 1.0, -240, "lin"),
    (cues["itcont"] + 0.28, 1.035, -236, "out"), (B["t1"] - 0.001, 1.045, -234, "lin"),
    (C["t0"], 1.06, -226, "cut"), (C["t1"] - 0.001, 1.08, -222, "lin"),
    (D["t0"], 1.0, -240, "cut"), (D["t1"] - 0.001, 1.02, -238, "lin"),
    (Eg["t0"], 1.04, -226, "cut"), (cues["cards_out"], 1.05, -224, "lin"),
    (cues["cards_out"] + 0.8, 1.14, 48, "ease"), (s2o(37.75), 1.16, 56, "lin"),
    (s2o(37.75) + 1.0, 1.22, 80, "ease"), (Eg["t1"], 1.235, 84, "lin"),
]

# ---- câmera quadro a quadro ----
EXT = 300            # pixels de parede sintetizada acima do quadro original
WM_TOP = 1836        # primeira linha da marca d'água "clideo.com" (y 1840-1886): nunca entra no quadro
def ease_fn(name, x):
    if name == "ease": return 4*x**3 if x < .5 else 1 - (-2*x + 2)**3 / 2
    if name == "out": return 1 - (1 - x)**3
    return x
def cam_at(t):
    if t <= cam[0][0]: k = 0
    k = max(i for i in range(len(cam)) if cam[i][0] <= t) if t >= cam[0][0] else 0
    if k + 1 >= len(cam) or cam[k + 1][3] == "cut": return cam[k][1], cam[k][2]
    (ta, sa, ya, _), (tb, sb, yb, e) = cam[k], cam[k + 1]
    x = ease_fn(e, min(1, max(0, (t - ta) / (tb - ta))))
    return sa + (sb - sa) * x, ya + (yb - ya) * x
cam_frames = []
for f in range(total):
    t = f / FPS
    sc, y0 = cam_at(min(t, closing["t0"] + 0.4))
    x0 = (1080 - 1080 / sc) / 2
    assert y0 >= -EXT and y0 + 1920 / sc <= WM_TOP, (f, sc, y0)
    cam_frames.append([round(sc, 5), round(x0, 2), round(y0, 2)])

# fonte por quadro de saída (-1 = encerramento sem vídeo)
src_frames = []
for f in range(total):
    seg = next((s for s in segs if s["out_start"] <= f < s["out_start"] + s["n"]), None)
    src_frames.append(seg["in"] + (f - seg["out_start"]) if seg else -1)

# ---- efeitos sonoros (tempo de saída) ----
sfx = [
    ("whoosh", 0.02, 0.6), ("hit", 0.0, 0.35),
    ("whoosh", S["H"]["t1"] - 0.18, 0.9),
    ("pop", cues["lower_third_in"], 0.8), ("tick", cues["lower_third_uefs"], 0.6),
    ("pop", cues["cred_1"] + 0.05, 0.6), ("tick", cues["cred_2"], 0.55), ("tick", cues["cred_3"], 0.55),
    ("whoosh", B["t0"] - 0.05, 0.5),
    ("tick", cues["first_tag"], 0.35), ("tick", cues["w_imersao"], 0.35), ("tick", cues["w_tecnologica"], 0.35),
    ("tick", cues["w_contabil"], 0.3), ("impact", cues["itcont"] - 0.04, 0.42),
    ("pop", cues["date_21"], 0.6), ("tick", cues["date_22"], 0.5),
    ("pop", cues["time_in"], 0.55), ("pop", cues["venue_in"], 0.55), ("pop", cues["link_in"] + 0.24, 0.5),
    ("whoosh", cues["cards_out"], 0.45),
    ("whoosh", cues["closing_wipe"] + 0.05, 0.7), ("impact", closing["t0"] + 0.12, 0.6),
]

T = {"fps": FPS, "total_frames": total, "duration": total / FPS, "segments": segs, "closing": closing,
     "captions": caps, "words": words_out, "cues": cues, "camera": cam, "cam_frames": cam_frames, "src_frames": src_frames, "ext": EXT, "sfx": sfx,
     "event": E["event"], "presenter": E["presenter"], "highlight": E["highlight"],
     "show_unspoken_info": E["show_unspoken_info"]}
json.dump(T, open(f"{out_dir}/timeline.json", "w"), ensure_ascii=False, indent=1)

def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
def wrap(text, n=30):
    if len(text) <= n: return text
    best = None
    for i, ch in enumerate(text):
        if ch == " ":
            a, b = text[:i], text[i + 1:]
            score = max(len(a), len(b))
            if best is None or score < best[0]: best = (score, a + "\n" + b)
    return best[1]
with open(f"{out_dir}/legendas_ITCONT.srt", "w", encoding="utf-8") as f:
    for k, c in enumerate(caps, 1):
        f.write(f"{k}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{wrap(c['text'])}\n\n")
print(f"total {total} frames = {total/FPS:.2f}s")
for s in segs: print(f"  {s['id']}: src {s['src0']:.3f}-{s['src1']:.3f} -> out {s['t0']:.3f}-{s['t1']:.3f}  {s['label']}")
print("  closing:", closing)
print("cues:", cues)
