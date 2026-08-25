import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import { STORAGE_KEY } from '../hooks/useFavorites';

describe('FavoriteButton', () => {
  it('starts unsaved and offers to save', () => {
    render(<FavoriteButton propertyId={42} label="123 Main St" />);

    const button = screen.getByRole('button', { name: /save 123 main st to favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('saves the property when clicked', async () => {
    const user = userEvent.setup();
    render(<FavoriteButton propertyId={42} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual(['42']);
  });

  it('unsaves on a second click', async () => {
    const user = userEvent.setup();
    render(<FavoriteButton propertyId={42} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual([]);
  });

  it('shows the filled state for an already-saved property', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['42']));
    render(<FavoriteButton propertyId={42} />);

    const button = screen.getByRole('button', { name: /remove .* from favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    // Filled vs outlined is carried by the path's fill attribute.
    expect(button.querySelector('path')).toHaveAttribute('fill', 'currentColor');
  });

  it('shows the empty state when not saved', () => {
    render(<FavoriteButton propertyId={42} />);
    expect(screen.getByRole('button').querySelector('path')).toHaveAttribute('fill', 'none');
  });

  it('does not navigate when rendered inside a link', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <Link to="/property/42">
                <span>card</span>
                <FavoriteButton propertyId={42} />
              </Link>
            }
          />
          <Route path="/property/:id" element={<h1>Detail page</h1>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button'));

    expect(screen.queryByText('Detail page')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
