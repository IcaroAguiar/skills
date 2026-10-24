// Shared diagnostic policy. Apply before truncation, persistence and terminal output.
function sanitize(value, extraMasks = []) {
  // Omit all query values before decoding; encoded delimiters belong to values.
  const queryValue = /([?&][^=\s?&#"'<>]+)=([^\s&#"'<>]*)/g;
  value = String(value).replace(queryValue, '$1=…');
  // Request paths often percent-encode the same sensitive values.
  try { value = decodeURIComponent(String(value)); } catch { /* Plain text or malformed URL. */ }
  value = String(value).replace(queryValue, '$1=…');
  const patterns = [
    /[^\s<>"'()]+@[^\s<>"'()]+\.[a-z]{2,}/gi,
    /\bBearer\s+[^\s"'<>]+/gi,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    /\b[a-f0-9]{32,}\b/gi,
    /[A-Za-z0-9_+\/-]{40,}={0,2}/g,
    ...extraMasks.map(source => new RegExp(source, 'g')),
  ];
  return patterns.reduce((text, pattern) => text.replace(pattern, '•••••'), String(value));
}

function diagnosticURL(value) {
  const url = new URL(value);
  const query = [...url.searchParams.keys()].map(name => `${encodeURIComponent(name)}=…`).join('&');
  return `${url.origin}${url.pathname}${query ? `?${query}` : ''}`;
}
module.exports = { sanitize, diagnosticURL };

if (require.main === module) {
  try {
    const report = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
    if (report.error) console.log(`run failed: ${sanitize(report.error)}`);
    for (const scene of report.scenes) {
      console.log(sanitize(`${scene.status} ${scene.id} ${scene.error || ''}`));
      for (const key of ['notes', 'consoleErrors', 'failedRequests']) {
        for (const message of scene[key]) console.log(`  ${key}: ${sanitize(message)}`);
      }
    }
  } catch {
    console.error('No readable report from this execution.');
    process.exitCode = 1;
  }
}
