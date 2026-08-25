/**
 * The MLS feed stores photos in the L_Photos column as a JSON-encoded array.
 * The shape is not guaranteed: sometimes it's an array of URL strings, sometimes
 * an array of objects, and sometimes the column is empty or malformed.
 * Every consumer should go through parsePhotos so a bad row degrades to "no
 * photos" instead of throwing during render.
 */

// Keys seen in the feed that hold the actual image URL when a photo is an object.
const URL_KEYS = ["url", "Url", "URL", "Uri", "uri", "href", "MediaURL", "location"];

function toUrl(entry) {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (entry && typeof entry === "object") {
    for (const key of URL_KEYS) {
      const value = entry[key];
      if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
  }
  return null;
}

/**
 * Parse an L_Photos value into an array of photo URLs.
 * Accepts the raw JSON string from the API, or an already-parsed array.
 * Always returns an array — never null, never throws.
 */
export function parsePhotos(rawPhotos) {
  if (!rawPhotos) return [];

  let parsed = rawPhotos;
  if (typeof rawPhotos === "string") {
    try {
      parsed = JSON.parse(rawPhotos);
    } catch {
      // Column held something that isn't JSON — treat the property as photo-less.
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map(toUrl).filter(Boolean);
}

/** Convenience wrapper for callers that only need a thumbnail. */
export function parseFirstPhoto(rawPhotos) {
  return parsePhotos(rawPhotos)[0] || null;
}
