import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { fetchProperties, fetchPropertyDetail, fetchPropertyOpenHouses } from './api/client';
import { STORAGE_KEY } from './hooks/useFavorites';

vi.mock('./api/client', () => ({
  fetchProperties: vi.fn(),
  fetchPropertyDetail: vi.fn(),
  fetchPropertyOpenHouses: vi.fn(),
}));

/**
 * App owns BrowserRouter, which reads the real window location, so each test
 * sets the URL before rendering rather than passing an initialEntries prop.
 */
const goTo = (path) => window.history.pushState({}, '', path);

beforeEach(() => {
  vi.clearAllMocks();
  goTo('/');
  fetchProperties.mockResolvedValue({
    total: 1,
    limit: 20,
    offset: 0,
    results: [
      {
        id: 1,
        address: '123 Main St',
        city: 'Portland',
        state: 'OR',
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        photos: JSON.stringify(['https://cdn.test/1.jpg']),
      },
    ],
  });
  fetchPropertyDetail.mockResolvedValue({
    id: 1,
    L_Address: '123 Main St',
    L_City: 'Portland',
    L_State: 'OR',
    L_SystemPrice: 450000,
    L_Photos: JSON.stringify(['https://cdn.test/1.jpg']),
  });
  fetchPropertyOpenHouses.mockResolvedValue([]);
});

describe('App routing', () => {
  it('renders the listings page at /', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: /properties/i })).toBeInTheDocument();
    expect(await screen.findByText('123 Main St')).toBeInTheDocument();
  });

  it('renders the property detail page at /property/:id', async () => {
    goTo('/property/1');
    render(<App />);

    expect(await screen.findByText('$450,000')).toBeInTheDocument();
    expect(fetchPropertyDetail).toHaveBeenCalledWith('1');
  });

  it('renders the favorites page at /favorites', async () => {
    goTo('/favorites');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /favorites/i })).toBeInTheDocument();
  });

  it('shows saved properties on the favorites route', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['1']));
    goTo('/favorites');
    render(<App />);

    expect(await screen.findByText('123 Main St')).toBeInTheDocument();
  });

  it('shows an error page instead of crashing for an unknown property', async () => {
    fetchPropertyDetail.mockRejectedValue(new Error('Property with id 999 not found'));
    fetchPropertyOpenHouses.mockRejectedValue(new Error('Property with id 999 not found'));
    goTo('/property/999');
    render(<App />);

    expect(await screen.findByText(/property unavailable/i)).toBeInTheDocument();
  });
});
