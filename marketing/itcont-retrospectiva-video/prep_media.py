"""Prepara fotos e trechos de vídeo do evento para a animação.

- Fotos: corrige orientação, recorta (ex.: remove a marca "Galaxy S23 FE") e
  salva em JPEG em media/fotos/.
- Vídeos: extrai o trecho escolhido como sequência de quadros JPEG a 30 fps
  em media/quadros/<id>/ (o navegador não decodifica HEVC/.MOV, e quadros
  avulsos garantem renderização exata quadro a quadro).
- Gera media/manifest.js, lido pelo index.html.

Uso: python3 prep_media.py   (HEIC exige o pacote pillow-heif)
"""
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

HERE = Path(__file__).parent
ORIG = HERE / "media/originais"
FOTOS = HERE / "media/fotos"
QUADROS = HERE / "media/quadros"
FPS = 30
LONG_SIDE = 1800          # fotos
CLIP_W = 760              # largura dos quadros de vídeo (vertical)

# id: (arquivo, recorte (x0, y0, x1, y1) em px do original orientado ou None)
PHOTOS = {
    "palco-dupla":    ("foto-palco-dupla.heic", None),
    "palco-mesa":     ("foto-palco-mesa.heic", None),
    "mesa-projecao":  ("foto-mesa-projecao.jpg", (0, 0, 1600, 1050)),      # sem a marca d'água
    "grupo-backdrop": ("foto-grupo-backdrop.jpg", (0, 0, 1600, 1050)),     # sem a marca d'água
    "trio":           ("foto-trio.jpg", None),
    "crcba-jovem":    ("foto-crcba-jovem.jpg", (0, 250, 1200, 1250)),      # menos chão de palco
}

# id: (arquivo, início em s, duração em s[, filtro extra do ffmpeg])
CLIPS = {
    "host-palco":      ("video-host-palco.mov", 0.2, 4.4),
    "dupla-mic":       ("video-palco-plateia.mp4", 1.8, 3.6),
    "palestrante":     ("video-palco-plateia.mp4", 22.4, 3.6),
    "auditorio":       ("video-auditorio.mov", 0.0, 2.5, "eq=gamma=1.45:contrast=1.06:saturation=1.12"),  # luzes baixas: clareia
    "plateia-lateral": ("video-plateia-lateral.mp4", 0.0, 3.9),
    "aplausos":        ("video-aplausos.mp4", 0.0, 1.6),
    "bracos-ao-alto":  ("video-palco-plateia.mp4", 13.4, 3.7),
    "plateia-em-pe":   ("video-palco-plateia.mp4", 27.8, 4.0),
}


def prep_photo(pid, file, crop):
    im = ImageOps.exif_transpose(Image.open(ORIG / file)).convert("RGB")
    if crop:
        im = im.crop(crop)
    s = min(1.0, LONG_SIDE / max(im.size))
    if s < 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    out = FOTOS / f"{pid}.jpg"
    im.save(out, quality=90, optimize=True)
    return {"id": pid, "type": "photo", "src": f"media/fotos/{pid}.jpg", "w": im.width, "h": im.height}


def prep_clip(cid, file, start, dur, extra=None):
    d = QUADROS / cid
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", str(ORIG / file),
                    "-vf", f"fps={FPS},scale={CLIP_W}:-2:flags=lanczos" + (f",{extra}" if extra else ""), "-q:v", "3", str(d / "%04d.jpg")], check=True)
    frames = sorted(d.glob("*.jpg"))
    w, h = Image.open(frames[0]).size
    return {"id": cid, "type": "video", "dir": f"media/quadros/{cid}", "frames": len(frames), "fps": FPS, "w": w, "h": h}


def main():
    FOTOS.mkdir(parents=True, exist_ok=True)
    QUADROS.mkdir(parents=True, exist_ok=True)
    media = {}
    for pid, (f, crop) in PHOTOS.items():
        media[pid] = prep_photo(pid, f, crop)
        print("foto ", pid, media[pid]["w"], "x", media[pid]["h"])
    for cid, spec in CLIPS.items():
        media[cid] = prep_clip(cid, *spec)
        print("vídeo", cid, media[cid]["w"], "x", media[cid]["h"], media[cid]["frames"], "quadros")
    (HERE / "media/manifest.js").write_text(
        "// Gerado por prep_media.py\nwindow.MEDIA = " + json.dumps(media, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
