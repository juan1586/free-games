const STORAGE_KEY = 'freegames:v1';

const memoryStore = new Map();

function isLocalStorageAvailable() {
  try {
    const probe = '__freegames_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const useLocalStorage = isLocalStorageAvailable();

function readRaw() {
  if (useLocalStorage) return window.localStorage.getItem(STORAGE_KEY);
  return memoryStore.get(STORAGE_KEY) ?? null;
}

function writeRaw(value) {
  if (useLocalStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      return;
    } catch {
      // Cuota llena o modo privado: seguimos en memoria.
    }
  }
  memoryStore.set(STORAGE_KEY, value);
}

export function loadState(defaultState) {
  try {
    const raw = readRaw();
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.players)) {
      return structuredClone(defaultState);
    }
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  writeRaw(JSON.stringify(state));
}
