/**
 * Logs one line per request, including how long it took to produce a response.
 *
 * Timing starts when the request arrives and stops on the response's "finish"
 * event — the point at which the last byte has been handed to the socket. We use
 * process.hrtime.bigint() rather than Date.now() because Date.now() has
 * millisecond resolution, so any query faster than 1ms would log as "0ms".
 *
 * Anything slower than SLOW_REQUEST_MS is tagged so slow endpoints stand out
 * while you're working through the EXPLAIN / index tuning.
 */

const SLOW_REQUEST_MS = 200;

module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const timestamp = new Date().toISOString();
    const slow = durationMs >= SLOW_REQUEST_MS ? "  ← SLOW" : "";

    console.log(
      `${timestamp} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms${slow}`
    );
  });

  next();
};
