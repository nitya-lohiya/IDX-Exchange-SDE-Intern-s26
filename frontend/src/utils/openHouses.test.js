import { describe, it, expect } from 'vitest';
import {
  getOpenHouseRemarks,
  formatOpenHouseDate,
  formatOpenHouseTime,
  formatOpenHouseTimeRange,
} from './openHouses';

describe('getOpenHouseRemarks', () => {
  it('extracts OpenHouseRemarks from the all_data JSON blob', () => {
    const openHouse = {
      id: 1,
      rawData: JSON.stringify({
        L_ListingID: '123',
        OpenHouseRemarks: 'Enter through the side gate.',
      }),
    };
    expect(getOpenHouseRemarks(openHouse)).toBe('Enter through the side gate.');
  });

  it('reads the all_data key when the API has not aliased it', () => {
    const openHouse = { all_data: JSON.stringify({ OpenHouseRemarks: 'Refreshments served.' }) };
    expect(getOpenHouseRemarks(openHouse)).toBe('Refreshments served.');
  });

  it('returns null when the blob has no remarks key', () => {
    const openHouse = { rawData: JSON.stringify({ L_ListingID: '123' }) };
    expect(getOpenHouseRemarks(openHouse)).toBeNull();
  });

  it('returns null for malformed JSON instead of throwing', () => {
    const openHouse = { rawData: '{broken json' };
    expect(() => getOpenHouseRemarks(openHouse)).not.toThrow();
    expect(getOpenHouseRemarks(openHouse)).toBeNull();
  });

  it('returns null when remarks are present but blank', () => {
    const openHouse = { rawData: JSON.stringify({ OpenHouseRemarks: '   ' }) };
    expect(getOpenHouseRemarks(openHouse)).toBeNull();
  });

  it('handles missing rows and missing blobs', () => {
    expect(getOpenHouseRemarks(null)).toBeNull();
    expect(getOpenHouseRemarks({})).toBeNull();
  });
});

describe('formatOpenHouseDate', () => {
  it('formats a plain MySQL date', () => {
    expect(formatOpenHouseDate('2026-08-15')).toBe('Saturday, August 15, 2026');
  });

  it('does not shift the day for an ISO timestamp at UTC midnight', () => {
    // new Date('2026-08-15T00:00:00.000Z').toLocaleDateString() would report
    // August 14 in any timezone behind UTC — the calendar date must survive.
    expect(formatOpenHouseDate('2026-08-15T00:00:00.000Z')).toBe('Saturday, August 15, 2026');
  });

  it('returns null for missing or unparseable values', () => {
    expect(formatOpenHouseDate(null)).toBeNull();
    expect(formatOpenHouseDate('')).toBeNull();
    expect(formatOpenHouseDate('someday')).toBeNull();
  });
});

describe('formatOpenHouseTime', () => {
  it('converts 24-hour times to 12-hour with a period', () => {
    expect(formatOpenHouseTime('13:00:00')).toBe('1:00 PM');
    expect(formatOpenHouseTime('09:30:00')).toBe('9:30 AM');
  });

  it('handles midnight and noon', () => {
    expect(formatOpenHouseTime('00:15:00')).toBe('12:15 AM');
    expect(formatOpenHouseTime('12:00:00')).toBe('12:00 PM');
  });

  it('pulls the time out of a full timestamp', () => {
    expect(formatOpenHouseTime('2026-08-15T14:30:00')).toBe('2:30 PM');
  });

  it('returns null when there is no usable time', () => {
    expect(formatOpenHouseTime(null)).toBeNull();
    expect(formatOpenHouseTime('')).toBeNull();
    expect(formatOpenHouseTime('afternoon')).toBeNull();
  });
});

describe('formatOpenHouseTimeRange', () => {
  it('joins both ends of the range', () => {
    expect(formatOpenHouseTimeRange('13:00:00', '16:00:00')).toBe('1:00 PM – 4:00 PM');
  });

  it('falls back to whichever side exists', () => {
    expect(formatOpenHouseTimeRange('13:00:00', null)).toBe('1:00 PM');
    expect(formatOpenHouseTimeRange(null, '16:00:00')).toBe('4:00 PM');
  });

  it('returns null when neither side is usable', () => {
    expect(formatOpenHouseTimeRange(null, null)).toBeNull();
  });
});
