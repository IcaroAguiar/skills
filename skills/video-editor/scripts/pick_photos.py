"""Escolhe as melhores fotos de uma pessoa na fototeca do Fotos (macOS), um momento por evento.

Uso: pick_photos.py <pessoa> <uuids.txt> [--with OUTRA_PESSOA] [--gap-min 10]
Lê `osxphotos query --person ... --json` e descarta prints (screenshot, proporção < 0.5, WhatsApp).
Fotos tiradas com menos de --gap-min minutos de distância contam como um evento; fica a de maior nota estética.
Saída: um UUID por linha, em ordem cronológica, pronta para `osxphotos export --uuid-from-file`.
"""
import argparse, datetime, json, subprocess
ap = argparse.ArgumentParser(); ap.add_argument('person'); ap.add_argument('out')
ap.add_argument('--with', dest='other'); ap.add_argument('--gap-min', type=float, default=10)
a = ap.parse_args()
d = json.loads(subprocess.run(['osxphotos', 'query', '--person', a.person, '--json'], capture_output=True, text=True, check=True).stdout)
def shot(x):
    w, h = x.get('width') or 1, x.get('height') or 1
    return x.get('screenshot') or min(w, h) / max(w, h) < 0.5 or 'WhatsApp' in (x.get('original_filename') or '')
c = sorted((x for x in d if not x.get('ismovie') and not shot(x) and (not a.other or a.other in (x.get('persons') or []))), key=lambda x: x['date'])
sc = lambda x: (x.get('score') or {}).get('overall') or 0
groups = []
for x in c:
    t = datetime.datetime.fromisoformat(x['date'])
    if groups and (t - groups[-1][-1][0]).total_seconds() < a.gap_min * 60: groups[-1].append((t, x))
    else: groups.append([(t, x)])
best = [max(g, key=lambda p: sc(p[1]))[1]['uuid'] for g in groups]
open(a.out, 'w').write('\n'.join(best)); print(len(d), 'itens;', len(c), 'fotos válidas;', len(best), 'momentos')
