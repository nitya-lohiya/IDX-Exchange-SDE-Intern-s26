import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { resetFavoritesStore } from '../hooks/useFavorites';

// Favorites live in a module-level store backed by localStorage, so state would
// otherwise leak from one test to the next.
beforeEach(() => {
  window.localStorage.clear();
  resetFavoritesStore();
});
