import { describe, it, expect } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import useFavorites, { STORAGE_KEY } from './useFavorites';

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');

describe('useFavorites', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('adds a favorite and reports it', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(42));

    expect(result.current.favorites).toEqual(['42']);
    expect(result.current.count).toBe(1);
    expect(result.current.isFavorite(42)).toBe(true);
  });

  it('treats numeric and string ids as the same property', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(42));

    // useParams hands back strings while the API hands back numbers.
    expect(result.current.isFavorite('42')).toBe(true);
    act(() => result.current.addFavorite('42'));
    expect(result.current.count).toBe(1);
  });

  it('persists to localStorage so favorites survive a refresh', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(7));
    expect(stored()).toEqual(['7']);

    // A fresh mount reads the persisted list back.
    const remounted = renderHook(() => useFavorites());
    expect(remounted.result.current.favorites).toEqual(['7']);
  });

  it('removes a favorite', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(1));
    act(() => result.current.addFavorite(2));
    act(() => result.current.removeFavorite(1));

    expect(result.current.favorites).toEqual(['2']);
    expect(result.current.isFavorite(1)).toBe(false);
    expect(stored()).toEqual(['2']);
  });

  it('toggles on and off', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggleFavorite(9));
    expect(result.current.isFavorite(9)).toBe(true);

    act(() => result.current.toggleFavorite(9));
    expect(result.current.isFavorite(9)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('keeps newest saves first', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(1));
    act(() => result.current.addFavorite(2));
    act(() => result.current.addFavorite(3));

    expect(result.current.favorites).toEqual(['3', '2', '1']);
  });

  it('clears everything', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.addFavorite(1));
    act(() => result.current.addFavorite(2));
    act(() => result.current.clearFavorites());

    expect(result.current.favorites).toEqual([]);
    expect(stored()).toEqual([]);
  });

  it('shares one list across every component using the hook', () => {
    function Counter() {
      const { count } = useFavorites();
      return <span data-testid="count">{count}</span>;
    }
    function Toggle() {
      const { toggleFavorite } = useFavorites();
      return <button type="button" onClick={() => toggleFavorite(5)}>toggle</button>;
    }

    render(<><Counter /><Toggle /></>);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    act(() => screen.getByRole('button', { name: 'toggle' }).click());
    // Separate component, separate hook call — still sees the change.
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('recovers from malformed localStorage instead of throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json');

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual([]);
  });

  it('ignores a stored value that is not an array', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"a":1}');
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it('de-duplicates ids loaded from storage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['3', 3, '3']));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(['3']);
  });

  it('picks up changes made in another tab', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.count).toBe(0);

    act(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['11']));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.favorites).toEqual(['11']);
  });
});
