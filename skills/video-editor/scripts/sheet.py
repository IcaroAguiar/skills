"""Prancha numerada para revisar material ou cada corte de um render.

Uso: sheet.py images <pasta_ou_lista.json> <saida.jpg>      miniaturas numeradas (respeita EXIF)
     sheet.py segments <video.mp4> <segs.json> <saida.jpg>   quadro do meio de cada corte (segs.json vem de montage.py --dump)
"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageOps, ImageDraw, ImageFont
F = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 28)
def grid(ims, out, cols=9, tw=216, th=384):
    for p in range(0, len(ims), cols * 3):
        S = Image.new('RGB', (cols * tw, th * 3)); d = ImageDraw.Draw(S)
        for k, (lab, im) in enumerate(ims[p:p + cols * 3]):
            im.thumbnail((tw, th)); x, y = (k % cols) * tw, (k // cols) * th
            S.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
            d.text((x + 6, y + 4), str(lab), fill='yellow', font=F, stroke_width=2, stroke_fill='black')
        o = out if p == 0 else out.replace('.jpg', f'_{p // (cols * 3)}.jpg'); S.save(o, quality=80); print(o)
mode = sys.argv[1]
if mode == 'images':
    src = sys.argv[2]
    fs = json.load(open(src)) if src.endswith('.json') else sorted(os.path.join(src, f) for f in os.listdir(src) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.heic')))
    def thumb(f):
        im = Image.open(f); im.draft('RGB', (432, 768)); im = ImageOps.exif_transpose(im).convert('RGB'); im.thumbnail((216, 384)); return im
    grid([(i, thumb(f)) for i, f in enumerate(fs)], sys.argv[3])
else:
    v, segs, out = sys.argv[2:5]; tmp = tempfile.mkdtemp(); ims = []
    for g in json.load(open(segs)):
        f = f"{tmp}/{g['i']:03d}.jpg"
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str((g['t0'] + g['t1']) / 2), '-i', v, '-frames:v', '1', '-vf', 'scale=216:384', f], check=True)
        ims.append((g['i'], Image.open(f)))
    grid(ims, out)
