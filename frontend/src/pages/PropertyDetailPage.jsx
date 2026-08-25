import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPropertyDetail, fetchPropertyOpenHouses } from "../api/client";
import PropertyImageGallery from "../components/PropertyImageGallery";
import PropertyMap from "../components/PropertyMap";
import OpenHouseList from "../components/OpenHouseList";
import "./PropertyDetailPage.css";

/**
 * The detail endpoint returns the raw MLS row, and column naming is inconsistent
 * across feeds (remarks in particular). Read through a list of candidates and
 * take the first one that actually holds a value.
 */
function firstValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

const DESCRIPTION_KEYS = [
  "LR_Remarks",
  "L_Remarks",
  "PublicRemarks",
  "L_PublicRemarks",
  "Remarks",
  "description",
];

function formatPrice(price) {
  const n = Number(price);
  if (price === null || price === undefined || !Number.isFinite(n)) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(value) {
  const n = Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return null;
  return n.toLocaleString();
}

function formatBaths(baths) {
  const n = Number(baths);
  if (baths === null || baths === undefined || !Number.isFinite(n)) return null;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export default function PropertyDetailPage() {
  const { id } = useParams();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openHouses, setOpenHouses] = useState([]);
  const [openHousesLoading, setOpenHousesLoading] = useState(true);
  const [openHousesError, setOpenHousesError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setProperty(null);

    fetchPropertyDetail(id)
      .then((data) => {
        if (!cancelled) setProperty(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load this property");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Open houses load independently — a failure there shouldn't blank the page.
  useEffect(() => {
    let cancelled = false;

    setOpenHousesLoading(true);
    setOpenHousesError(null);
    setOpenHouses([]);

    fetchPropertyOpenHouses(id)
      .then((data) => {
        if (!cancelled) setOpenHouses(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setOpenHousesError(err.message || "Failed to load open houses");
      })
      .finally(() => {
        if (!cancelled) setOpenHousesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="detail-page">
        <BackLink />
        <div className="detail-page__status">Loading property…</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="detail-page">
        <BackLink />
        <div className="detail-page__status detail-page__status--error">
          <h1>Property unavailable</h1>
          <p>{error || "We couldn’t find that property."}</p>
        </div>
      </div>
    );
  }

  const address = property.L_Address || "Address unavailable";
  const city = property.L_City || "";
  const state = property.L_State || "";
  const zip = property.L_Zip || "";
  const cityLine = [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ");
  const fullAddress = [address, cityLine].filter(Boolean).join(", ");

  const beds = property.L_Keyword2;
  const baths = formatBaths(property.LM_Dec_3);
  const sqft = formatNumber(property.LM_Int2_3);
  const yearBuilt = property.YearBuilt;
  const description = firstValue(property, DESCRIPTION_KEYS);

  const details = [
    ["MLS #", property.L_ListingID],
    ["Status", property.L_Status],
    ["Property type", firstValue(property, ["L_Type_", "PropertyType", "L_PropertyType"])],
    ["City", city],
    ["State", state],
    ["Zip code", zip],
    ["Year built", yearBuilt],
    ["Square feet", sqft],
    ["Bedrooms", beds],
    ["Bathrooms", baths],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");

  return (
    <div className="detail-page">
      <BackLink />

      <PropertyImageGallery rawPhotos={property.L_Photos} alt={address} />

      <header className="detail-page__header">
        <div className="detail-page__price">{formatPrice(property.L_SystemPrice)}</div>
        <h1 className="detail-page__address">{address}</h1>
        {cityLine && <p className="detail-page__city">{cityLine}</p>}

        <div className="detail-page__stats">
          <Stat value={beds} label="Beds" />
          <Stat value={baths} label="Baths" />
          <Stat value={sqft} label="Sq Ft" />
          <Stat value={yearBuilt} label="Year Built" />
        </div>
      </header>

      <div className="detail-page__columns">
        <div className="detail-page__main">
          {description && (
            <section className="detail-page__section">
              <h2>Description</h2>
              <p className="detail-page__description">{description}</p>
            </section>
          )}

          <section className="detail-page__section">
            <h2>Property Details</h2>
            <dl className="detail-page__details">
              {details.map(([label, value]) => (
                <div className="detail-page__detail" key={label}>
                  <dt>{label}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="detail-page__aside">
          <section className="detail-page__section">
            <OpenHouseList
              openHouses={openHouses}
              loading={openHousesLoading}
              error={openHousesError}
            />
          </section>

          <section className="detail-page__section">
            <PropertyMap
              latitude={property.LMD_MP_Latitude}
              longitude={property.LMD_MP_Longitude}
              address={fullAddress}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link className="detail-page__back" to="/">
      ← Back to listings
    </Link>
  );
}

function Stat({ value, label }) {
  return (
    <div className="detail-page__stat">
      <span className="detail-page__stat-value">{value ?? "—"}</span>
      <span className="detail-page__stat-label">{label}</span>
    </div>
  );
}
