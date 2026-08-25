import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PropertyMap from './PropertyMap';

const frame = () => document.querySelector('iframe');

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('PropertyMap', () => {
  it('renders an iframe pointing at the property coordinates', () => {
    render(<PropertyMap latitude={45.5152} longitude={-122.6784} address="123 Main St" />);

    const src = frame().getAttribute('src');
    expect(src).toContain('https://www.google.com/maps/embed/v1/place');
    expect(src).toContain('key=test-key');
    expect(src).toContain('q=45.5152,-122.6784');
    expect(src).toContain('zoom=15');
  });

  it('accepts coordinates that arrive from the database as strings', () => {
    render(<PropertyMap latitude="45.5152" longitude="-122.6784" />);
    expect(frame().getAttribute('src')).toContain('q=45.5152,-122.6784');
  });

  it('renders nothing when either coordinate is missing', () => {
    const { container: noLng } = render(<PropertyMap latitude={45.5152} longitude={null} />);
    expect(noLng).toBeEmptyDOMElement();

    const { container: noLat } = render(<PropertyMap latitude={null} longitude={-122.6784} />);
    expect(noLat).toBeEmptyDOMElement();

    const { container: neither } = render(<PropertyMap />);
    expect(neither).toBeEmptyDOMElement();
  });

  it('renders nothing for unusable coordinate values', () => {
    // 0/0 is the feed's "not geocoded" sentinel, and out-of-range values are junk.
    const { container: nullIsland } = render(<PropertyMap latitude={0} longitude={0} />);
    expect(nullIsland).toBeEmptyDOMElement();

    const { container: outOfRange } = render(<PropertyMap latitude={999} longitude={-122.6} />);
    expect(outOfRange).toBeEmptyDOMElement();

    const { container: notNumeric } = render(<PropertyMap latitude="abc" longitude="def" />);
    expect(notNumeric).toBeEmptyDOMElement();
  });

  it('links to Google Maps directions in a new tab', () => {
    render(<PropertyMap latitude={45.5152} longitude={-122.6784} />);

    const link = screen.getByRole('link', { name: /get directions/i });
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=45.5152%2C-122.6784'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows a hint instead of a broken frame when the API key is missing', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    vi.stubEnv('REACT_APP_GOOGLE_MAPS_API_KEY', '');

    render(<PropertyMap latitude={45.5152} longitude={-122.6784} />);

    expect(frame()).toBeNull();
    expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
    // The directions link works without a key, so it should still be there.
    expect(screen.getByRole('link', { name: /get directions/i })).toBeInTheDocument();
  });
});
