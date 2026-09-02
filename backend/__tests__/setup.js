// The request logger writes a line per request; keep test output readable.
// console.error is silenced too so the deliberate failure tests don't look
// like real failures in the report.
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
