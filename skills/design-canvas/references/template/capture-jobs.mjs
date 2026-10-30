// Jobs de captura sem navegador; nomes preservam o formato usado por shoot.mjs.
export function captureJobs(screens, { only, themes, dark = '' } = {}) {
  const requested = [...new Set((themes ?? 'claro').split(',').map((theme) => theme.trim()))];
  if (requested.some((theme) => !['claro', 'escuro'].includes(theme))) {
    throw new Error('THEMES deve listar claro e/ou escuro, separados por vírgula.');
  }
  const darkScreens = dark.split(',').map((id) => id.trim()).filter(Boolean);
  const jobs = [];
  for (const screen of screens) {
    if (only && !only.includes(screen.id)) continue;
    for (const state of ['', ...(screen.states ?? [])]) {
      const screenThemes = themes === undefined && darkScreens.includes(screen.id) ? ['claro', 'escuro'] : requested;
      for (const theme of screenThemes) {
        for (const width of [1440, 390]) {
          const name = `${screen.id}${state ? `-${state}` : ''}${theme === 'escuro' ? '-escuro' : ''}-${width}`;
          jobs.push({ id: screen.id, state, theme, width, name });
        }
      }
    }
  }
  return jobs;
}
