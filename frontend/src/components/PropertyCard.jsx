import { Link } from "react-router-dom";
import PropertyImageCarousel from "./PropertyImageCarousel";
import "./PropertyCard.css";

function formatPrice(price) {
  if (price === null || price === undefined) return "Price on request";
  const n = Number(price);
  if (!Number.isFinite(n)) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatBaths(baths) {
  if (baths === null || baths === undefined) return "—";
  const n = Number(baths);
  if (!Number.isFinite(n)) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export default function PropertyCard({ property }) {
  const address = property.address || property.L_Address || "Address unavailable";
  const city = property.city || property.L_City || "";
  const state = property.state || property.L_State || "";
  const price = property.price ?? property.L_SystemPrice;
  const beds = property.beds ?? property.L_Keyword2;
  const baths = property.baths ?? property.LM_Dec_3;
  const sqft = property.sqft ?? property.LM_Int2_3;

  return (
    <article className="property-card">
      <Link className="property-card__link" to={`/property/${property.id}`}>
        <PropertyImageCarousel
          rawPhotos={property.photos || property.L_Photos}
          alt={address}
        />

        <div className="property-card__body">
          <div className="property-card__price">{formatPrice(price)}</div>
          <div className="property-card__address">{address}</div>
          <div className="property-card__location">
            {[city, state].filter(Boolean).join(", ") || "—"}
          </div>
          <div className="property-card__stats">
            <span><strong>{beds ?? "—"}</strong> bd</span>
            <span><strong>{formatBaths(baths)}</strong> ba</span>
            <span><strong>{sqft ? Number(sqft).toLocaleString() : "—"}</strong> sqft</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
