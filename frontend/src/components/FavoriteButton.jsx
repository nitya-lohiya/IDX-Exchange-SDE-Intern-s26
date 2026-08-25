import PropTypes from "prop-types";
import useFavorites from "../hooks/useFavorites";
import "./FavoriteButton.css";

/**
 * Heart toggle for a property.
 *
 * Like the carousel arrows, this sits inside the card's <Link>. stopPropagation
 * keeps the click from reaching React Router's handler, and preventDefault stops
 * the browser following the anchor on its own — without both you'd navigate to
 * the detail page every time someone favorited a card.
 */
export default function FavoriteButton({ propertyId, label = "this property" }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(propertyId);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(propertyId);
  };

  return (
    <button
      type="button"
      className={active ? "favorite-button favorite-button--active" : "favorite-button"}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favorites` : `Save ${label} to favorites`}
      title={active ? "Remove from favorites" : "Save to favorites"}
    >
      {/* Filled vs outlined is the fill attribute, so screen readers only ever
          see the aria-label above. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 21s-6.7-4.35-9.33-8.06C.9 10.3 1.6 6.9 4.3 5.5a5.2 5.2 0 0 1 6.2 1.2l1.5 1.6 1.5-1.6a5.2 5.2 0 0 1 6.2-1.2c2.7 1.4 3.4 4.8 1.63 7.44C18.7 16.65 12 21 12 21z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

FavoriteButton.propTypes = {
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string,
};
