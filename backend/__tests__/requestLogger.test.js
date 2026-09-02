const requestLogger = require("../middleware/requestLogger");

/**
 * The logger attaches to the response's "finish" event, so these tests fake the
 * minimum of req/res rather than spinning up a server.
 */
function fakeReq(overrides = {}) {
  return { method: "GET", originalUrl: "/api/properties", ...overrides };
}

function fakeRes(statusCode = 200) {
  const handlers = {};
  return {
    statusCode,
    on: (event, handler) => {
      handlers[event] = handler;
    },
    finish: () => handlers.finish && handlers.finish(),
  };
}

describe("requestLogger", () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("calls next so the request continues", () => {
    const next = jest.fn();
    requestLogger(fakeReq(), fakeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("logs nothing until the response finishes", () => {
    requestLogger(fakeReq(), fakeRes(), jest.fn());
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("logs method, url, status and a duration in ms on finish", () => {
    const res = fakeRes(200);
    requestLogger(fakeReq(), res, jest.fn());

    res.finish();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0][0];
    expect(line).toContain("GET");
    expect(line).toContain("/api/properties");
    expect(line).toContain("200");
    expect(line).toMatch(/\d+\.\d+ms/);
  });

  it("reports sub-millisecond timings with decimal precision", () => {
    const res = fakeRes();
    requestLogger(fakeReq(), res, jest.fn());
    res.finish();

    // hrtime, not Date.now() — the latter would floor a fast query to "0ms".
    const line = logSpy.mock.calls[0][0];
    const ms = Number(/(\d+\.\d+)ms/.exec(line)[1]);
    expect(Number.isFinite(ms)).toBe(true);
    expect(ms).toBeLessThan(1000);
  });

  it("tags a slow request so it stands out in the log", () => {
    // Force a 250ms gap between the two hrtime reads.
    const realHrtime = process.hrtime.bigint;
    let call = 0;
    process.hrtime.bigint = () => (call++ === 0 ? 0n : 250_000_000n);

    try {
      const res = fakeRes();
      requestLogger(fakeReq(), res, jest.fn());
      res.finish();
    } finally {
      process.hrtime.bigint = realHrtime;
    }

    expect(logSpy.mock.calls[0][0]).toContain("SLOW");
    expect(logSpy.mock.calls[0][0]).toContain("250.0ms");
  });

  it("does not tag a fast request", () => {
    const res = fakeRes();
    requestLogger(fakeReq(), res, jest.fn());
    res.finish();
    expect(logSpy.mock.calls[0][0]).not.toContain("SLOW");
  });

  it("logs the real status code for errors", () => {
    const res = fakeRes(500);
    requestLogger(fakeReq({ method: "POST" }), res, jest.fn());
    res.finish();

    expect(logSpy.mock.calls[0][0]).toContain("500");
    expect(logSpy.mock.calls[0][0]).toContain("POST");
  });
});
