import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchProperties, fetchPropertyDetail } from './client';

describe('api client', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe('fetchProperties', () => {
    it('returns the parsed JSON body when the response is ok', async () => {
      const fakeResponse = { total: 2, limit: 20, offset: 0, results: [{ id: 1 }, { id: 2 }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeResponse,
      });

      const result = await fetchProperties({ limit: 20 });

      expect(result).toEqual(fakeResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws with the backend error message when the response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'limit must be an integer' }),
      });

      await expect(fetchProperties({ limit: 'abc' })).rejects.toThrow('limit must be an integer');
    });

    it('omits empty and null params from the query string', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ total: 0, results: [] }),
      });

      await fetchProperties({ city: '', zipcode: null, minPrice: undefined, limit: 10 });

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).not.toContain('city=');
      expect(calledUrl).not.toContain('zipcode=');
      expect(calledUrl).not.toContain('minPrice=');
    });
  });

  describe('fetchPropertyDetail', () => {
    it('encodes the id into the URL path', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 53 }),
      });

      await fetchPropertyDetail(53);

      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toBe('/api/properties/53');
    });
  });
});
