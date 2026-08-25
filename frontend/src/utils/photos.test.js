import { describe, it, expect } from 'vitest';
import { parsePhotos, parseFirstPhoto } from './photos';

describe('parsePhotos', () => {
  it('parses a JSON array of URL strings', () => {
    const raw = JSON.stringify(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
    expect(parsePhotos(raw)).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
  });

  it('pulls the URL out of an array of objects', () => {
    const raw = JSON.stringify([{ url: 'https://cdn.test/a.jpg' }, { Uri: 'https://cdn.test/b.jpg' }]);
    expect(parsePhotos(raw)).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
  });

  it('accepts an already-parsed array', () => {
    expect(parsePhotos(['https://cdn.test/a.jpg'])).toEqual(['https://cdn.test/a.jpg']);
  });

  it('returns an empty array for malformed JSON instead of throwing', () => {
    expect(() => parsePhotos('not json at all')).not.toThrow();
    expect(parsePhotos('not json at all')).toEqual([]);
  });

  it('returns an empty array for null, undefined, and empty values', () => {
    expect(parsePhotos(null)).toEqual([]);
    expect(parsePhotos(undefined)).toEqual([]);
    expect(parsePhotos('')).toEqual([]);
    expect(parsePhotos('[]')).toEqual([]);
  });

  it('drops entries with no usable URL', () => {
    const raw = JSON.stringify(['https://cdn.test/a.jpg', '', null, { caption: 'no url' }, 42]);
    expect(parsePhotos(raw)).toEqual(['https://cdn.test/a.jpg']);
  });

  it('returns an empty array when the JSON is not an array', () => {
    expect(parsePhotos('{"url":"https://cdn.test/a.jpg"}')).toEqual([]);
  });
});

describe('parseFirstPhoto', () => {
  it('returns the first photo URL', () => {
    const raw = JSON.stringify(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
    expect(parseFirstPhoto(raw)).toBe('https://cdn.test/a.jpg');
  });

  it('returns null when there are no photos', () => {
    expect(parseFirstPhoto('[]')).toBeNull();
    expect(parseFirstPhoto(null)).toBeNull();
  });
});
