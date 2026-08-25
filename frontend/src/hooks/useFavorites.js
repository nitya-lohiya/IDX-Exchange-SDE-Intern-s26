import { useCallback, useSyncExternalStore } from "react";

/**
 * Favorites are shared UI state: the heart on a card, the count in the header,
 * and the /favorites grid all have to agree the instant one of them changes.
 *
 * If this hook just used useState, every component calling it would get its own
 * independent copy — clicking a heart would update that card and nothing else.
 * So the list lives in one module-level store that components subscribe to
 * through useSyncExternalStore, React's built-in way to read from a source it
 * doesn't own. localStorage is the durable backing for that store.
 */

const STORAGE_KEY = "idx.favorites";

// IDs arrive as numbers from the API but as strings from useParams/localStorage.
// Normalising everything to a string keeps 42 and "42" from being two entries.
const toId = (value) => String(value);

let cache = [];
const listeners = new Set();

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything that isn't a usable id, and de-duplicate.
    return [...new Set(parsed.map(toId).filter((id) => id && id !== "undefined" && id !== "null"))];
  } catch {
    // Malformed JSON, or storage blocked (Safari private mode). Start empty
    // rather than taking the whole app down.
    return [];
  }
}

function writeStorage(ids) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Quota exceeded or storage disabled — favorites still work for this
    // session, they just won't survive a refresh.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Replace the list, persist it, and wake every subscribed component. */
function setFavorites(ids) {
  cache = ids;
  writeStorage(cache);
  emit();
}

function subscribe(listener) {
  // First subscriber primes the cache from localStorage.
  if (listeners.size === 0) cache = readStorage();
  listeners.add(listener);

  // Another tab changing favorites fires `storage` here; re-read so both tabs
  // stay in sync. (The event does not fire in the tab that made the change.)
  const onStorage = (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cache = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// useSyncExternalStore compares snapshots by identity, so this must return the
// same array reference until the data actually changes — building a new array
// here would loop forever.
const getSnapshot = () => cache;

// The server has no localStorage; render an empty list there.
const getServerSnapshot = () => [];

/** Test seam: wipe the store and storage between tests. */
export function resetFavoritesStore() {
  cache = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — nothing to clear
  }
  emit();
}

export { STORAGE_KEY };

export default function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = useCallback(
    (id) => favorites.includes(toId(id)),
    [favorites]
  );

  const addFavorite = useCallback((id) => {
    const key = toId(id);
    if (cache.includes(key)) return;
    // Newest first, so the Favorites page reads as a recent-saves list.
    setFavorites([key, ...cache]);
  }, []);

  const removeFavorite = useCallback((id) => {
    const key = toId(id);
    if (!cache.includes(key)) return;
    setFavorites(cache.filter((existing) => existing !== key));
  }, []);

  const toggleFavorite = useCallback((id) => {
    const key = toId(id);
    if (cache.includes(key)) setFavorites(cache.filter((existing) => existing !== key));
    else setFavorites([key, ...cache]);
  }, []);

  const clearFavorites = useCallback(() => setFavorites([]), []);

  return {
    favorites,
    count: favorites.length,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
  };
}
