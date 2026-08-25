import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OpenHouseList from './OpenHouseList';

const withRemarks = {
  id: 1,
  date: '2026-08-15',
  startTime: '13:00:00',
  endTime: '16:00:00',
  rawData: JSON.stringify({
    L_ListingID: '123',
    OpenHouseRemarks: 'Street parking only — enter through the side gate.',
  }),
};

const withoutRemarks = {
  id: 2,
  date: '2026-08-16',
  startTime: '11:00:00',
  endTime: '13:00:00',
  rawData: JSON.stringify({ L_ListingID: '123' }),
};

describe('OpenHouseList', () => {
  it('shows the date, formatted time range, and remarks', () => {
    render(<OpenHouseList openHouses={[withRemarks]} loading={false} error={null} />);

    expect(screen.getByText('Saturday, August 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('1:00 PM – 4:00 PM')).toBeInTheDocument();
    expect(
      screen.getByText('Street parking only — enter through the side gate.')
    ).toBeInTheDocument();
  });

  it('renders an open house that has no remarks without complaint', () => {
    render(<OpenHouseList openHouses={[withoutRemarks]} loading={false} error={null} />);

    expect(screen.getByText('Sunday, August 16, 2026')).toBeInTheDocument();
    expect(screen.getByText('11:00 AM – 1:00 PM')).toBeInTheDocument();
  });

  it('lists every open house', () => {
    render(<OpenHouseList openHouses={[withRemarks, withoutRemarks]} loading={false} error={null} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows the empty state when there are no open houses', () => {
    render(<OpenHouseList openHouses={[]} loading={false} error={null} />);
    expect(screen.getByText('No open houses scheduled')).toBeInTheDocument();
  });

  it('shows the empty state when open houses are undefined', () => {
    render(<OpenHouseList loading={false} error={null} />);
    expect(screen.getByText('No open houses scheduled')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    render(<OpenHouseList openHouses={[]} loading error={null} />);

    expect(screen.getByText(/loading open houses/i)).toBeInTheDocument();
    expect(screen.queryByText('No open houses scheduled')).not.toBeInTheDocument();
  });

  it('shows an error state', () => {
    render(<OpenHouseList openHouses={[]} loading={false} error="Internal server error" />);

    expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    expect(screen.queryByText('No open houses scheduled')).not.toBeInTheDocument();
  });

  it('does not crash when all_data is malformed', () => {
    const broken = { id: 3, date: '2026-08-15', startTime: '13:00:00', rawData: '{oops' };

    expect(() =>
      render(<OpenHouseList openHouses={[broken]} loading={false} error={null} />)
    ).not.toThrow();
    expect(screen.getByText('Saturday, August 15, 2026')).toBeInTheDocument();
  });
});
