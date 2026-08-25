import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageGallery.css";

/**
 * Detail-page gallery: one large image, a scrolling thumbnail strip, and a
 * full-screen lightbox.
 *
 * Keyboard handling note: a plain <div> is not in the tab order and cannot
 * receive keyboard events, so an onKeyDown on the lightbox overlay would never
 * fire. Giving the overlay tabIndex={-1} makes it programmatically focusable,
 * and the effect below moves focus onto it when it opens — that's what lets
 * Escape and the arrow keys reach the handler.
 */
export default function PropertyImageGallery({ rawPhotos, alt = "Property photo" }) {
  const photos = parsePhotos(rawPhotos);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const overlayRef = useRef(null);

  const total = photos.length;
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  // Move focus to the overlay once it's mounted so it receives key events, and
  // stop the page behind it from scrolling.
  useEffect(() => {
    if (!lightboxOpen) return undefined;

    overlayRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  if (total === 0) {
    return (
      <div className="gallery">
        <div className="gallery__main gallery__placeholder">No photos available</div>
      </div>
    );
  }

  const show = (nextIndex) => setIndex((nextIndex + total) % total);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setLightboxOpen(false);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      show(safeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(safeIndex - 1);
    }
  };

  return (
    <div className="gallery">
      <button
        type="button"
        className="gallery__main"
        onClick={() => setLightboxOpen(true)}
        aria-label="Open photo in full screen"
      >
        <img src={photos[safeIndex]} alt={`${alt} ${safeIndex + 1} of ${total}`} />
        <span className="gallery__counter">
          {safeIndex + 1} / {total}
        </span>
      </button>

      {total > 1 && (
        <div className="gallery__thumbs">
          {photos.map((photo, i) => (
            <button
              type="button"
              key={`${photo}-${i}`}
              className={
                i === safeIndex ? "gallery__thumb gallery__thumb--active" : "gallery__thumb"
              }
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === safeIndex}
            >
              <img src={photo} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="lightbox"
          ref={overlayRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Property photos"
          onKeyDown={handleKeyDown}
          // A click that lands on the backdrop itself (not on the image or the
          // controls inside it) means the user clicked outside — close.
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxOpen(false);
          }}
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close full screen view"
          >
            ×
          </button>

          {total > 1 && (
            <button
              type="button"
              className="lightbox__arrow lightbox__arrow--prev"
              onClick={() => show(safeIndex - 1)}
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <img
            className="lightbox__image"
            src={photos[safeIndex]}
            alt={`${alt} ${safeIndex + 1} of ${total}`}
          />

          {total > 1 && (
            <button
              type="button"
              className="lightbox__arrow lightbox__arrow--next"
              onClick={() => show(safeIndex + 1)}
              aria-label="Next photo"
            >
              ›
            </button>
          )}

          <div className="lightbox__counter">
            {safeIndex + 1} / {total}
          </div>
        </div>
      )}
    </div>
  );
}

PropertyImageGallery.propTypes = {
  rawPhotos: PropTypes.string,
  alt: PropTypes.string,
};
