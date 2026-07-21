import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import PropertyCard from "../components/PropertyCard";
import "./ListingsPage.css";

const PAGE_SIZE = 20;

export default function ListingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchProperties({ limit: PAGE_SIZE, offset: 0 })
      .then((response) => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load properties");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="listings-page">
      <header className="listings-page__header">
        <h1>Properties</h1>
        {data && (
          <p className="listings-page__count">
            Showing {data.results.length} of {data.total.toLocaleString()} properties
          </p>
        )}
      </header>

      {loading && <div className="listings-page__status">Loading properties…</div>}

      {error && (
        <div className="listings-page__status listings-page__status--error">
          Couldn’t load properties: {error}
        </div>
      )}

      {!loading && !error && data && data.results.length === 0 && (
        <div className="listings-page__status">No properties found.</div>
      )}

      {!loading && !error && data && data.results.length > 0 && (
        <div className="listings-page__grid">
          {data.results.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
