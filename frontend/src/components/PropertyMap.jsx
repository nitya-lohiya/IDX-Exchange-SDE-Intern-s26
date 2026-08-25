import PropTypes from "prop-types";
import "./PropertyMap.css";

// Vite exposes env vars on import.meta.env, not process.env. VITE_ is the native
// prefix; REACT_APP_ is accepted too via envPrefix in vite.config.js so the
// Create-React-App style name from the setup instructions also works.
// Read at render time rather than module load so tests can stub the env.
function getApiKey() {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

/**
 * Coerce a coordinate to a number, rejecting values that can't be plotted.
 * The feed stores these as strings, and rows with no geocode carry 0 rather than
 * NULL — plotting those would drop a pin in the ocean off West Africa.
 */
function toCoordinate(value, limit) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return n;
}

export default function PropertyMap({ latitude, longitude, address }) {
  const lat = toCoordinate(latitude, 90);
  const lng = toCoordinate(longitude, 180);

  // Requires both coordinates — a map with only one is meaningless.
  if (lat === null || lng === null || (lat === 0 && lng === 0)) {
    return null;
  }

  const apiKey = getApiKey();
  const position = `${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(position)}`;

  return (
    <section className="property-map">
      <div className="property-map__header">
        <h2>Location</h2>
        <a
          className="property-map__directions"
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Directions
        </a>
      </div>

      {apiKey ? (
        <iframe
          className="property-map__frame"
          title={address ? `Map of ${address}` : "Property location map"}
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${position}&zoom=15`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="property-map__fallback">
          Map unavailable — set <code>VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code>frontend/.env</code> and restart the dev server.
        </div>
      )}
    </section>
  );
}

PropertyMap.propTypes = {
  latitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  longitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  address: PropTypes.string,
};
