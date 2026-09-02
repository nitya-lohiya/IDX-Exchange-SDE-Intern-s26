import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { resetFavoritesStore } from '../hooks/useFavorites';

// jsdom has no layout engine, so window.scrollTo is unimplemented and logs a
// noisy "Not implemented" error whenever the listings page changes page.
// Stub it so real problems stay visible in the test output.
window.scrollTo = () => {};

// Favorites live in a module-level store backed by localStorage, so state would
// otherwise leak from one test to the next.
beforeEach(() => {
  window.localStorage.clear();
  resetFavoritesStore();
});
