const EMPTY_CAPABILITIES = { actions: [] };

async function loadCapabilities(id: string) {
  // ruleid: silent-catch-default
  try {
    return await api.get(`/capabilities/${id}`);
  } catch {
    return EMPTY_CAPABILITIES;
  }
}

async function loadList() {
  // ruleid: silent-catch-default
  try {
    return await api.get("/items");
  } catch (error) {
    return [];
  }
}

// ruleid: silent-catch-default
const roles = fetchRoles().catch(() => []);

// ruleid: silent-catch-default
const flags = fetchFlags().catch((err) => ({ enabled: false }));

async function loadLogged() {
  // ok: silent-catch-default
  try {
    return await api.get("/items");
  } catch (error) {
    logger.warn("items failed", error);
    return [];
  }
}

async function loadMapped() {
  // ok: silent-catch-default
  try {
    return await api.get("/items");
  } catch (error) {
    return toFailureState(error);
  }
}

// ok: silent-catch-default
const settled = fetchRoles().catch((err) => ({ error: err }));

function httpUrl(value: string) {
  // ok: silent-catch-default
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function parsed(raw: string) {
  // ok: silent-catch-default
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function errorBody(response: Response) {
  // ok: silent-catch-default
  const payload = await response.json().catch(() => ({}));
  return payload;
}

async function exists(path: string) {
  // ok: silent-catch-default
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}

async function removeUser(id: string) {
  // ruleid: silent-catch-default
  try {
    await api.deleteUser(id);
    return true;
  } catch {
    return false;
  }
}

async function size(path: string) {
  // ok: silent-catch-default
  try {
    return (await fs.promises.stat(path)).size;
  } catch (error) {
    return 0;
  }
}
