const request = require("supertest");

jest.mock("../db", () => ({ query: jest.fn() }));

const pool = require("../db");
const app = require("../app");
const { rows, detailRow } = require("./helpers");

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/properties/:id", () => {
  it("returns the full raw MLS row for an existing property", async () => {
    pool.query.mockResolvedValueOnce(rows([detailRow()]));

    const res = await request(app).get("/api/properties/1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      L_Address: "123 Main St",
      LMD_MP_Latitude: 45.5152,
    });
  });

  it("looks the property up by bound id, not string interpolation", async () => {
    pool.query.mockResolvedValueOnce(rows([detailRow()]));

    await request(app).get("/api/properties/42");

    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain("WHERE id = ?");
    expect(values).toEqual([42]);
  });

  it("returns 404 when the property does not exist", async () => {
    pool.query.mockResolvedValueOnce(rows([]));

    const res = await request(app).get("/api/properties/999999");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Property with id 999999 not found/);
  });

  it("returns 400 for a non-numeric id rather than hitting the database", async () => {
    const res = await request(app).get("/api/properties/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id must be an integer/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("returns 400 for a zero or negative id", async () => {
    const zero = await request(app).get("/api/properties/0");
    expect(zero.status).toBe(400);
    expect(zero.body.error).toMatch(/id must be >= 1/);

    const negative = await request(app).get("/api/properties/-3");
    expect(negative.status).toBe(400);
  });

  it("returns 400 for an id beyond the signed 32-bit range", async () => {
    const res = await request(app).get("/api/properties/2147483648");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id must be <=/);
  });

  it("returns 400 for a fractional id", async () => {
    const res = await request(app).get("/api/properties/1.5");
    expect(res.status).toBe(400);
  });

  it("returns 500 without leaking database internals", async () => {
    pool.query.mockRejectedValueOnce(new Error("ECONNREFUSED 127.0.0.1:3306"));

    const res = await request(app).get("/api/properties/1");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED/);
  });
});
