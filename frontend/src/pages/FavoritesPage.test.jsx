import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FavoritesPage from './FavoritesPage';
import { fetchPropertyDetail } from '../api/client';
import { STORAGE_KEY } from '../hooks/useFavorites';

vi.mock('../api/client', () => ({
  fetchPropertyDetail: vi.fn(),
  fetchProperties: vi.fn(),
  fetchPropertyOpenHouses: vi.fn(),
}));

const property = (id, address) => ({
  id,
  L_Address: address,
  L_City: 'Portland',
  L_State: 'OR',
  L_SystemPrice: 450000,
  L_Keyword2: 3,
  LM_Dec_3: 2,
  LM_Int2_3: 1800,
  L_Photos: JSON.stringify(['https://cdn.test/1.jpg']),
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <FavoritesPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FavoritesPage', () => {
  it('shows an empty state when nothing is saved', () => {
    renderPage();

    expect(screen.getByText(/haven’t saved any properties yet/i)).toBeInTheDocument();
    expect(fetchPropertyDetail).not.toHaveBeenCalled();
  });

  it('loads and displays saved properties', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['1', '2']));
    fetchPropertyDetail.mockImplementation((id) =>
      Promise.resolve(property(Number(id), id === '1' ? '1 First St' : '2 Second Ave'))
    );

    renderPage();

    expect(await screen.findByText('1 First St')).toBeInTheDocument();
    expect(screen.getByText('2 Second Ave')).toBeInTheDocument();
    expect(fetchPropertyDetail).toHaveBeenCalledTimes(2);
  });

  it('shows the favorites count', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['1', '2']));
    fetchPropertyDetail.mockImplementation((id) => Promise.resolve(property(Number(id), `Addr ${id}`)));

    renderPage();

    expect(await screen.findByText('(2)')).toBeInTheDocument();
  });

  it('removes a property from the view immediately when unfavorited', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['1', '2']));
    fetchPropertyDetail.mockImplementation((id) =>
      Promise.resolve(property(Number(id), id === '1' ? '1 First St' : '2 Second Ave'))
    );

    renderPage();
    expect(await screen.findByText('1 First St')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /remove 1 first st from favorites/i })
    );

    await waitFor(() => {
      expect(screen.queryByText('1 First St')).not.toBeInTheDocument();
    });
    expect(screen.getByText('2 Second Ave')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('clears every favorite with Clear all', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['1']));
    fetchPropertyDetail.mockResolvedValue(property(1, '1 First St'));

    renderPage();
    expect(await screen.findByText('1 First St')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear all/i }));

    expect(await screen.findByText(/haven’t saved any properties yet/i)).toBeInTheDocument();
  });

  it('reports a saved listing that no longer exists without losing the others', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['1', '999']));
    fetchPropertyDetail.mockImplementation((id) =>
      id === '999'
        ? Promise.reject(new Error('Property with id 999 not found'))
        : Promise.resolve(property(1, '1 First St'))
    );

    renderPage();

    expect(await screen.findByText('1 First St')).toBeInTheDocument();
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });

  it('links back to the listings page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /back to listings/i })).toHaveAttribute('href', '/');
  });
});
