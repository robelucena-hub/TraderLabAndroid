"""Gera timeline.json (tempos de saída) e legendas .srt a partir de edit.json.

edit.json define: segmentos (EDL em quadros da fonte), palavras com tempos da fonte, legendas,
deixas gráficas (tempos da fonte), câmera (tempos da fonte por segmento) e efeitos sonoros.
"""
import json, sys, os

proj = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.environ.get("EDIT_JSON", f"{proj}/edit.json")))
FPS = E["fps"]
out_dir = sys.argv[1] if len(sys.argv) > 1 else proj
EXT = E.get("ext", 0)                 # parede sintetizada acima do quadro (0 = desativado)
WM_TOP = E.get("watermark_top", 1836)  # primeira linha da marca d'água: nunca entra no quadro

segs, cur = [], 0
for s in E["segments"]:
    n = s["out"] - s["in"]
    segs.append({**s, "out_start": cur, "n": n, "t0": cur / FPS, "t1": (cur + n) / FPS,
                 "src0": s["in"] / FPS, "src1": s["out"] / FPS})
    cur += n
closing = {"start": cur, "n": E["closing_frames"], "t0": cur / FPS, "t1": (cur + E["closing_frames"]) / FPS}
total = cur + E["closing_frames"]
S = {s["id"]: s for s in segs}
BODY = [s for s in segs if not s.get("hook")]

def s2o(t, seg_id=None):
    cands = [S[seg_id]] if seg_id else BODY
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
    t0c = S[c["seg"]]["t0"] if c.get("start_at_segment") else ws[0]["t0"] - 0.06
    caps.append({"seg": c["seg"], "text": c["text"], "words": ws, "t0": t0c, "t1": ws[-1]["t1"] + 0.25,
                 **({"joined_prev": True} if c.get("start_at_segment") else {}),
                 **({"hide": True} if c.get("hide") else {})})   # hide: só no .srt (na tela vira tipografia cinética)
    words_out += ws
for k, c in enumerate(caps):
    end = S[c["seg"]]["t1"] - 0.02 if c.get("clip_to_segment", True) else c["t1"]
    c["t1"] = min(c["t1"], end + (E.get("caption_tail_after_segment", {}).get(c["seg"], 0)))
    if k + 1 < len(caps): c["t1"] = min(c["t1"], caps[k + 1]["t0"] - 0.02)
    c["t0"], c["t1"] = round(max(c["t0"], S[c["seg"]]["t0"]), 3), round(c["t1"], 3)

# ---- deixas: tempo da fonte -> saída (cues_seg força o segmento, p.ex. o gancho) ----
cues = {}
_cw = E["cues_src"].get("closing_wipe")
for k, v in E["cues_src"].items():
    if k.startswith("_"): continue
    cues[k] = round(s2o(v, E.get("cues_seg", {}).get(k)), 3)
cues["closing"] = closing["t0"]
if _cw is not None:   # nenhuma legenda passa da cortina do encerramento
    for c in caps: c["t1"] = round(min(c["t1"], cues["closing_wipe"] + 0.3), 3)
    # a última legenda fica até a cortina do encerramento passar sobre ela
    caps[-1]["t1"] = round(max(caps[-1]["t1"], min(cues["closing_wipe"] + 0.36, S[caps[-1]["seg"]]["t1"] + 0.25)), 3)
# legendas consecutivas com intervalo curto ficam contíguas (a caixa não "pisca" entre frases)
for k in range(len(caps) - 1):
    a_, b_ = caps[k], caps[k + 1]
    if a_["seg"] == b_["seg"] and b_["t0"] - a_["t1"] < 0.45 and not a_.get("hide") and not b_.get("hide"):
        a_["t1"] = b_["t0"]; a_["joined_next"] = True; b_["joined_prev"] = True
for s in segs: cues[f"seg_{s['id']}_t0"], cues[f"seg_{s['id']}_t1"] = s["t0"], s["t1"]

# ---- câmera ----
cam = []
for seg_id, t_src, sc, y0, ease in E["camera_src"]:
    t = S[seg_id]["t0"] if t_src == "start" else (S[seg_id]["t1"] - 0.001 if t_src == "end" else s2o(t_src, seg_id))
    cam.append((round(t, 4), sc, y0, ease))
cam.sort(key=lambda c: c[0])
def ease_fn(name, x):
    if name == "ease": return 4*x**3 if x < .5 else 1 - (-2*x + 2)**3 / 2
    if name == "out": return 1 - (1 - x)**3
    return x
def cam_at(t):
    k = max([i for i in range(len(cam)) if cam[i][0] <= t] or [0])
    if k + 1 >= len(cam) or cam[k + 1][3] == "cut": return cam[k][1], cam[k][2]
    (ta, sa, ya, _), (tb, sb, yb, e) = cam[k], cam[k + 1]
    x = ease_fn(e, min(1, max(0, (t - ta) / (tb - ta))))
    return sa + (sb - sa) * x, ya + (yb - ya) * x
cam_frames = []
for f in range(total):
    sc, y0 = cam_at(min(f / FPS, closing["t0"] + 0.4))
    x0 = (1080 - 1080 / sc) / 2
    assert y0 >= -EXT - 1e-6 and y0 + 1920 / sc <= WM_TOP + 1e-6, (f, sc, y0)
    cam_frames.append([round(sc, 5), round(x0, 2), round(y0, 2)])

src_frames = []
for f in range(total):
    seg = next((s for s in segs if s["out_start"] <= f < s["out_start"] + s["n"]), None)
    src_frames.append(seg["in"] + (f - seg["out_start"]) if seg else -1)

sfx = []
for kind, ref, g, *off in E["sfx"]:
    t = cues[ref] if isinstance(ref, str) else ref
    sfx.append((kind, round(t + (off[0] if off else 0), 3), g))

T = {"fps": FPS, "total_frames": total, "duration": total / FPS, "segments": segs, "closing": closing,
     "captions": caps, "words": words_out, "cues": cues, "camera": cam, "cam_frames": cam_frames,
     "src_frames": src_frames, "ext": EXT, "sfx": sfx, "event": E["event"], "presenter": E["presenter"],
     "highlight": E["highlight"], "show_unspoken_info": E.get("show_unspoken_info", True),
     "voice_extend_s": E.get("voice_extend_s", 0), "caption_anchor_src_y": E.get("caption_anchor_src_y"),
     "caption_y": E.get("caption_y")}
json.dump(T, open(f"{out_dir}/timeline.json", "w"), ensure_ascii=False, indent=1)

def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
def wrap(text, n=30):
    if "\n" in text or len(text) <= n: return text   # quebra explícita no edit.json
    best = None
    for i, ch in enumerate(text):
        if ch == " ":
            a, b = text[:i], text[i + 1:]
            score = max(len(a), len(b)) - (8 if a.endswith(",") and len(b) <= n else 0)   # prefere quebrar após vírgula
            if best is None or score < best[0]: best = (score, a + "\n" + b)
    return best[1]
with open(f"{out_dir}/{E.get('srt_name', 'legendas.srt')}", "w", encoding="utf-8") as f:
    for k, c in enumerate(caps, 1):
        t1_srt = min(c["t1"], c["words"][-1]["t1"] + 0.25, cues.get("closing_wipe", 1e9)) if k == len(caps) else c["t1"]   # SRT termina com a fala, antes do encerramento
        f.write(f"{k}\n{ts(c['t0'])} --> {ts(t1_srt)}\n{wrap(c['text'])}\n\n")
print(f"total {total} quadros = {total/FPS:.2f}s")
for s in segs: print(f"  {s['id']}: fonte {s['src0']:.3f}-{s['src1']:.3f} -> saída {s['t0']:.3f}-{s['t1']:.3f}  {s.get('label','')}")
print("  encerramento:", closing)
print("deixas:", cues)
