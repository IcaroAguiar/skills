#!/usr/bin/env bash
# Offline behavioral test. Uses only its own temporary run; never starts a server.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
if [ -z "${DEMO_TEST_CWD:-}" ] || [ -z "${DEMO_TEST_PLAYWRIGHT:-}" ]; then
  echo 'DEMO_TEST_CWD and DEMO_TEST_PLAYWRIGHT are required; set both to a project with Playwright installed.' >&2
  exit 2
fi
cwd="$DEMO_TEST_CWD"
playwright="$DEMO_TEST_PLAYWRIGHT"
root="$(mktemp -d "${TMPDIR:-/tmp}/pr-demo-selftest.XXXXXX")"
root="$(cd "$root" && pwd)"
trap 'rm -rf "$root"' EXIT
# Exercise the normal runner without inherited module-resolution assistance.
unset NODE_PATH

# A fake executor proves argv stays literal, including shell substitutions.
python3 - "$root" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
(root / 'executor.py').write_text('''import json, os, pathlib, sys
run = pathlib.Path(os.environ['DEMO_RUN_DIR'])
if sys.argv[1:3] == ['node', '-p']:
    print(run / 'node_modules/@playwright/test/package.json')
    raise SystemExit(0)
(run / 'argv.json').write_text(json.dumps(sys.argv[1:]))
(run / '.auth.json').write_text('{"cookies":[],"origins":[]}')
''')
PY
weird="$root/run spaces \"' \$(touch injected) \`touch injected2\`"
# A minimal fake project so module resolution succeeds without a real install.
mkdir -p "$root/fakeproj/node_modules/@playwright/test"
printf '{"name":"@playwright/test","version":"0.0.0"}' > "$root/fakeproj/node_modules/@playwright/test/package.json"
bash "$here/demo.sh" new "$weird" --cwd "$root/fakeproj" --playwright "python3 $root/executor.py" > "$root/argv.log"
bash "$here/demo.sh" login "$weird" >> "$root/argv.log" 2>&1
python3 - "$weird" "$root" <<'PY'
import json, pathlib, sys
run, root = map(pathlib.Path, sys.argv[1:])
assert json.loads((run / 'argv.json').read_text()) == ['test', '-c', str(run / 'playwright.config.ts')], (json.loads((run / 'argv.json').read_text()), str(run / 'playwright.config.ts'))
assert not (root / 'injected').exists() and not (root / 'injected2').exists()
PY
echo 'PASS argv literal (spaces, quotes, $(), backticks): exit 0'

run="$root/run"
python3 - "$root" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1])
assert all(not (p / 'node_modules/@playwright/test').exists() for p in [root, *root.parents]), 'selftest needs an external run without ancestor @playwright/test'
PY
bash "$here/demo.sh" new "$run" --cwd "$cwd" --playwright "$playwright" > "$root/new.log"
python3 - "$run" <<'PY'
from pathlib import Path
import json, sys
run = Path(sys.argv[1])
# Fake JWT assembled at runtime so secret scanners do not flag the fixture.
FAKE_JWT = '.'.join(['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjMifQ', 'signature123'])
(run / '.auth.json').write_text('{"cookies":[],"origins":[]}')
(run / '.auth.json').chmod(0o600)
(run / 'page.html').write_text('''<!doctype html><html><body>
<h1>Offline demo</h1><p id="initial">initial.person@example.test</p>
<div id="dynamic"></div><div id="attrs" title="before">Attributes</div>
<input id="email" type="email" value="input.person@example.test">
</body></html>''')
secrets = [
    'notes.person@example.test', 'errors.person@example.test', 'console.person@example.test',
    'route.person@example.test', 'pageerror.person@example.test',
    'bearer-secret-123', FAKE_JWT,
    '0123456789abcdef0123456789abcdef', 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefghij==',
    'query-token-123', 'query-key-123', 'query-code-123', 'PRIVATE-PROJECT-42',
    'demo-token-123',
]
(run / 'secrets.json').write_text(json.dumps(secrets))
(run / 'project.ts').write_text('''import type { ProjectProfile } from './harness';
export const profile: ProjectProfile = {
  baseURL: %s, viewport: { width: 640, height: 480 },
  extraMasks: ['PRIVATE-PROJECT-\\\\d+'],
  async beforeScenes(page) {
    if (process.env.TEST_BEFORE_FAIL === '1') throw new Error('errors.person@example.test Bearer bearer-secret-123 PRIVATE-PROJECT-42');
    await page.goto(%s);
  },
};
export async function login() {}
''' % (json.dumps((run / 'page.html').as_uri()), json.dumps((run / 'page.html').as_uri())))
(run / 'scenes' / '01.ts').write_text('''import type { Scene } from '../harness';
export const scene: Scene = {
  id: '01', title: 'Masks and diagnostics',
  async prepare({ page, note }) { note('prepare=true'); await page.reload(); },
  async play({ page, note, hold }) {
    await page.evaluate(() => {
      document.getElementById('dynamic')!.appendChild(document.createTextNode('inserted.person@example.test'));
      const attrs = document.getElementById('attrs')!;
      attrs.title = 'title.person@example.test';
      attrs.setAttribute('aria-label', 'aria.person@example.test');
      attrs.setAttribute('placeholder', 'placeholder.person@example.test');
      const input = document.getElementById('email')!;
      input.setAttribute('value', 'changed.person@example.test');
      const added = document.createElement('input');
      added.type = 'email'; added.value = 'added.person@example.test'; added.id = 'added';
      document.body.appendChild(added);
    });
    await page.waitForTimeout(80);
    const masks = await page.evaluate(() => {
      const attrs = document.getElementById('attrs')!;
      return {
        initial: document.getElementById('initial')!.textContent === '•••••',
        text: document.getElementById('dynamic')!.textContent === '•••••',
        title: attrs.title === '•••••',
        aria: attrs.getAttribute('aria-label') === '•••••',
        placeholder: attrs.getAttribute('placeholder') === '•••••',
        value: getComputedStyle(document.getElementById('email')!).getPropertyValue('-webkit-text-security') === 'disc',
        added: getComputedStyle(document.getElementById('added')!).getPropertyValue('-webkit-text-security') === 'disc',
      };
    });
    note('masks=' + JSON.stringify(masks));
    if (!Object.values(masks).every(Boolean)) throw new Error('Mask assertion failed');
    note('notes.person@example.test Bearer bearer-secret-123 __FAKE_JWT__ 0123456789abcdef0123456789abcdef AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefghij== ?token=query-token-123&key=query-key-123&code=query-code-123 PRIVATE-PROJECT-42');
    await page.evaluate(() => {
      console.error('console.person@example.test Bearer bearer-secret-123 PRIVATE-PROJECT-42');
      setTimeout(() => { throw new Error('pageerror.person@example.test Bearer bearer-secret-123'); }, 0);
    });
    await page.route('https://selftest.invalid/**', route => route.fulfill({status: 503, body: 'offline', headers: {'Access-Control-Allow-Origin': '*'}}));
    await page.evaluate(async () => {
      await fetch('https://selftest.invalid/route.person%40example.test?token=query-token-123&key=query-key-123&code=query-code-123').catch(() => {});
      await fetch('https://selftest.invalid/query-policy?access_token=demo-token-123&refresh_token=r1&api_key=k1&page=2').catch(() => {});
    });
    await page.route('https://aborted.invalid/**', route => route.abort());
    await page.evaluate(async () => { await fetch('https://aborted.invalid/route.person%40example.test?token=query-token-123').catch(() => {}); });
    await page.evaluate(async () => { await fetch('https://aborted.invalid/query-policy?access_token=demo-token-123&refresh_token=r1&api_key=k1&page=2').catch(() => {}); });
    await hold(2200);
  },
};
''')
(run / 'scenes' / '02.ts').write_text('''import type { Scene } from '../harness';
export const scene: Scene = {
  id: '02', title: 'Main page with popup',
  async play({ page, hold, note }) {
    const popupPromise = page.waitForEvent('popup');
    await page.evaluate(() => window.open(location.href + '#popup'));
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await hold(1500);
    await popup.close();
    note('popup=true');
  },
};
''')
(run / 'scenes' / 'fail.ts').write_text('''import type { Scene } from '../harness';
export const scene: Scene = { id: 'fail', title: 'Intentional failure',
  async prepare() { throw new Error('errors.person@example.test Bearer bearer-secret-123 PRIVATE-PROJECT-42'); },
  async play() { throw new Error('errors.person@example.test Bearer bearer-secret-123 PRIVATE-PROJECT-42'); },
};
''')
(run / 'scenes' / 'index.ts').unlink()
scene_01 = run / 'scenes' / '01.ts'
scene_01.write_text(scene_01.read_text().replace('__FAKE_JWT__', FAKE_JWT))
PY

invoke() {
  local label="$1" expected="$2" status=0; shift 2
  bash "$here/demo.sh" "$@" > "$root/$label.log" 2>&1 || status=$?
  if { [ "$expected" = ok ] && [ "$status" -ne 0 ]; } || { [ "$expected" = fail ] && [ "$status" -eq 0 ]; }; then
    echo "FAIL $label: exit $status (expected $expected); raw output withheld" >&2
    # Print only a sanitized report if one exists.
    node "$run/diagnostics.cjs" "$run/report.json" 2>/dev/null || :
    exit 1
  fi
  echo "PASS $label: exit $status (expected $expected)"
}
index() {
  printf "import { scene as first } from './01';\nimport { scene as second } from './02';\nimport { scene as fail } from './fail';\nexport const scenes = [%s];\n" "$1" > "$run/scenes/index.ts"
}
check() { python3 - "$run" "$1" <<'PY'
import json, pathlib, sys
run, mode = pathlib.Path(sys.argv[1]), sys.argv[2]
if mode == 'individual':
    assert not (run / 'scenes/index.ts').exists()
    r = json.loads((run / 'report-01.json').read_text())
    assert [s['status'] for s in r['scenes']] == ['ok']
    s = r['scenes'][0]
    assert 'prepare=true' in s['notes']
    assert s['consoleErrors'] and s['failedRequests']
    masks = json.loads(next(n[6:] for n in s['notes'] if n.startswith('masks=')))
    assert all(masks.values()) and len(masks) == 7
else:
    r = json.loads((run / 'report.json').read_text())
    assert 'STALE' not in json.dumps(r)
    if mode == 'failed': assert [s['status'] for s in r['scenes']] == ['ok', 'failed', 'skipped']
    if mode == 'before': assert r['error'] and all(s['status'] == 'skipped' for s in r['scenes'])
    if mode == 'good':
        assert [s['status'] for s in r['scenes']] == ['ok', 'ok']
        assert pathlib.Path(r['video']).is_file()
        assert len(list((run / 'video').glob('*.webm'))) >= 2
PY
}

invoke login-project-resolution ok login "$run"
invoke scene-without-index ok scene "$run" 01 --fast
check individual
python3 - "$run" "$root/scene-without-index.log" <<'PY'
import json, pathlib, re, sys
run, log = map(pathlib.Path, sys.argv[1:])
report = run / 'report-01.json'
requests = json.loads(report.read_text())['scenes'][0]['failedRequests']
http = '503 GET https://selftest.invalid/query-policy?access_token=…&refresh_token=…&api_key=…&page=…'
aborted = 'GET https://aborted.invalid/query-policy?access_token=…&refresh_token=…&api_key=…&page=… '
assert http in requests, 'HTTP error must retain origin/path and query names only'
assert any(item.startswith(aborted) for item in requests), 'aborted request must retain origin/path and query names only'
output = log.read_text()
assert http in output and aborted in output, 'terminal must retain both sanitized request diagnostics'
for content in [report.read_text(), output]:
    assert 'demo-token-123' not in content
    assert not re.search(r'(?<![A-Za-z0-9])(?:r1|k1)(?![A-Za-z0-9])|page=2', content), 'query value leaked'
print('PASS query privacy: HTTP 503 + aborted request; names retained, all values omitted in report + stdout/stderr')
PY
invoke prepare-failure fail scene "$run" fail --fast
python3 - "$run/report-fail.json" <<'PY'
import json, sys
assert json.load(open(sys.argv[1]))['scenes'][0]['status'] == 'failed'
PY
index 'first, fail, second'
printf '{"STALE":true}\n' > "$run/report.json"
invoke record-failure fail record "$run" --fast
check failed
export TEST_BEFORE_FAIL=1
printf '{"STALE":true}\n' > "$run/report.json"
invoke beforeScenes-failure fail record "$run" --fast
unset TEST_BEFORE_FAIL
check before
index 'first, second'
invoke record-good ok record "$run"
check good
# The form probe: counts fields and reports what each one kept, then leaves the form as it was.
cat > "$run/scenes/probe.ts" <<'TS'
import type { Scene } from '../harness';
const html = `<form>
  <label for="c">CPF</label><input id="c" type="text">
  <label for="q">Quantidade</label><input id="q" type="text" inputmode="numeric" maxlength="4">
  <label for="n">Nome completo</label><input id="n" type="text" required value="Ana">
  <input id="x" type="text" placeholder="Buscar">
  <label for="d">Cidade</label><input id="d" type="text" maxlength="60">
  <label for="h">CNPJ</label><input id="h" type="text" aria-describedby="hh"><span id="hh">Informe o documento da empresa</span>
  <label for="v">Valor</label><input id="v" type="text" inputmode="decimal">
  <select aria-label="Prioridade"><option>1</option></select>
  <div id="rich" contenteditable="true" aria-label="Observações"><b>Ana</b><br>Silva</div>
  <input id="u" type="text" aria-label="Apelido %22curto%22" maxlength="20">
</form>`;
export const scene: Scene = {
  id: 'probe', title: 'Form probe',
  async play({ page, probe, note }) {
    await page.setContent(html);
    await page.evaluate(() => document.getElementById('q')!.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement; input.value = input.value.replace(/\D/g, '');
    }));
    await page.evaluate(() => document.getElementById('v')!.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement; input.value = input.value.replace(/\D/g, '');
    }));
    await probe();
    const rich = await page.locator('#rich').innerHTML();
    note(`restored=${(await page.locator('#n').inputValue()) === 'Ana' && rich === '<b>Ana</b><br>Silva'}`);
  },
};
TS
invoke probe-scene ok scene "$run" probe --fast
python3 - "$run" <<'PY'
import json, pathlib, sys
run = pathlib.Path(sys.argv[1])
result = json.loads((run / 'probe' / 'probe-1.json').read_text())
ruler, found = result['ruler'], {(f['field'], f['kind']) for f in result['findings']}
assert (ruler['fieldsShown'], ruler['required'], ruler['withoutLabel']) == (10, 1, 1), ruler
assert ruler['wrongKeyboard'] == 2 and ruler['fixedFormatWithoutMaskOrExample'] == 3, ruler
shapes = {f['label']: f['shape'] for f in result['fields']}
assert any('curto' in label for label in shapes), 'an encoded quote in a label must survive as valid JSON'
assert shapes['Cidade'] is None and shapes['Prioridade'] == 'number', shapes
assert ('CNPJ', 'aceita letras') in found, 'help text must not hide a finding'
assert ('Valor', 'muda o valor em silêncio') in found, 'a decimal or a sign lost is a silent change'
assert not any(field in ('Cidade', 'Observações', 'Prioridade') for field, _ in found), found
assert ('CPF', 'aceita letras') in found, found
assert ('Quantidade', 'muda o valor em silêncio') in found, found
assert not any(field == 'Quantidade' and kind == 'apaga sem avisar' for field, kind in found), found
assert 'restored=true' in (run / 'report-probe.json').read_text()
print('PASS probe: ruler counted, letters and silent change reported, form restored')
PY

# A newer invalid webm makes choosing the newest video fail deterministically.
printf 'not a video\n' > "$run/video/newest-decoy.webm"
invoke post-report-video ok post "$run"
python3 - "$run" <<'PY'
from pathlib import Path
import sys
out = Path(sys.argv[1]) / 'out'
for name in ['demo.mp4', 'sheet.png', '01-mid.png', '01-end.png', '02-mid.png', '02-end.png']:
    assert (out / name).stat().st_size > 0, name
PY
# ffmpeg can exit 0 yet produce no frame. Stale frames must not hide it.
python3 - "$run" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1]) / 'report.json'
r = json.loads(p.read_text()); r['scenes'][0]['startMs'] = 90000000; r['scenes'][0]['endMs'] = 90001000
p.write_text(json.dumps(r))
PY
invoke post-missing-frame fail post "$run"
test ! -f "$run/out/01-mid.png"
# A launcher failure must erase the previous report even before the harness loads.
printf '{"STALE":true}\n' > "$run/report.json"
printf '/does-not-exist\0' > "$run/playwright.args"
invoke launcher-failure fail record "$run"
test ! -e "$run/report.json"
python3 - "$run" "$root" <<'PY'
import json, pathlib, re, sys
run, root = map(pathlib.Path, sys.argv[1:])
secrets = json.loads((run / 'secrets.json').read_text())
files = list(run.glob('report*.json')) + list(root.glob('*.log'))
for p in files:
    content = p.read_text()
    assert not re.search(r'[\w.]+@example\.test', content), 'email leaked'
    assert all(secret not in content for secret in secrets), 'secret leaked'
    assert not re.search(r'(?<![A-Za-z0-9])(?:r1|k1)(?![A-Za-z0-9])|page=2', content), 'query value leaked'
print('PASS privacy: reports + stdout/stderr contain no fixture email or token')
PY
echo 'PASS masks: inserted Text, changed title/aria-label/placeholder, email inputs (boolean notes)'

echo 'SELFTEST PASS: exit 0; temporary run removed on exit'
