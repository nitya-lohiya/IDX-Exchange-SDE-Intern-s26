const request = require("supertest");

jest.mock("../db", () => ({ query: jest.fn() }));

const pool = require("../db");
const app = require("../app");
const { rows, openHouseRow } = require("./helpers");

/**
 * This route runs two queries: it resolves the numeric id to the property's
 * L_ListingID, then looks up open houses by that listing id (open houses are
 * linked by listing id, not by the property's primary key).
 */
beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/properties/:id/openhouses", () => {
  it("returns the open houses for an existing property", async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "MLS-1" }]))
      .mockResolvedValueOnce(rows([openHouseRow(), openHouseRow({ id: 11 })]));

    const res = await request(app).get("/api/properties/1/openhouses");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ id: 10, date: "2026-08-15" });
  });

  it("includes the all_data blob so the client can read remarks from it", async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "MLS-1" }]))
      .mockResolvedValueOnce(rows([openHouseRow()]));

    const res = await request(app).get("/api/properties/1/openhouses");

    // Remarks live only inside all_data; the API aliases it as rawData and the
    // component parses it. If this alias disappears, remarks silently vanish.
    expect(res.body[0].rawData).toBeDefined();
    expect(JSON.parse(res.body[0].rawData).OpenHouseRemarks).toBe("Side gate entry.");
  });

  it("queries open houses by listing id, not by the numeric property id", async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "MLS-1" }]))
      .mockResolvedValueOnce(rows([]));

    await request(app).get("/api/properties/1/openhouses");

    const [sql, values] = pool.query.mock.calls[1];
    expect(sql).toContain("WHERE L_ListingID = ?");
    expect(values).toEqual(["MLS-1"]);
  });

  it("orders open houses chronologically", async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "MLS-1" }]))
      .mockResolvedValueOnce(rows([]));

    await request(app).get("/api/properties/1/openhouses");

    expect(pool.query.mock.calls[1][0]).toMatch(/ORDER BY OpenHouseDate ASC, OH_StartTime ASC/);
  });

  it("returns an empty array when the property has no open houses", async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "MLS-1" }]))
      .mockResolvedValueOnce(rows([]));

    const res = await request(app).get("/api/properties/1/openhouses");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns an empty array when the property has no listing id at all", async () => {
    pool.query.mockResolvedValueOnce(rows([{ L_ListingID: null }]));

    const res = await request(app).get("/api/properties/1/openhouses");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    // Short-circuits: no point querying open houses without a listing id.
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("returns 404 for an unknown property", async () => {
    pool.query.mockResolvedValueOnce(rows([]));

    const res = await request(app).get("/api/properties/999999/openhouses");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Property with id 999999 not found/);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for an invalid id without touching the database", async () => {
    const res = await request(app).get("/api/properties/not-a-number/openhouses");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id must be an integer/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("is matched before the /:id route so the suffix is not swallowed", async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ L_ListingID: "MLS-1" }]))
      .mockResolvedValueOnce(rows([openHouseRow()]));

    const res = await request(app).get("/api/properties/1/openhouses");

    // An array, not a property object — proves /:id/openhouses won the match.
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 500 without leaking database internals", async () => {
    pool.query.mockRejectedValueOnce(new Error("ER_BAD_FIELD_ERROR"));

    const res = await request(app).get("/api/properties/1/openhouses");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
