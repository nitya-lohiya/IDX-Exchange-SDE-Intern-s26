const request = require("supertest");

jest.mock("../db", () => ({ query: jest.fn() }));

const pool = require("../db");
const app = require("../app");
const { rows, listRow } = require("./helpers");

/**
 * The list endpoint issues two queries per request: a COUNT(*) for pagination
 * and then the page of results. Every test therefore queues two mock responses,
 * and assertions about the SQL read from `pool.query.mock.calls`.
 */
const queueList = (results = [listRow()], total = results.length) => {
  pool.query
    .mockResolvedValueOnce(rows([{ total }]))
    .mockResolvedValueOnce(rows(results));
};

const countSql = () => pool.query.mock.calls[0][0];
const countValues = () => pool.query.mock.calls[0][1];
const resultsSql = () => pool.query.mock.calls[1][0];
const resultsValues = () => pool.query.mock.calls[1][1];

beforeEach(() => {
  pool.query.mockReset();
});

describe("GET /api/properties — success and shape", () => {
  it("returns total, limit, offset and results", async () => {
    queueList([listRow()], 120);

    const res = await request(app).get("/api/properties");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 120, limit: 20, offset: 0 });
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].address).toBe("123 Main St");
  });

  it("defaults to limit 20 / offset 0 when not asked otherwise", async () => {
    queueList();

    await request(app).get("/api/properties");

    // limit and offset are the last two bound values.
    expect(resultsValues().slice(-2)).toEqual([20, 0]);
  });

  it("returns an empty result set without erroring", async () => {
    queueList([], 0);

    const res = await request(app).get("/api/properties");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.results).toEqual([]);
  });

  it("builds no WHERE clause when no filters are supplied", async () => {
    queueList();

    await request(app).get("/api/properties");

    expect(countSql()).not.toMatch(/WHERE/);
    expect(countValues()).toEqual([]);
  });
});

describe("GET /api/properties — pagination", () => {
  it("passes limit and offset through to SQL", async () => {
    queueList();

    const res = await request(app).get("/api/properties?limit=5&offset=40");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ limit: 5, offset: 40 });
    expect(resultsValues().slice(-2)).toEqual([5, 40]);
  });

  it("accepts the maximum limit of 100", async () => {
    queueList();
    const res = await request(app).get("/api/properties?limit=100");
    expect(res.status).toBe(200);
  });

  it("rejects a limit above 100", async () => {
    const res = await request(app).get("/api/properties?limit=101");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit must be <= 100/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects a limit below 1", async () => {
    const res = await request(app).get("/api/properties?limit=0");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit must be >= 1/);
  });

  it("rejects a negative offset", async () => {
    const res = await request(app).get("/api/properties?offset=-5");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/offset must be >= 0/);
  });

  it("rejects a non-integer limit", async () => {
    const res = await request(app).get("/api/properties?limit=abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit must be an integer/);
  });

  it("rejects a fractional limit", async () => {
    const res = await request(app).get("/api/properties?limit=2.5");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/properties — filters", () => {
  it("filters by city without wrapping the column in a function", async () => {
    queueList();

    await request(app).get("/api/properties?city=Portland");

    // Wrapping L_City in LOWER()/TRIM() would make the predicate non-sargable
    // and stop MySQL using idx_L_City — the function must stay on the value.
    expect(countSql()).toContain("L_City = TRIM(?)");
    expect(countSql()).not.toMatch(/LOWER\s*\(\s*L_City/);
    expect(countValues()).toEqual(["Portland"]);
  });

  it("filters by zipcode", async () => {
    queueList();
    await request(app).get("/api/properties?zipcode=97201");
    expect(countSql()).toContain("L_Zip = ?");
    expect(countValues()).toEqual(["97201"]);
  });

  it("filters by minPrice", async () => {
    queueList();
    await request(app).get("/api/properties?minPrice=300000");
    expect(countSql()).toContain("L_SystemPrice >= ?");
    expect(countValues()).toEqual([300000]);
  });

  it("filters by maxPrice", async () => {
    queueList();
    await request(app).get("/api/properties?maxPrice=800000");
    expect(countSql()).toContain("L_SystemPrice <= ?");
    expect(countValues()).toEqual([800000]);
  });

  it("filters by beds", async () => {
    queueList();
    await request(app).get("/api/properties?beds=3");
    expect(countSql()).toContain("L_Keyword2 = ?");
    expect(countValues()).toEqual([3]);
  });

  it("filters by baths", async () => {
    queueList();
    await request(app).get("/api/properties?baths=2");
    expect(countSql()).toContain("LM_Dec_3 = ?");
    expect(countValues()).toEqual([2]);
  });

  it("combines every filter with AND, in order", async () => {
    queueList();

    await request(app).get(
      "/api/properties?city=Portland&zipcode=97201&minPrice=300000&maxPrice=800000&beds=3&baths=2"
    );

    expect(countSql()).toContain("WHERE");
    expect(countSql().match(/AND/g)).toHaveLength(5);
    expect(countValues()).toEqual(["Portland", "97201", 300000, 800000, 3, 2]);
  });

  it("ignores a blank city rather than filtering on an empty string", async () => {
    queueList();
    await request(app).get("/api/properties?city=%20%20");
    expect(countSql()).not.toMatch(/WHERE/);
  });

  it("rejects minPrice greater than maxPrice", async () => {
    const res = await request(app).get("/api/properties?minPrice=900000&maxPrice=100000");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/minPrice cannot exceed maxPrice/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects a negative minPrice", async () => {
    const res = await request(app).get("/api/properties?minPrice=-1");
    expect(res.status).toBe(400);
  });

  it("rejects beds above the sane maximum", async () => {
    const res = await request(app).get("/api/properties?beds=99");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/beds must be <= 50/);
  });

  it("rejects an over-long city string", async () => {
    const res = await request(app).get(`/api/properties?city=${"x".repeat(101)}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too long/);
  });

  it("rejects a repeated query param, which Express hands over as an array", async () => {
    // ?city=a&city=b parses to ["a","b"], not a string — the validator has to
    // catch that rather than calling .trim() on an array.
    const res = await request(app).get("/api/properties?city=Portland&city=Seattle");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/city must be a string/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("binds filter values as parameters instead of inlining them", async () => {
    queueList();

    await request(app).get("/api/properties?city=Portland';DROP TABLE rets_property;--");

    // The dangerous text is a bound value, never part of the SQL string.
    expect(countSql()).not.toMatch(/DROP TABLE/i);
    expect(countValues()[0]).toContain("DROP TABLE");
  });
});

describe("GET /api/properties — sorting", () => {
  it("sorts by id when no sort is requested", async () => {
    queueList();

    const res = await request(app).get("/api/properties");

    expect(resultsSql()).toContain("ORDER BY id");
    expect(res.body.sortBy).toBeNull();
    expect(res.body.sortOrder).toBeNull();
  });

  it.each([
    ["price", "L_SystemPrice"],
    ["date", "ListingContractDate"],
    ["sqft", "LM_Int2_3"],
    ["beds", "L_Keyword2"],
  ])("maps sortBy=%s to the real column %s", async (key, column) => {
    queueList();

    const res = await request(app).get(`/api/properties?sortBy=${key}&sortOrder=desc`);

    expect(res.status).toBe(200);
    expect(resultsSql()).toContain(`ORDER BY ${column} DESC`);
  });

  it("appends id as a tiebreaker so paging is stable", async () => {
    queueList();

    await request(app).get("/api/properties?sortBy=price&sortOrder=asc");

    // Without this, rows sharing a price have no defined order and can repeat
    // or disappear between pages.
    expect(resultsSql()).toContain("ORDER BY L_SystemPrice ASC, id ASC");
  });

  it("defaults to ascending when only sortBy is given", async () => {
    queueList();
    const res = await request(app).get("/api/properties?sortBy=price");
    expect(resultsSql()).toContain("ORDER BY L_SystemPrice ASC");
    expect(res.body.sortOrder).toBe("asc");
  });

  it("echoes the applied sort back to the client", async () => {
    queueList();
    const res = await request(app).get("/api/properties?sortBy=date&sortOrder=desc");
    expect(res.body).toMatchObject({ sortBy: "date", sortOrder: "desc" });
  });

  it("accepts mixed-case sort values", async () => {
    queueList();
    const res = await request(app).get("/api/properties?sortBy=PRICE&sortOrder=DESC");
    expect(res.status).toBe(200);
    expect(resultsSql()).toContain("ORDER BY L_SystemPrice DESC");
  });

  it("rejects a raw SQL column name", async () => {
    const res = await request(app).get("/api/properties?sortBy=L_SystemPrice");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sortBy must be one of/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects a RESO-style alias that is not a real column", async () => {
    const res = await request(app).get("/api/properties?sortBy=ListPrice");
    expect(res.status).toBe(400);
  });

  it("rejects an injection attempt in sortBy", async () => {
    const res = await request(app).get("/api/properties?sortBy=price;DROP TABLE rets_property");
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("rejects an invalid sortOrder", async () => {
    const res = await request(app).get("/api/properties?sortBy=price&sortOrder=sideways");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sortOrder must be asc or desc/);
  });

  it("rejects sortOrder without sortBy", async () => {
    const res = await request(app).get("/api/properties?sortOrder=asc");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sortOrder requires sortBy/);
  });
});

describe("GET /api/properties — database failures", () => {
  it("returns 500 without leaking the database error", async () => {
    pool.query.mockRejectedValueOnce(new Error("ER_NO_SUCH_TABLE: rets_property"));

    const res = await request(app).get("/api/properties");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(JSON.stringify(res.body)).not.toMatch(/ER_NO_SUCH_TABLE/);
  });
});
