const request = require("supertest");

jest.mock("../db", () => ({ query: jest.fn() }));

const pool = require("../db");
const app = require("../app");

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/health", () => {
  it("reports ok when the database answers", async () => {
    pool.query.mockResolvedValueOnce([[{ 1: 1 }], []]);

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "connected" });
  });

  it("reports a 500 when the database is unreachable", async () => {
    pool.query.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:3306"));

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(500);
    expect(res.body.status).toBe("error");
    expect(res.body.database).toBe("disconnected");
  });
});

describe("unknown routes", () => {
  it("404s on a path the app does not serve", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});
