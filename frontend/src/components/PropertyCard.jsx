import "./PropertyCard.css";

function parseFirstPhoto(rawPhotos) {
  if (!rawPhotos) return null;
  try {
    const parsed = JSON.parse(rawPhotos);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const first = parsed[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      return first.url || first.Uri || first.href || null;
    }
    return null;
  } catch {
    return null;
  }
}

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
  const photo = parseFirstPhoto(property.L_Photos || property.photos);
  const address = property.address || property.L_Address || "Address unavailable";
  const city = property.city || property.L_City || "";
  const state = property.state || property.L_State || "";
  const price = property.price ?? property.L_SystemPrice;
  const beds = property.beds ?? property.L_Keyword2;
  const baths = property.baths ?? property.LM_Dec_3;
  const sqft = property.sqft ?? property.LM_Int2_3;

  return (
    <article className="property-card">
      <div className="property-card__photo">
        {photo ? (
          <img
            src={photo}
            alt={address}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.classList.add("property-card__photo--broken");
            }}
          />
        ) : (
          <div className="property-card__no-photo">No photo</div>
        )}
      </div>

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
    </article>
  );
}
