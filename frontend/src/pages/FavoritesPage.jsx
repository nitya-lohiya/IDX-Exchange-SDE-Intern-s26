import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useFavorites from "../hooks/useFavorites";
import { fetchPropertyDetail } from "../api/client";
import PropertyCard from "../components/PropertyCard";
import "./FavoritesPage.css";

/**
 * localStorage only holds ids, so the database stays the source of truth for
 * the property data itself — a saved listing whose price changed shows the new
 * price, and one that has since been removed is reported instead of rendered
 * from a stale snapshot.
 */
export default function FavoritesPage() {
  const { favorites, count, clearFavorites } = useFavorites();

  // id -> property object, or null when the listing could not be loaded.
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(false);
  // Ids we've already started fetching, so re-renders don't refetch them.
  const requestedRef = useRef(new Set());

  useEffect(() => {
    const missing = favorites.filter((id) => !requestedRef.current.has(id));
    if (missing.length === 0) return undefined;

    missing.forEach((id) => requestedRef.current.add(id));
    let cancelled = false;
    setLoading(true);

    // allSettled, not all: one removed listing must not blank the whole page.
    Promise.allSettled(missing.map((id) => fetchPropertyDetail(id)))
      .then((results) => {
        if (cancelled) {
          missing.forEach((id) => requestedRef.current.delete(id));
          return;
        }
        setProperties((previous) => {
          const next = { ...previous };
          results.forEach((result, i) => {
            next[missing[i]] = result.status === "fulfilled" ? result.value : null;
          });
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [favorites]);

  return (
    <div className="favorites-page">
      <header className="favorites-page__header">
        <Link className="favorites-page__back" to="/">
          ← Back to listings
        </Link>
        <h1>
          Favorites <span className="favorites-page__count">({count})</span>
        </h1>
        {count > 0 && (
          <button type="button" className="favorites-page__clear" onClick={clearFavorites}>
            Clear all
          </button>
        )}
      </header>

      {count === 0 ? (
        <div className="favorites-page__empty">
          <p>You haven’t saved any properties yet.</p>
          <p>
            Tap the heart on any listing to save it here.{" "}
            <Link to="/">Browse properties →</Link>
          </p>
        </div>
      ) : (
        <div className="favorites-page__grid">
          {favorites.map((id) => {
            const property = properties[id];

            if (property === undefined) {
              return (
                <div className="favorites-page__placeholder" key={id}>
                  Loading saved property…
                </div>
              );
            }

            if (property === null) {
              return (
                <div className="favorites-page__placeholder" key={id}>
                  This listing is no longer available.
                </div>
              );
            }

            return <PropertyCard key={id} property={property} />;
          })}
        </div>
      )}

      {loading && count > 0 && (
        <p className="favorites-page__status">Loading saved properties…</p>
      )}
    </div>
  );
}
