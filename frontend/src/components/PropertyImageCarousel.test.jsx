import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import PropertyImageCarousel from './PropertyImageCarousel';

const THREE_PHOTOS = JSON.stringify([
  'https://cdn.test/1.jpg',
  'https://cdn.test/2.jpg',
  'https://cdn.test/3.jpg',
]);

describe('PropertyImageCarousel', () => {
  it('shows the first photo and a counter', () => {
    render(<PropertyImageCarousel rawPhotos={THREE_PHOTOS} alt="123 Main St" />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/1.jpg');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('cycles forward through photos with the next arrow', async () => {
    const user = userEvent.setup();
    render(<PropertyImageCarousel rawPhotos={THREE_PHOTOS} />);

    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/2.jpg');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('wraps around in both directions', async () => {
    const user = userEvent.setup();
    render(<PropertyImageCarousel rawPhotos={THREE_PHOTOS} />);

    // Backwards from the first photo lands on the last.
    await user.click(screen.getByRole('button', { name: /previous photo/i }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    // Forwards from the last wraps to the first.
    await user.click(screen.getByRole('button', { name: /next photo/i }));
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('hides the arrows and counter for a single photo', () => {
    render(<PropertyImageCarousel rawPhotos={JSON.stringify(['https://cdn.test/only.jpg'])} />);

    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous photo/i })).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.test/only.jpg');
  });

  it('falls back to a placeholder when there are no photos', () => {
    render(<PropertyImageCarousel rawPhotos={null} />);
    expect(screen.getByText(/no photo/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('survives a malformed L_Photos value', () => {
    expect(() => render(<PropertyImageCarousel rawPhotos="{not json" />)).not.toThrow();
    expect(screen.getByText(/no photo/i)).toBeInTheDocument();
  });

  it('does not navigate when an arrow inside a link is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <Link to="/property/42">
                <PropertyImageCarousel rawPhotos={THREE_PHOTOS} />
              </Link>
            }
          />
          <Route path="/property/:id" element={<h1>Detail page</h1>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /next photo/i }));

    expect(screen.queryByText('Detail page')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });
});
