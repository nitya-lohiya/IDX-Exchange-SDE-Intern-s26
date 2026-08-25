import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropertyCard from './PropertyCard';

const property = {
  id: 42,
  address: '123 Main St',
  city: 'Portland',
  state: 'OR',
  price: 450000,
  beds: 3,
  baths: 2.5,
  sqft: 1800,
  photos: JSON.stringify(['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg']),
};

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<PropertyCard property={{ ...property, ...overrides }} />} />
        <Route path="/property/:id" element={<h1>Detail page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PropertyCard', () => {
  it('renders the price, address, and stats', () => {
    renderCard();

    expect(screen.getByText('$450,000')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Portland, OR')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();
    expect(screen.getByText('1,800')).toBeInTheDocument();
  });

  it('links to the property detail route', () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/property/42');
  });

  it('navigates to the detail page when the card is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByText('123 Main St'));

    expect(screen.getByText('Detail page')).toBeInTheDocument();
  });

  it('does not navigate when a carousel arrow is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /next photo/i }));

    expect(screen.queryByText('Detail page')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('falls back gracefully when fields are missing', () => {
    renderCard({ address: null, city: null, state: null, price: null, beds: null, sqft: null });

    expect(screen.getByText('Address unavailable')).toBeInTheDocument();
    expect(screen.getByText('Price on request')).toBeInTheDocument();
  });
});
