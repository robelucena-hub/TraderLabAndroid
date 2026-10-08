"""Decodifica o vídeo com o tratamento de cor e gera (1) quadros tratados em PNG e
(2) máscara alfa do apresentador com RobustVideoMatting (ONNX, recorrente/temporal)."""
import sys, os, subprocess, time
import numpy as np, onnxruntime as ort, cv2

src, model, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
limit = int(sys.argv[4]) if len(sys.argv) > 4 else 10**9
GRADE = os.environ.get("GRADE") or ("setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv,"
         "scale=in_color_matrix=bt709:out_color_matrix=bt709,format=rgb24,"
         "eq=contrast=1.04:saturation=1.08:gamma=0.98,"
         "colorbalance=rs=-0.02:bs=0.02:rh=-0.03:bh=0.03,unsharp=5:5:0.35:5:5:0")
W, H = 1080, 1920
os.makedirs(f"{out_dir}/rgb", exist_ok=True); os.makedirs(f"{out_dir}/alpha", exist_ok=True); os.makedirs(f"{out_dir}/fgr", exist_ok=True)
p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", GRADE, "-f", "rawvideo",
                      "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
rec = [np.zeros([1, 1, 1, 1], np.float32)] * 4
dr = np.array([0.25], np.float32)
def run(fr, rec):
    x = (fr.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
    fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2],
                                      "r4i": rec[3], "downsample_ratio": dr})
    return fgr, pha, rec

# Aquecimento: os primeiros 40 quadros preparam o estado recorrente antes do quadro 0
frames = []
for _ in range(40):
    frames.append(np.frombuffer(p.stdout.read(W * H * 3), np.uint8).reshape(H, W, 3))
for fr in frames: _, _, rec = run(fr, rec)
i = 0; t0 = time.time()
while i < limit:
    if frames: fr = frames.pop(0)
    else:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    cv2.imwrite(f"{out_dir}/rgb/{i:05d}.png", fr[:, :, ::-1], [cv2.IMWRITE_PNG_COMPRESSION, 1])
    fgr, pha, rec = run(fr, rec)
    f = (np.clip(fgr[0].transpose(1, 2, 0), 0, 1) * 255 + 0.5).astype(np.uint8)
    cv2.imwrite(f"{out_dir}/fgr/{i:05d}.jpg", f[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, 95])
    a = (np.clip(pha[0, 0], 0, 1) * 255 + 0.5).astype(np.uint8)
    cv2.imwrite(f"{out_dir}/alpha/{i:05d}.png", a, [cv2.IMWRITE_PNG_COMPRESSION, 1])
    i += 1
    if i % 50 == 0: print(i, f"{(time.time()-t0)/i:.2f}s/frame", flush=True)
print("done", i, f"{time.time()-t0:.1f}s")
