// src/services/cache.ts
// Cache persistente de resultados en chrome.storage.local.
// Evita repetir llamadas a la API cuando el mismo texto se procesa dos veces.

const CACHE_KEY = 'sa_cache_v1';
const MAX_ENTRIES = 50;
const MAX_RESULT_LENGTH = 50000;

interface CacheEntry {
  result: string;
  timestamp: number;
}

type CacheStore = Record<string, CacheEntry>;

// Hash djb2. Rapido y suficiente para evitar colisiones en un cache local.
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}

function buildCacheKey(text: string, mode: string): string {
  return djb2(mode + '|' + text);
}

async function readStore(): Promise<CacheStore> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CACHE_KEY], (result: any) => {
      resolve(result[CACHE_KEY] || {});
    });
  });
}

async function writeStore(store: CacheStore): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CACHE_KEY]: store }, () => resolve());
  });
}

// Devuelve el resultado cacheado si existe, o null si no.
export async function getCachedResult(text: string, mode: string): Promise<string | null> {
  try {
    const key = buildCacheKey(text, mode);
    const store = await readStore();
    return store[key]?.result || null;
  } catch {
    return null;
  }
}

// Guarda el resultado en cache. Se ejecuta sin bloquear al llamador.
export async function setCachedResult(
  text: string,
  mode: string,
  result: string
): Promise<void> {
  try {
    // No cachear resultados vacios o demasiado largos
    if (!result || result.length > MAX_RESULT_LENGTH) return;

    const key = buildCacheKey(text, mode);
    const store = await readStore();

    store[key] = { result, timestamp: Date.now() };

    // Si hay mas de MAX_ENTRIES, eliminar las mas antiguas
    const entries = Object.entries(store);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
      for (const [k] of toRemove) delete store[k];
    }

    await writeStore(store);
  } catch {
    // Si falla el cache, no es un error critico.
  }
}

// Limpia todo el cache. Util si se cambia el prompt de un modo.
export async function clearCache(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([CACHE_KEY], () => resolve());
  });
}