import PropTypes from "prop-types";
import { useState } from "react";
import "./PropertyFilters.css";

const EMPTY_FILTERS = {
  city: "",
  zipcode: "",
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
};

const BED_OPTIONS = ["", "1", "2", "3", "4", "5"];
const BATH_OPTIONS = ["", "1", "2", "3", "4", "5"];

export default function PropertyFilters({ onSearch, onClear }) {
  const [values, setValues] = useState(EMPTY_FILTERS);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(values);
  };

  const handleClear = () => {
    setValues(EMPTY_FILTERS);
    onClear();
  };

  return (
    <form className="property-filters" onSubmit={handleSubmit}>
      <div className="property-filters__field">
        <label htmlFor="filter-city">City</label>
        <input
          id="filter-city"
          name="city"
          type="text"
          value={values.city}
          onChange={handleChange}
          placeholder="e.g. Portland"
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-zipcode">ZIP code</label>
        <input
          id="filter-zipcode"
          name="zipcode"
          type="text"
          value={values.zipcode}
          onChange={handleChange}
          placeholder="e.g. 90210"
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-minPrice">Min price</label>
        <input
          id="filter-minPrice"
          name="minPrice"
          type="number"
          min="0"
          value={values.minPrice}
          onChange={handleChange}
          placeholder="0"
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-maxPrice">Max price</label>
        <input
          id="filter-maxPrice"
          name="maxPrice"
          type="number"
          min="0"
          value={values.maxPrice}
          onChange={handleChange}
          placeholder="Any"
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-beds">Beds</label>
        <select id="filter-beds" name="beds" value={values.beds} onChange={handleChange}>
          {BED_OPTIONS.map((n) => (
            <option key={n || "any"} value={n}>
              {n === "" ? "Any" : `${n}+`}
            </option>
          ))}
        </select>
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-baths">Baths</label>
        <select id="filter-baths" name="baths" value={values.baths} onChange={handleChange}>
          {BATH_OPTIONS.map((n) => (
            <option key={n || "any"} value={n}>
              {n === "" ? "Any" : `${n}+`}
            </option>
          ))}
        </select>
      </div>

      <div className="property-filters__actions">
        <button type="submit" className="property-filters__search">Search</button>
        <button type="button" className="property-filters__clear" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  );
}

PropertyFilters.propTypes = {
  onSearch: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};
