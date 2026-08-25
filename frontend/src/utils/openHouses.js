/**
 * Open house rows come back with the columns the API selects explicitly
 * (date, startTime, endTime) plus the entire raw MLS record as a JSON string in
 * `rawData` (the all_data column). Fields the API doesn't alias — remarks being
 * the one we need — only exist inside that blob, so we dig them out here on the
 * client rather than changing the backend.
 */

// Key casing varies between feeds, so check the variants we've seen.
const REMARKS_KEYS = ["OpenHouseRemarks", "OpenHouseremarks", "openHouseRemarks", "Remarks"];

/** Pull OpenHouseRemarks out of an open house's all_data blob. Returns null if absent. */
export function getOpenHouseRemarks(openHouse) {
  if (!openHouse) return null;

  // Prefer a top-level field if the API ever starts aliasing it.
  if (typeof openHouse.remarks === "string" && openHouse.remarks.trim()) {
    return openHouse.remarks.trim();
  }

  const raw = openHouse.rawData ?? openHouse.all_data;
  if (!raw) return null;

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;

  for (const key of REMARKS_KEYS) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

/**
 * Format an open house date for display.
 * MySQL DATE values arrive as "2026-08-15" or "2026-08-15T00:00:00.000Z". We read
 * the calendar parts out of the string directly — passing the raw value to
 * new Date() would interpret it as UTC midnight and shift the day backwards for
 * anyone west of Greenwich.
 */
export function formatOpenHouseDate(value) {
  if (!value) return null;

  const text = typeof value === "string" ? value : new Date(value).toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a time value like "14:30:00" or "2026-08-15T14:30:00" as "2:30 PM".
 * Returns null when there's nothing usable so callers can hide the field.
 */
export function formatOpenHouseTime(value) {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  const match = /(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || hours > 23 || !Number.isFinite(minutes) || minutes > 59) {
    return null;
  }

  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** "1:00 PM – 4:00 PM", or just one side if the other is missing. */
export function formatOpenHouseTimeRange(startTime, endTime) {
  const start = formatOpenHouseTime(startTime);
  const end = formatOpenHouseTime(endTime);

  if (start && end) return `${start} – ${end}`;
  return start || end || null;
}
