#!/usr/bin/env node
/**
 * Week 9 Part B: EXPLAIN + composite index measurement.
 *
 *   node scripts/analyze-performance.js            # measure only
 *   node scripts/analyze-performance.js --apply    # measure, add indexes, re-measure
 *
 * Writes a markdown report to docs/PERFORMANCE-REPORT.md and prints it.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../db");

// The most complex filter combination the listings page can produce: city +
// price range + beds + baths, counted and then paged.
const COMPLEX_WHERE = `
  WHERE L_City = TRIM(?)
    AND L_SystemPrice >= ?
    AND L_SystemPrice <= ?
    AND L_Keyword2 = ?
    AND LM_Dec_3 = ?
`;
// Values chosen from the actual data distribution so the benchmark is meaningful.
const PARAMS = ["Los Angeles", 200000, 900000, 3, 2];

const QUERIES = [
  {
    name: "Complex filter — results page",
    sql: `SELECT id, L_ListingID, L_Address, L_City, L_SystemPrice, L_Keyword2, LM_Dec_3
          FROM rets_property ${COMPLEX_WHERE} ORDER BY id LIMIT 20 OFFSET 0`,
    params: PARAMS,
  },
  {
    name: "Complex filter — COUNT(*) for pagination",
    sql: `SELECT COUNT(*) AS total FROM rets_property ${COMPLEX_WHERE}`,
    params: PARAMS,
  },
  {
    name: "City only — NON-SARGABLE (the old LOWER(TRIM(col)) form)",
    sql: `SELECT id FROM rets_property WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?)) ORDER BY id LIMIT 20`,
    params: ["Los Angeles"],
  },
  {
    name: "City only — SARGABLE (shipped form: L_City = TRIM(?))",
    sql: `SELECT id FROM rets_property WHERE L_City = TRIM(?) ORDER BY id LIMIT 20`,
    params: ["Los Angeles"],
  },
  {
    name: "Price range only",
    sql: `SELECT id FROM rets_property WHERE L_SystemPrice BETWEEN ? AND ? ORDER BY id LIMIT 20`,
    params: [200000, 900000],
  },
];

// Composite indexes chosen to match how the listings page actually filters.
// Order matters: MySQL can use a left-hand prefix of a composite index, so the
// equality columns come first and the range column last.
// Composite indexes chosen to match how the listings page actually filters.
// Order matters: MySQL can use a left-hand prefix of a composite index, so the
// equality columns come first and the range column last.
//
// Deliberately NOT added, because the schema already has an equivalent index and
// a duplicate would only slow down writes:
//   (L_City, L_SystemPrice) -> covered by idx_property_city_price
//   (L_SystemPrice)         -> covered by idx_property_price
const INDEXES = [
  {
    name: "idx_beds_baths_price",
    sql: "CREATE INDEX idx_beds_baths_price ON rets_property (L_Keyword2, LM_Dec_3, L_SystemPrice)",
    why: "Beds and baths are equality matches so they lead; price is the trailing range column.",
  },
  {
    name: "idx_zip_price",
    sql: "CREATE INDEX idx_zip_price ON rets_property (L_Zip, L_SystemPrice)",
    why: "Zip search is the second most common entry point after city.",
  },
];

const RUNS = 5;

async function timeQuery(sql, params) {
  // Warm-up run so we measure steady state rather than first-parse cost.
  await pool.query(sql, params);
  const timings = [];
  for (let i = 0; i < RUNS; i++) {
    const start = process.hrtime.bigint();
    await pool.query(sql, params);
    timings.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  timings.sort((a, b) => a - b);
  return { median: timings[Math.floor(RUNS / 2)], best: timings[0], worst: timings[RUNS - 1] };
}

async function explain(sql, params) {
  // MySQL 8.4+/9 default EXPLAIN to TREE format, which returns a single text
  // column. Ask for TRADITIONAL explicitly to get the classic tabular plan.
  const [rows] = await pool.query(`EXPLAIN FORMAT=TRADITIONAL ${sql}`, params);
  return rows;
}

/** EXPLAIN ANALYZE actually runs the query and reports measured row counts. */
async function explainAnalyze(sql, params) {
  try {
    const [rows] = await pool.query(`EXPLAIN ANALYZE ${sql}`, params);
    return rows[0][Object.keys(rows[0])[0]];
  } catch {
    return null; // Not supported on this server version.
  }
}

function explainTable(rows) {
  const cols = ["select_type", "table", "type", "possible_keys", "key", "key_len", "rows", "filtered", "Extra"];
  const head = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((r) => `| ${cols.map((c) => (r[c] === null || r[c] === undefined ? "NULL" : String(r[c]))).join(" | ")} |`)
    .join("\n");
  return [head, sep, body].join("\n");
}

async function listIndexes() {
  const [rows] = await pool.query("SHOW INDEX FROM rets_property");
  const byName = new Map();
  rows.forEach((r) => {
    if (!byName.has(r.Key_name)) byName.set(r.Key_name, []);
    byName.get(r.Key_name)[r.Seq_in_index - 1] = r.Column_name;
  });
  return [...byName.entries()].map(([name, cols]) => `${name} (${cols.join(", ")})`);
}

async function measureAll() {
  const out = [];
  for (const q of QUERIES) {
    out.push({
      name: q.name,
      explain: await explain(q.sql, q.params),
      analyze: await explainAnalyze(q.sql, q.params),
      timing: await timeQuery(q.sql, q.params),
    });
  }
  return out;
}

(async () => {
  const apply = process.argv.includes("--apply");
  const lines = [];
  const say = (s = "") => lines.push(s);

  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM rets_property");
  const total = countRows[0].total;
  say("# Performance report");
  say();
  say(`Generated: ${new Date().toISOString()}`);
  say(`Rows in \`rets_property\`: **${Number(total).toLocaleString()}**`);
  say(`Each query is run once to warm up, then ${RUNS} times; the median is reported.`);
  say();

  say("## Indexes before");
  say();
  (await listIndexes()).forEach((i) => say(`- \`${i}\``));
  say();

  say("## Before adding composite indexes");
  say();
  const before = await measureAll();
  for (const r of before) {
    say(`### ${r.name}`);
    say();
    say(`Median: **${r.timing.median.toFixed(1)} ms** (best ${r.timing.best.toFixed(1)}, worst ${r.timing.worst.toFixed(1)})`);
    say();
    say(explainTable(r.explain));
    say();
    if (r.analyze) {
      say("<details><summary>EXPLAIN ANALYZE (measured)</summary>");
      say();
      say("```");
      say(r.analyze.trim());
      say("```");
      say();
      say("</details>");
      say();
    }
  }

  let after = null;
  if (apply) {
    say("## Indexes added");
    say();
    // rets_property has `active_check TIMESTAMP NOT NULL DEFAULT '0000-00-00
    // 00:00:00'` (an artefact of the MLS import). CREATE INDEX is an ALTER
    // TABLE, which re-validates every column default, and the server's
    // NO_ZERO_DATE mode rejects that zero timestamp — so index creation fails
    // with "Invalid default value for 'active_check'" even though the index
    // itself is fine. Relaxing sql_mode for this one connection lets the DDL
    // through without touching the table's data or the server's global config.
    const ddl = await pool.getConnection();
    try {
      await ddl.query("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");
      for (const idx of INDEXES) {
        try {
          await ddl.query(idx.sql);
          say(`- \`${idx.name}\` — ${idx.why}`);
        } catch (err) {
          if (err.code === "ER_DUP_KEYNAME") say(`- \`${idx.name}\` — already existed, skipped.`);
          else say(`- \`${idx.name}\` — FAILED: ${err.message}`);
        }
      }
    } finally {
      ddl.release();
    }
    say();
    // Refresh optimizer statistics so EXPLAIN reflects the new indexes.
    await pool.query("ANALYZE TABLE rets_property");

    say("## After adding composite indexes");
    say();
    after = await measureAll();
    for (const r of after) {
      say(`### ${r.name}`);
      say();
      say(`Median: **${r.timing.median.toFixed(1)} ms** (best ${r.timing.best.toFixed(1)}, worst ${r.timing.worst.toFixed(1)})`);
      say();
      say(explainTable(r.explain));
      say();
      if (r.analyze) {
        say("<details><summary>EXPLAIN ANALYZE (measured)</summary>");
        say();
        say("```");
        say(r.analyze.trim());
        say("```");
        say();
        say("</details>");
        say();
      }
    }

    say("## Improvement");
    say();
    say("| Query | Before | After | Change | Rows examined before → after |");
    say("| --- | --- | --- | --- | --- |");
    before.forEach((b, i) => {
      const a = after[i];
      const diff = b.timing.median - a.timing.median;
      let delta;
      if (Math.abs(diff) < 1) delta = "no material change (sub-ms, within noise)";
      else if (diff > 0) delta = `${((diff / b.timing.median) * 100).toFixed(0)}% faster`;
      else delta = `${((-diff / b.timing.median) * 100).toFixed(0)}% slower`;
      const rb = b.explain.map((r) => r.rows).join("+");
      const ra = a.explain.map((r) => r.rows).join("+");
      say(`| ${b.name} | ${b.timing.median.toFixed(1)} ms | ${a.timing.median.toFixed(1)} ms | ${delta} | ${rb} → ${ra} |`);
    });
    say();
    say("## Indexes after");
    say();
    (await listIndexes()).forEach((i) => say(`- \`${i}\``));
    say();
  } else {
    say("> Re-run with `--apply` to create the composite indexes and measure the difference.");
    say();
  }

  const report = lines.join("\n");
  const target = path.join(__dirname, "..", "..", "docs", "PERFORMANCE-REPORT.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, report);
  console.log(report);
  console.error(`\nReport written to ${target}`);
  await pool.end();
})().catch((err) => {
  console.error("Analysis failed:", err.message);
  process.exit(1);
});
