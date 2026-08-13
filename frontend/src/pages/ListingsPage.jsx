import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import Pagination from "../components/Pagination";
import "./ListingsPage.css";

const ITEMS_PER_PAGE = 20;

function cleanFilters(raw) {
  const cleaned = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

export default function ListingsPage() {
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setData(null);

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    fetchProperties({ ...cleanFilters(filters), limit: ITEMS_PER_PAGE, offset })
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
  }, [filters, currentPage]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ITEMS_PER_PAGE)) : 1;
  const rangeStart = data && data.results.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const rangeEnd = data ? rangeStart + data.results.length - 1 : 0;

  return (
    <div className="listings-page">
      <header className="listings-page__header">
        <h1>Properties</h1>
        {data && data.results.length > 0 && (
          <p className="listings-page__count">
            Showing {rangeStart}–{rangeEnd} of {data.total.toLocaleString()} properties
          </p>
        )}
      </header>

      <PropertyFilters onSearch={handleSearch} onClear={handleClear} />

      {loading && <div className="listings-page__status">Loading properties…</div>}

      {error && (
        <div className="listings-page__status listings-page__status--error">
          Couldn’t load properties: {error}
        </div>
      )}

      {!loading && !error && data && data.results.length === 0 && (
        <div className="listings-page__status">
          No properties match your filters. Try broadening your search.
        </div>
      )}

      {!loading && !error && data && data.results.length > 0 && (
        <>
          <div className="listings-page__grid">
            {data.results.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
