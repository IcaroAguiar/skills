"""Montagem vertical na batida: parallax 3D, velocity, zoom-blur/whip/RGB split, letra cinética, contador e cartão final.

Uso: montage.py <edit.json> <saida.mp4> [--preview]   (sempre grava <workdir>/segs.json para sheet.py)   (formato do edit.json: references/edit-json.md)
"""
import json, os, sys, subprocess, math, glob, hashlib
import numpy as np, cv2
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from seg import mask as person_mask

CFG = json.load(open(sys.argv[1])); OUT = sys.argv[2]; PREVIEW = '--preview' in sys.argv
S = CFG['workdir']; os.makedirs(S, exist_ok=True)
W, H, FPS = (540, 960, 30) if PREVIEW else (1080, 1920, 30)
K = W / 1080
A0, AEND = CFG['audio']['start'], CFG['audio']['end']
TAIL = CFG.get('tail', 3.4)
TOTAL = AEND - A0 + TAIL
SUP = '/System/Library/Fonts/Supplemental/'
DIDOT = SUP + 'Didot.ttc'; AVENIR = '/System/Library/Fonts/Avenir Next.ttc'
CACHE = f'{S}/cache{W}'; os.makedirs(CACHE, exist_ok=True)

beats_abs = json.load(open(CFG['beats']))['beats']
B = [0.0] + [b - A0 for b in beats_abs if 0.05 < b - A0 <= AEND - A0 + TAIL]
def snap(abs_t): return min(B, key=lambda b: abs(b - (abs_t - A0)))
def rel(abs_t): return abs_t - A0

words = [(a - A0, b - A0, w) for a, b, w in json.load(open(CFG['words']))] if CFG.get('words') else []

# ------------------------------------------------------------------ mídia
photos = CFG['photos']                 # em ordem cronológica
clips = CFG.get('clips', [])           # [{file, start, dur}] em ordem cronológica

def _ident(path, *params):
    """chave de cache: caminho absoluto, data de modificação e parâmetros de extração."""
    st = os.stat(path)
    h = hashlib.sha1(repr((os.path.abspath(path), st.st_mtime_ns, st.st_size) + params).encode()).hexdigest()[:12]
    return f'{os.path.splitext(os.path.basename(path))[0]}_{h}'

def cover(im, cx=None, cy=None, Z=1.0):
    tw, th = int(W * Z), int(H * Z)
    s = max(tw / im.width, th / im.height)
    im = im.resize((max(tw, round(im.width * s)), max(th, round(im.height * s))), Image.LANCZOS)
    cx = im.width / 2 if cx is None else cx * s; cy = im.height / 2 if cy is None else cy * s
    l = int(np.clip(cx - tw / 2, 0, im.width - tw)); t = int(np.clip(cy - th / 2.3, 0, im.height - th))
    return im.crop((l, t, l + tw, t + th)), (l, t, s)

def grade_np(a):
    a = a.astype(np.float32)
    a = (a - 128) * 1.07 + 128
    a[..., 0] *= 1.035; a[..., 2] *= 0.95
    lum = a.mean(-1, keepdims=True)
    a = lum + (a - lum) * 1.06
    sh = np.clip(1 - lum / 90, 0, 1)                  # sombras levemente azuladas, tipo filme
    a[..., 2:3] += 6 * sh; a[..., 0:1] -= 3 * sh
    return np.clip(a, 0, 255)

def fit_photo(im, key):
    """foto larga demais para 9:16: inteira sobre fundo desfocado, sem cortar ninguém."""
    TW, TH = int(W * Z3), int(H * Z3)
    bgim, _ = cover(im, None, None, Z3)
    bg = cv2.GaussianBlur(grade_np(np.asarray(bgim)), (0, 0), 38 * K) * 0.55
    cw = int(W * 0.94); ch = int(im.height * cw / im.width)
    card = grade_np(np.asarray(im.resize((cw, ch), Image.LANCZOS)))
    x = (TW - cw) // 2; y = int(TH * 0.46 - ch / 2)
    sh = np.zeros((TH, TW), np.float32); sh[y + int(14 * K):y + ch + int(14 * K), x:x + cw] = 1
    bg = bg * (1 - 0.55 * cv2.GaussianBlur(sh, (0, 0), 22 * K)[..., None])
    fg = np.zeros((TH, TW, 4), np.float32); fg[y:y + ch, x:x + cw, :3] = card; fg[y:y + ch, x:x + cw, 3] = 255
    np.save(key + '.bg.npy', bg.astype(np.float32)); Image.fromarray(fg.astype(np.uint8)).save(key + '.fg.png')
    return bg, fg

Z3 = 1.18
def prep_photo(path):
    key = f'{CACHE}/{_ident(path)}'
    if os.path.exists(key + '.fg.png'):
        return np.load(key + '.bg.npy'), np.asarray(Image.open(key + '.fg.png')).astype(np.float32)
    im, m = person_mask(path)
    ma = np.asarray(m).astype(np.float32) / 255
    ys, xs = np.nonzero(ma > 0.5)
    if len(xs) > 50:
        cx, cy = xs.mean(), np.percentile(ys, 25)
    else:
        cx, cy = im.width / 2, im.height * 0.42
    nlab, lab, st, _ = cv2.connectedComponentsWithStats((ma > 0.5).astype(np.uint8))
    big = max([st[j, 4] for j in range(1, nlab)] or [1])
    comps = [i for i in range(1, nlab) if st[i, 4] >= 0.15 * big]
    need = 0
    if comps:
        x0 = min(st[i, 0] for i in comps); x1 = max(st[i, 0] + st[i, 2] for i in comps)
        cx = (x0 + x1) / 2; need = x1 - x0
    if im.width / im.height > 0.85 and need > 0.9 * min(im.width, im.height * W / H):
        return fit_photo(im, key)
    rgb, (l, t, s) = cover(im, cx, cy, Z3)
    mm = m.resize((round(im.width * s), round(im.height * s)), Image.BILINEAR).crop((l, t, l + rgb.width, t + rgb.height))
    a = grade_np(np.asarray(rgb)); mk = np.asarray(mm).astype(np.float32) / 255
    # fundo: remove a pessoa (inpaint em baixa resolução) para o parallax não duplicar contorno
    small = cv2.resize(a.astype(np.uint8), None, fx=0.25, fy=0.25)
    hole = cv2.dilate((cv2.resize(mk, (small.shape[1], small.shape[0])) > 0.3).astype(np.uint8), np.ones((9, 9), np.uint8))
    filled = cv2.inpaint(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), hole, 7, cv2.INPAINT_TELEA)
    filled = cv2.resize(cv2.cvtColor(filled, cv2.COLOR_BGR2RGB), (a.shape[1], a.shape[0]), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    hb = cv2.GaussianBlur(cv2.resize(hole.astype(np.float32), (a.shape[1], a.shape[0])), (0, 0), 6 * K)[..., None]
    bg = a * (1 - hb) + filled * hb
    bg = cv2.GaussianBlur(bg, (0, 0), 1.6 * K)          # profundidade de campo
    mk = cv2.GaussianBlur(mk, (0, 0), 1.0)
    fg = np.dstack([a, mk * 255])
    np.save(key + '.bg.npy', bg.astype(np.float32)); Image.fromarray(fg.astype(np.uint8)).save(key + '.fg.png')
    return bg, fg

def zoom_crop(a, z, dx=0.0, dy=0.0):
    """recorta a (maior que W×H) com zoom z>=1 em relação ao enquadramento base."""
    h0, w0 = a.shape[:2]
    cw, ch = w0 / Z3 / z * (Z3 if a.shape[1] > W * 1.05 else 1), h0 / Z3 / z * (Z3 if a.shape[0] > H * 1.05 else 1)
    cw, ch = min(cw, w0), min(ch, h0)
    x = np.clip((w0 - cw) / 2 + dx * W, 0, w0 - cw); y = np.clip((h0 - ch) / 2 + dy * H, 0, h0 - ch)
    M = np.array([[W / cw, 0, -x * W / cw], [0, H / ch, -y * H / ch]], np.float32)
    return cv2.warpAffine(a, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def photo3d(path, p, push=1.0, drift=0.0):
    bg, fg = prep_photo(path)
    e = 1 - (1 - p) ** 2
    zb = 1.0 + 0.035 * e * push; zf = 1.0 + 0.11 * e * push
    b = zoom_crop(bg, zb, drift * e * 0.6)
    f = zoom_crop(fg, zf, drift * e, -0.012 * e)
    al = f[..., 3:4] / 255
    return b * (1 - al) + f[..., :3] * al

def flat(path, p):
    bg, fg = prep_photo(path)
    al = fg[..., 3:4] / 255
    a = bg * (1 - al) + fg[..., :3] * al
    return zoom_crop(a, 1 + 0.05 * p)

# ---- vídeos: extrai quadros já recortados para 9:16
def clip_frames(c):
    d = f"{CACHE}/clip_{_ident(c['file'], c['start'], c['dur'])}"
    if not os.path.isdir(d):
        part = d + '.part'; os.makedirs(part, exist_ok=True)
        tmpf = part + '/probe.png'
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(c['start']), '-i', c['file'], '-frames:v', '1', tmpf], check=True)
        pw, ph = Image.open(tmpf).size; os.remove(tmpf)
        if pw / ph > 0.8:
            fc = (f"[0:v]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma={int(40*K)},eq=brightness=-0.12[bg];"
                  f"[b]scale={int(W*0.94)//2*2}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)*0.46,fps=60")
        else:
            fc = f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps=60"
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(c['start']), '-t', str(c['dur']), '-i', c['file'],
                        '-filter_complex', fc, '-q:v', '2', f'{part}/%04d.jpg'], check=True)
        os.rename(part, d)          # só vira cache depois de extraído por inteiro
    return sorted(glob.glob(f'{d}/*.jpg'))
_fc = {}
def video(c, p, mode):
    k = (c['file'], c['start'], c['dur'])
    fs = _fc.get(k) or clip_frames(c); _fc[k] = fs
    if mode == 'velocity':       # lento → rápido → lento (speed ramp)
        q = p - math.sin(2 * math.pi * p) / (2 * math.pi) * 0.9
    elif mode == 'slow':
        q = p * 0.55
    else:
        q = p
    i = min(len(fs) - 1, int(q * (len(fs) - 1)))
    a = cv2.cvtColor(cv2.imread(fs[i]), cv2.COLOR_BGR2RGB)
    return grade_np(a)

# ------------------------------------------------------------------ efeitos
yy, xx = np.mgrid[0:H, 0:W]
R = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2).astype(np.float32)
VIG = (1 - 0.42 * np.clip(R - 0.5, 0, 1) ** 1.5)[..., None]
rng = np.random.default_rng(3)
GRAIN = [rng.normal(0, 6, (H // 2, W // 2, 1)).astype(np.float32).repeat(2, 0).repeat(2, 1) for _ in range(8)]

def zoom_blur(a, amt):
    if amt < 0.02: return a
    acc = np.zeros_like(a); n = 6
    for k in range(n):
        z = 1 + amt * 0.16 * k / (n - 1)
        M = cv2.getRotationMatrix2D((W / 2, H / 2), 0, z)
        acc += cv2.warpAffine(a, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return acc / n

def whip(a, amt, direction):
    if amt < 0.02: return a
    k = max(3, int(140 * K * amt)) | 1
    M = np.float32([[1, 0, direction * amt * W * 0.35], [0, 1, 0]])
    a = cv2.warpAffine(a, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    return cv2.blur(a, (k, 1))

def rgb_split(a, amt):
    if amt < 0.02: return a
    d = int(18 * K * amt) + 1
    out = a.copy()
    out[..., 0] = np.roll(a[..., 0], d, 1); out[..., 2] = np.roll(a[..., 2], -d, 1)
    return out

def shake(a, amt, seed):
    if amt < 0.02: return a
    r = np.random.default_rng(seed)
    M = cv2.getRotationMatrix2D((W / 2, H / 2), r.uniform(-1.2, 1.2) * amt, 1 + 0.03 * amt)
    M[:, 2] += r.uniform(-14, 14, 2) * K * amt
    return cv2.warpAffine(a, M, (W, H), borderMode=cv2.BORDER_REFLECT)

def light_leak(t, strength):
    if strength < 0.02: return 0
    cx = W * (0.15 + 0.7 * (0.5 + 0.5 * math.sin(t * 0.7)))
    cy = H * (0.2 + 0.25 * math.sin(t * 0.43 + 1))
    d = np.sqrt(((xx - cx) / (W * 0.55)) ** 2 + ((yy - cy) / (H * 0.4)) ** 2)
    g = np.exp(-d ** 2 * 2.2)[..., None]
    return g * np.array([255, 150, 70], np.float32) * strength

# ------------------------------------------------------------------ texto
def F(path, size, idx=0): return ImageFont.truetype(path, max(8, int(size * K)), index=idx)
ITAL = lambda s: F(DIDOT, s, 1); ROM = lambda s: F(DIDOT, s, 0); CAP = lambda s: F(AVENIR, s, 5)
_tc = {}
def word_img(txt, font):
    key = (txt, font.path, font.size, font.index if hasattr(font, 'index') else 0)
    if key in _tc: return _tc[key]
    tw = int(font.getlength(txt)) + int(40 * K); th = int(font.size * 1.6)
    L = Image.new('RGBA', (tw, th)); d = ImageDraw.Draw(L)
    d.text((int(20 * K), int(font.size * 0.15)), txt, font=font, fill=(255, 248, 238, 255))
    sh = Image.new('RGBA', (tw, th)); ds = ImageDraw.Draw(sh)
    ds.text((int(20 * K), int(font.size * 0.15) + 3), txt, font=font, fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(9 * K))
    out = np.asarray(Image.alpha_composite(sh, L)).astype(np.float32)
    _tc[key] = out; return out

def blit(frame, rgba, x, y, alpha):
    h, w = rgba.shape[:2]; x, y = int(x), int(y)
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0 or alpha <= 0: return
    s = rgba[y0 - y:y1 - y, x0 - x:x1 - x]
    a = s[..., 3:4] / 255 * alpha
    frame[y0:y1, x0:x1] = frame[y0:y1, x0:x1] * (1 - a) + s[..., :3] * a

def kinetic_line(frame, t, items, font, yrel, t_out):
    """items: [(t_inicio, palavra)]; cada palavra sobe e aparece no tempo em que é cantada."""
    size = font
    while True:
        imgs = [word_img(w, ITAL(size)) for _, w in items]
        sp = -int(4 * K)
        total = sum(i.shape[1] for i in imgs) + sp * (len(imgs) - 1)
        if total <= W * 0.9 or size < 50: break
        size -= 6
    x = (W - total) / 2; y = H * yrel
    fade_out = np.clip((t_out - t) / 0.25, 0, 1)
    for (ts, _), im in zip(items, imgs):
        p = np.clip((t - ts) / 0.22, 0, 1)
        e = 1 - (1 - p) ** 3
        blit(frame, im, x, y + (1 - e) * 26 * K, e * fade_out)
        x += im.shape[1] + sp

def line_from_words(a_abs, b_abs, fallback):
    ws = [(s, w.lower().strip('.,!?')) for s, e, w in words if a_abs - A0 - 0.15 <= s <= b_abs - A0]
    if not ws:
        n = len(fallback); return [(a_abs - A0 + i * (b_abs - a_abs) / n, w) for i, w in enumerate(fallback)]
    # usa o texto correto da letra, com os tempos detectados
    times = [s for s, _ in ws]
    if len(times) < len(fallback):
        times += [times[-1] + 0.2 * (i + 1) for i in range(len(fallback) - len(times))]
    return list(zip(times[:len(fallback)], fallback))

# ------------------------------------------------------------------ linha do tempo
segs = []   # dicts: t0, t1, kind, src, fx
def add(t0, t1, kind, src=None, **fx): segs.append(dict(t0=t0, t1=t1, kind=kind, src=src, **fx))

pi = iter(range(10 ** 6)); P = photos; C = clips or [{'file': None}]
def nextp(): return P[next(pi) % len(P)]
ci = iter(range(10 ** 6))
def nextc(): return C[next(ci) % len(C)]

# Intro: contador de dias sobre flashes de fotos
M = CFG['marks']
COUNTER = CFG.get('counter')
I_END = snap(M['intro_end']) if COUNTER else 0.0
if COUNTER: add(0, I_END, 'counter')
# "eu amo você" x2: parallax 3D lento, 4 batidas cada
t = I_END; BUILD = snap(M['build']); CH = snap(M['drop'])
intro_photos = (P * 3)[:3]
k = 0
while t < BUILD - 0.1:
    b_i = B.index(t); t1 = B[min(b_i + 4, len(B) - 1)]
    t1 = min(t1, BUILD)
    add(t, t1, 'p3d', intro_photos[k % 3], push=1.0, drift=(k % 2 * 2 - 1) * 0.02, leak=0.35); k += 1; t = t1
pi = iter(range(min(3, len(P)), 10 ** 6))
# build: um corte por batida, metade da batida nas últimas
bi = B.index(BUILD)
while B[bi] < CH - 0.05:
    t0 = B[bi]; t1 = B[bi + 1]
    if B[bi + 2] >= CH - 0.05:   # últimas 2 batidas: meia batida (stutter)
        m = (t0 + t1) / 2; add(t0, m, 'flat', nextp(), hit=1, rgb=1); add(m, t1, 'flat', nextp(), hit=1, rgb=1)
    else:
        add(t0, t1, 'flat', nextp(), hit=1, rgb=0.6)
    bi += 1

holds = [(snap(a), snap(b)) for a, b in M.get('holds', [])]
FAST = snap(M.get('fast', AEND))
END = snap(AEND)
bi = B.index(CH); n = 0
while B[bi] < END - 0.05:
    t0 = B[bi]
    h = next((hh for hh in holds if abs(hh[0] - t0) < 0.01), None)
    if h:
        if clips: add(t0, h[1], 'video', nextc(), mode='slow', hit=1, zb=1)
        else: add(t0, h[1], 'p3d', nextp(), push=0.8, hit=1, zb=1)
        bi = B.index(h[1]); n += 1; continue
    step = 1 if t0 >= FAST else 2
    t1 = B[min(bi + step, len(B) - 1)]; t1 = min(t1, END)
    first = abs(t0 - CH) < 0.01
    if first:
        add(t0, t1, 'p3d', next((p for p in P if CFG.get('hero') and CFG['hero'] in p), None) or nextp(),
            push=2.2, flash=1, zb=1, rgb=1)
    elif n % 3 == 1 and clips:
        add(t0, t1, 'video', nextc(), mode='velocity', hit=1, zb=1, whip=(n % 6 == 4))
    else:
        add(t0, t1, 'p3d', nextp(), push=1.6, drift=(n % 2 * 2 - 1) * 0.03, hit=1, zb=1,
            flash=(n % 4 == 0) * 0.5, rgb=0.5 if t0 >= FAST else 0)
    bi += step; n += 1
add(END, TOTAL, 'end', P[-1])
print('segmentos', len(segs), 'fotos', len(P), 'clipes', len(C))
json.dump([dict(i=i, t0=g['t0'], t1=g['t1'], kind=g['kind'], src=g['src'] if isinstance(g['src'], (str, list)) or g['src'] is None else g['src']['file']) for i, g in enumerate(segs)], open(f'{S}/segs.json', 'w'), indent=0)

def _t(v):
    return {'drop': CH, 'build': BUILD, 'end': END}.get(v, None) if isinstance(v, str) else rel(v)
LYR = [(_t(l['show'][0]), _t(l['show'][1]), l['text'].split(), l['match'][0], l['match'][1]) for l in CFG.get('lyrics', [])]
LYR_T = []
for a, b, ws, wa, wb in LYR:
    LYR_T.append((a, b, line_from_words(wa, wb, ws)))

# ------------------------------------------------------------------ render
ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                       '-i', '-', '-ss', str(A0), '-t', str(TOTAL), '-i', CFG['music'],
                       '-af', f'afade=t=in:d=0.4,afade=t=out:st={TOTAL - 2.8}:d=2.8',
                       '-c:v', 'libx264', '-preset', 'veryfast' if PREVIEW else 'slow', '-b:v', '10M', '-maxrate', '14M', '-bufsize', '20M', '-profile:v', 'high', '-level', '4.2',
                       '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT],
                      stdin=subprocess.PIPE)

def render_seg(sg, t):
    d = max(sg['t1'] - sg['t0'], 1e-3); p = np.clip((t - sg['t0']) / d, 0, 1); k = sg['kind']
    if k == 'counter':
        idx = int(t * FPS / 2) % len(P)
        a = flat(P[idx], 0.5) * 0.32
        a = cv2.GaussianBlur(a, (0, 0), 3 * K)
        return a
    if k == 'p3d': return photo3d(sg['src'], p, sg.get('push', 1), sg.get('drift', 0))
    if k == 'flat': return flat(sg['src'], p)
    if k == 'video': return video(sg['src'], p, sg['mode'])
    if k == 'end':
        a = photo3d(sg['src'], p * 0.6, 0.6)
        return a * (1 - 0.72 * min(1, (t - sg['t0']) / 0.7))

nf = int(TOTAL * FPS)
seg_i = 0
for fi in range(nf):
    t = fi / FPS
    while seg_i + 1 < len(segs) and t >= segs[seg_i + 1]['t0']: seg_i += 1
    sg = segs[seg_i]; since = t - sg['t0']
    a = render_seg(sg, t)
    # transições na entrada do segmento
    nxt = segs[seg_i + 1] if seg_i + 1 < len(segs) else None
    until = (nxt['t0'] - t) if nxt else 9
    if sg.get('zb'): a = zoom_blur(a, max(0, 1 - since / 0.12))
    if nxt and nxt.get('zb') and until < 0.07: a = zoom_blur(a, 1 - until / 0.07)
    if sg.get('whip'): a = whip(a, max(0, 1 - since / 0.14), -1)
    if nxt and nxt.get('whip') and until < 0.1: a = whip(a, 1 - until / 0.1, 1)
    if sg.get('hit'): a = shake(a, max(0, 1 - since / 0.16), fi)
    if sg.get('rgb'): a = rgb_split(a, sg['rgb'] * max(0, 1 - since / 0.15))
    if sg.get('flash'): a = a + (255 - a) * sg['flash'] * 0.9 * math.exp(-since / 0.09)
    leak = sg.get('leak', 0) + (0.25 if sg['kind'] in ('end', 'counter') else 0)
    if leak: a = a + light_leak(t, leak * (0.6 + 0.4 * math.sin(t * 1.3)))
    a = a * VIG + GRAIN[fi % 8]
    # texto
    if sg['kind'] == 'counter':
        q = np.clip((t - 0.25) / (I_END - 0.6), 0, 1); e = 1 - (1 - q) ** 4
        num = f"{int(round(COUNTER['value'] * e)):,}".replace(',', '.')
        im = word_img(num, ROM(250)); blit(a, im, (W - im.shape[1]) / 2, H * 0.36, min(1, t / 0.3))
        lab = word_img('   '.join(' '.join(w) for w in COUNTER['label'].split()), CAP(30)); blit(a, lab, (W - lab.shape[1]) / 2, H * 0.535, min(1, t / 0.6))
        if t < 0.3: a *= t / 0.3
    for a_, b_, items in LYR_T:
        if a_ - 0.05 <= t < b_:
            kinetic_line(a, t, items, 128, 0.72, b_)
    if sg['kind'] == 'end':
        e0 = sg['t0']
        def reveal(txt, font, y, ts):
            im = word_img(txt, font); q = np.clip((t - e0 - ts) / 0.5, 0, 1); ee = 1 - (1 - q) ** 3
            blit(a, im, (W - im.shape[1]) / 2, H * y + (1 - ee) * 30 * K, ee)
        for ln in CFG.get('end_card', []):
            reveal(ln['text'], {'rom': ROM, 'ital': ITAL, 'cap': CAP}[ln['style']](ln['size']), ln['y'], ln['delay'])
    if t > TOTAL - 0.9: a *= max(0, (TOTAL - t) / 0.9)
    ff.stdin.write(np.clip(a, 0, 255).astype(np.uint8).tobytes())
    if fi % 150 == 0: print(f'{fi}/{nf}', flush=True)
ff.stdin.close()
if ff.wait() != 0: sys.exit(f'ffmpeg falhou ao gravar {OUT}')
print('ok', OUT)
