import PropTypes from "prop-types";
import { useState } from "react";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageCarousel.css";

/**
 * Photo carousel for listing cards.
 *
 * The card wraps its contents in a <Link>, so a click on an arrow would
 * otherwise bubble up and navigate to the detail page. stopPropagation keeps the
 * event from reaching the Link's handler, and preventDefault stops the browser
 * from following the anchor on its own — without it you'd get a full page reload
 * instead of a silent no-op.
 */
export default function PropertyImageCarousel({ rawPhotos, alt = "Property photo" }) {
  const photos = parsePhotos(rawPhotos);
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);

  const total = photos.length;
  // Guard the index in case the photo list changes underneath us.
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  const step = (event, delta) => {
    event.preventDefault();
    event.stopPropagation();
    setBroken(false);
    setIndex((current) => (current + delta + total) % total);
  };

  if (total === 0) {
    return (
      <div className="carousel">
        <div className="carousel__placeholder">No photo</div>
      </div>
    );
  }

  return (
    <div className="carousel">
      {broken ? (
        <div className="carousel__placeholder">Image unavailable</div>
      ) : (
        <img
          className="carousel__image"
          src={photos[safeIndex]}
          alt={`${alt} ${safeIndex + 1} of ${total}`}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}

      {total > 1 && (
        <>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--prev"
            aria-label="Previous photo"
            onClick={(event) => step(event, -1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--next"
            aria-label="Next photo"
            onClick={(event) => step(event, 1)}
          >
            ›
          </button>
          <div className="carousel__counter">
            {safeIndex + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}

PropertyImageCarousel.propTypes = {
  // The raw L_Photos value straight from the API; parsed inside the component.
  rawPhotos: PropTypes.string,
  alt: PropTypes.string,
};
