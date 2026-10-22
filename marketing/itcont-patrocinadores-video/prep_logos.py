"""Prepara os logos dos patrocinadores para o vídeo.

Para cada logo: detecta a cor de fundo original, recorta a área útil e
posiciona o logo num "tile" padronizado (1140 x 930 px) preenchido com a
mesma cor de fundo. O tamanho é normalizado por área, para que logos
horizontais e quadrados tenham peso visual parecido. Cores e proporções
dos logos não são alteradas.

Uso: python3 prep_logos.py   (gera assets/sponsors/tiles/*.png e sponsors.js)
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).parent
SRC = HERE / "assets/sponsors/originais"
OUT = HERE / "assets/sponsors/tiles"
TILE_W, TILE_H = 1140, 930          # 1,5x o card do vídeo (760 x 620)
MAX_W, MAX_H = 0.80 * TILE_W, 0.70 * TILE_H
TARGET_AREA = 360_000               # área-alvo do logo dentro do tile

# ordem = ordem de exibição no vídeo
SPONSORS = [
    ("Acrylic", "01-acrylic.webp", {}),
    ("FR Contabilidade", "02-fr-contabilidade.png", {}),
    ("SAM Consultoria e Assessoria Contábil", "03-sam.png", {}),
    ("Evolução Contabilidade", "04-evolucao.webp", {"inset": 24, "bg": (255, 255, 255)}),
    ("Gomes & Souza Imobiliária", "05-gomes-souza.pdf", {}),
    ("Contas Contabilidade", "06-contas.jpg", {}),
    ("Alfa Contabilidade", "07-alfa.jpg", {}),
    ("Ninho Hortifruti", "08-ninho-hortifruti.jpg", {}),
    ("Balanço Contabilidade", "09-balanco.jpg", {"boost": 1.22}),
    ("Controller Inteligência Empresarial", "10-controller.webp", {}),
    ("Somar Assessoria & Contabilidade", "11-somar.jpg", {}),
]


def load(path: Path) -> Image.Image:
    if path.suffix == ".pdf":
        png = path.with_suffix(".png")
        if not png.exists():
            subprocess.run(["pdftoppm", "-png", "-r", "200", "-singlefile", str(path), str(png.with_suffix(""))],
                           check=True, capture_output=True)
        path = png
    return Image.open(path).convert("RGBA")


def border_color(a: np.ndarray) -> np.ndarray:
    b = np.concatenate([a[:6].reshape(-1, 4), a[-6:].reshape(-1, 4), a[:, :6].reshape(-1, 4), a[:, -6:].reshape(-1, 4)])
    return np.median(b, axis=0)


def content_bbox(a: np.ndarray, bg: np.ndarray, transparent: bool):
    if transparent:
        mask = a[..., 3] > 24
    else:
        mask = np.abs(a[..., :3].astype(int) - bg[:3].astype(int)).max(axis=2) > 34
    rows = np.where(mask.sum(1) >= 3)[0]
    cols = np.where(mask.sum(0) >= 3)[0]
    return cols.min(), rows.min(), cols.max() + 1, rows.max() + 1


def build(name, file, opts):
    im = load(SRC / file)
    if "inset" in opts:                                  # remove moldura da imagem original
        k = opts["inset"]
        im = im.crop((k, k, im.width - k, im.height - k))
    a = np.array(im)
    transparent = a[..., 3].min() < 250
    bg = np.array(opts.get("bg", (255, 255, 255) if transparent else tuple(border_color(a)[:3])) + (255,))
    bg = bg[:4] if len(bg) > 4 else bg
    x0, y0, x1, y1 = content_bbox(a, bg, transparent)
    pad = int(0.03 * max(x1 - x0, y1 - y0))
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    logo = im.crop((x0, y0, x1, y1))

    w, h = logo.size
    boost = opts.get("boost", 1.0)                       # ajuste óptico pontual (ex.: selos circulares)
    s = min(MAX_W / w, MAX_H * min(boost, 1.17) / h, (TARGET_AREA * boost / (w * h)) ** 0.5)
    nw, nh = round(w * s), round(h * s)
    logo = logo.resize((nw, nh), Image.LANCZOS)

    fill = tuple(int(c) for c in bg[:3])
    tile = Image.new("RGBA", (TILE_W, TILE_H), fill + (255,))
    if not transparent:
        # borda suave para o recorte se fundir ao preenchimento sem emenda
        feather = Image.new("L", (nw, nh), 0)
        m = max(4, min(nw, nh) // 40)
        feather.paste(255, (m, m, nw - m, nh - m))
        feather = feather.filter(ImageFilter.GaussianBlur(m / 2))
        logo.putalpha(feather)
    tile.alpha_composite(logo, ((TILE_W - nw) // 2, (TILE_H - nh) // 2))
    return tile.convert("RGB"), fill, (nw, nh)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, file, opts in SPONSORS:
        tile, fill, size = build(name, file, opts)
        out = OUT / (Path(file).stem + ".png")
        tile.save(out, optimize=True)
        lum = 0.2126 * fill[0] + 0.7152 * fill[1] + 0.0722 * fill[2]
        manifest.append({"name": name, "tile": f"assets/sponsors/tiles/{out.name}",
                         "bg": "#%02x%02x%02x" % fill, "dark": lum < 140})
        print(f"{out.name:28s} bg={manifest[-1]['bg']} logo={size}")
    (HERE / "sponsors.js").write_text(
        "// Gerado por prep_logos.py — ordem de exibição dos patrocinadores\n"
        "window.SPONSORS = " + json.dumps(manifest, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
