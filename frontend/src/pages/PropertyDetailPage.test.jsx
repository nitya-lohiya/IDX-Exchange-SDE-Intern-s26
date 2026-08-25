import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PropertyDetailPage from './PropertyDetailPage';
import { fetchPropertyDetail, fetchPropertyOpenHouses } from '../api/client';

vi.mock('../api/client', () => ({
  fetchPropertyDetail: vi.fn(),
  fetchPropertyOpenHouses: vi.fn(),
}));

const PROPERTY = {
  id: 42,
  L_ListingID: 'MLS-9001',
  L_Address: '123 Main St',
  L_City: 'Portland',
  L_State: 'OR',
  L_Zip: '97201',
  L_SystemPrice: 450000,
  L_Keyword2: 3,
  LM_Dec_3: 2.5,
  LM_Int2_3: 1800,
  YearBuilt: 1998,
  L_Status: 'Active',
  LR_Remarks: 'A charming craftsman with a big porch.',
  L_Photos: JSON.stringify(['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg']),
  LMD_MP_Latitude: 45.5152,
  LMD_MP_Longitude: -122.6784,
};

function renderPage(id = '42') {
  return render(
    <MemoryRouter initialEntries={[`/property/${id}`]}>
      <Routes>
        <Route path="/property/:id" element={<PropertyDetailPage />} />
        <Route path="/" element={<h1>Listings page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
});

describe('PropertyDetailPage', () => {
  it('renders price, address, stats, description, and details', async () => {
    fetchPropertyDetail.mockResolvedValue(PROPERTY);
    fetchPropertyOpenHouses.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('$450,000')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '123 Main St' })).toBeInTheDocument();
    expect(screen.getByText('Portland, OR 97201')).toBeInTheDocument();

    expect(screen.getByText('Beds')).toBeInTheDocument();
    expect(screen.getByText('Baths')).toBeInTheDocument();
    expect(screen.getByText('Sq Ft')).toBeInTheDocument();
    expect(screen.getByText('Year Built')).toBeInTheDocument();

    expect(screen.getByText('A charming craftsman with a big porch.')).toBeInTheDocument();
    expect(screen.getByText('MLS-9001')).toBeInTheDocument();
  });

  it('requests the property and open houses for the id in the URL', async () => {
    fetchPropertyDetail.mockResolvedValue(PROPERTY);
    fetchPropertyOpenHouses.mockResolvedValue([]);

    renderPage('42');

    expect(await screen.findByText('$450,000')).toBeInTheDocument();
    expect(fetchPropertyDetail).toHaveBeenCalledWith('42');
    expect(fetchPropertyOpenHouses).toHaveBeenCalledWith('42');
  });

  it('shows a back link to the listings page', async () => {
    fetchPropertyDetail.mockResolvedValue(PROPERTY);
    fetchPropertyOpenHouses.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('link', { name: /back to listings/i })).toHaveAttribute(
      'href',
      '/'
    );
  });

  it('renders the map when coordinates are present', async () => {
    fetchPropertyDetail.mockResolvedValue(PROPERTY);
    fetchPropertyOpenHouses.mockResolvedValue([]);

    renderPage();
    await screen.findByText('$450,000');

    expect(document.querySelector('iframe').getAttribute('src')).toContain(
      'q=45.5152,-122.6784'
    );
  });

  it('omits the map when the property has no coordinates', async () => {
    fetchPropertyDetail.mockResolvedValue({
      ...PROPERTY,
      LMD_MP_Latitude: null,
      LMD_MP_Longitude: null,
    });
    fetchPropertyOpenHouses.mockResolvedValue([]);

    renderPage();
    await screen.findByText('$450,000');

    expect(document.querySelector('iframe')).toBeNull();
  });

  it('shows open houses with remarks from all_data', async () => {
    fetchPropertyDetail.mockResolvedValue(PROPERTY);
    fetchPropertyOpenHouses.mockResolvedValue([
      {
        id: 1,
        date: '2026-08-15',
        startTime: '13:00:00',
        endTime: '16:00:00',
        rawData: JSON.stringify({ OpenHouseRemarks: 'Side gate entry.' }),
      },
    ]);

    renderPage();

    expect(await screen.findByText('Saturday, August 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('1:00 PM – 4:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Side gate entry.')).toBeInTheDocument();
  });

  it('shows an error instead of crashing for an invalid id', async () => {
    fetchPropertyDetail.mockRejectedValue(new Error('id must be an integer'));
    fetchPropertyOpenHouses.mockRejectedValue(new Error('id must be an integer'));

    renderPage('invalid-id');

    expect(await screen.findByText(/property unavailable/i)).toBeInTheDocument();
    expect(screen.getByText('id must be an integer')).toBeInTheDocument();
    // The user still needs a way back.
    expect(screen.getByRole('link', { name: /back to listings/i })).toBeInTheDocument();
  });

  it('shows an error when the property does not exist', async () => {
    fetchPropertyDetail.mockRejectedValue(new Error('Property with id 999999 not found'));
    fetchPropertyOpenHouses.mockRejectedValue(new Error('Property with id 999999 not found'));

    renderPage('999999');

    expect(await screen.findByText(/property with id 999999 not found/i)).toBeInTheDocument();
  });

  it('still renders the property when open houses fail to load', async () => {
    fetchPropertyDetail.mockResolvedValue(PROPERTY);
    fetchPropertyOpenHouses.mockRejectedValue(new Error('Internal server error'));

    renderPage();

    expect(await screen.findByText('$450,000')).toBeInTheDocument();
    expect(screen.getByText(/couldn’t load open houses/i)).toBeInTheDocument();
  });
});
