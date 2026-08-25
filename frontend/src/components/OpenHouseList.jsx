import PropTypes from "prop-types";
import {
  getOpenHouseRemarks,
  formatOpenHouseDate,
  formatOpenHouseTimeRange,
} from "../utils/openHouses";
import "./OpenHouseList.css";

export default function OpenHouseList({ openHouses, loading, error }) {
  return (
    <section className="open-houses">
      <h2>Open Houses</h2>

      {loading && <p className="open-houses__status">Loading open houses…</p>}

      {!loading && error && (
        <p className="open-houses__status open-houses__status--error">
          Couldn’t load open houses: {error}
        </p>
      )}

      {!loading && !error && (!openHouses || openHouses.length === 0) && (
        <p className="open-houses__status">No open houses scheduled</p>
      )}

      {!loading && !error && openHouses && openHouses.length > 0 && (
        <ul className="open-houses__list">
          {openHouses.map((openHouse) => {
            const date = formatOpenHouseDate(openHouse.date ?? openHouse.startDate);
            const times = formatOpenHouseTimeRange(openHouse.startTime, openHouse.endTime);
            // Remarks live inside the all_data blob, not in a dedicated column.
            const remarks = getOpenHouseRemarks(openHouse);

            return (
              <li className="open-houses__item" key={openHouse.id}>
                <div className="open-houses__when">
                  <span className="open-houses__date">{date || "Date to be announced"}</span>
                  {times && <span className="open-houses__times">{times}</span>}
                </div>
                {remarks && <p className="open-houses__remarks">{remarks}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

OpenHouseList.propTypes = {
  openHouses: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      date: PropTypes.string,
      startTime: PropTypes.string,
      endTime: PropTypes.string,
      // all_data blob; remarks are dug out of this in the component.
      rawData: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  error: PropTypes.string,
};
