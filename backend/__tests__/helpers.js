/**
 * Shared test setup.
 *
 * The database pool is mocked at the module boundary so no test ever needs a
 * running MySQL. `pool.query` is a plain jest.fn(), and each test queues the
 * rows it expects the route to receive. mysql2 resolves to a [rows, fields]
 * tuple and the routes destructure the first element, so every mock value here
 * is wrapped in an array to match that shape.
 */
const rows = (value) => [value, []];

/** The columns the list endpoint aliases, as one representative row. */
const listRow = (overrides = {}) => ({
  id: 1,
  listingId: "MLS-1",
  address: "123 Main St",
  city: "Portland",
  state: "OR",
  zipcode: "97201",
  price: 450000,
  beds: 3,
  baths: 2,
  sqft: 1800,
  photos: JSON.stringify(["https://cdn.test/1.jpg"]),
  yearBuilt: 1998,
  status: "Active",
  listedDate: "2026-01-15",
  ...overrides,
});

/** The detail endpoint returns SELECT *, i.e. raw MLS column names. */
const detailRow = (overrides = {}) => ({
  id: 1,
  L_ListingID: "MLS-1",
  L_Address: "123 Main St",
  L_City: "Portland",
  L_SystemPrice: 450000,
  L_Photos: JSON.stringify(["https://cdn.test/1.jpg"]),
  LMD_MP_Latitude: 45.5152,
  LMD_MP_Longitude: -122.6784,
  ...overrides,
});

const openHouseRow = (overrides = {}) => ({
  id: 10,
  listingId: "MLS-1",
  date: "2026-08-15",
  startTime: "13:00:00",
  endTime: "16:00:00",
  startDate: "2026-08-15",
  endDate: "2026-08-15",
  rawData: JSON.stringify({ OpenHouseRemarks: "Side gate entry." }),
  ...overrides,
});

module.exports = { rows, listRow, detailRow, openHouseRow };
