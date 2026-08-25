# Performance notes (Week 9, Part B)

## How to reproduce

```bash
cd backend
npm run perf          # EXPLAIN + timings against the current indexes
npm run perf:apply    # ...then create the composite indexes and re-measure
```

Both write `docs/PERFORMANCE-REPORT.md` with the real numbers from your machine.
`perf:apply` is safe to run more than once — an index that already exists is
skipped rather than erroring.

## The query being analysed

The most complex query the listings page can generate is the full filter
combination — city, a price range, beds and baths — which runs twice per page
load: once as `COUNT(*)` for pagination and once for the 20 visible rows.

```sql
SELECT id, L_ListingID, L_Address, L_City, L_SystemPrice, L_Keyword2, LM_Dec_3
FROM rets_property
WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))
  AND L_SystemPrice >= ?
  AND L_SystemPrice <= ?
  AND L_Keyword2 = ?
  AND LM_Dec_3 = ?
ORDER BY id
LIMIT 20 OFFSET 0;
```

## Reading EXPLAIN output

`EXPLAIN` shows the plan the optimizer *intends* to use. One row per table per
step.

| Column | What it means | What you want to see |
| --- | --- | --- |
| `id` | Which SELECT this row belongs to. Higher ids run first in nested queries. | — |
| `select_type` | `SIMPLE` for a plain query; `SUBQUERY`/`DERIVED` mean nesting. | `SIMPLE` |
| `table` | The table (or alias) being read at this step. | — |
| `partitions` | Which partitions are touched. `NULL` on unpartitioned tables. | — |
| `type` | **The most important column** — the access strategy. See the ladder below. | `ref`, `range`, or better |
| `possible_keys` | Indexes the optimizer *could* have used. `NULL` means no index even applies. | non-NULL |
| `key` | The index it actually chose. `NULL` = full table scan. | non-NULL |
| `key_len` | Bytes of the index used. On a composite index this reveals **how many columns** are actually being used — a short `key_len` means only the first column is helping. | as long as possible |
| `ref` | What is being compared against the index (a constant, or a column from another table). | `const` |
| `rows` | Estimated rows MySQL must examine. This is an estimate from table statistics, not an exact count. | as small as possible |
| `filtered` | Estimated % of those rows that survive the `WHERE`. `rows × filtered%` ≈ rows actually returned. | close to 100 |
| `Extra` | Notes on extra work. See below. | `Using index` |

### The `type` ladder, best to worst

`system` → `const` → `eq_ref` → `ref` → `range` → `index` → **`ALL`**

- `ref` — index lookup on a non-unique key. Good; this is what equality filters
  on `L_City`, `L_Keyword2`, `LM_Dec_3` should reach.
- `range` — index scan over a bounded range. Expected for `L_SystemPrice BETWEEN`.
- `index` — full scan *of the index*. Better than `ALL`, still reads everything.
- `ALL` — **full table scan**. Every row is read from disk. This is the one to
  eliminate.

### Common `Extra` values

- `Using index` — **covering index**: every column needed is in the index, so
  the table itself is never touched. The best case.
- `Using where` — rows are fetched then filtered in the server. Normal, but if
  it appears next to `type: ALL` the filter isn't using an index at all.
- `Using filesort` — results are sorted in memory or on disk because no index
  provides the `ORDER BY` order. Not necessarily fatal, but costly on large sets.
- `Using temporary` — a temp table was materialised, usually for `GROUP BY` or
  `DISTINCT`. Expensive.

## Headline finding: the city filter was not using any index

The route originally filtered city with:

```sql
WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))
```

Wrapping the **column** in `LOWER()`/`TRIM()` makes the predicate
*non-sargable*: MySQL must evaluate the function for every row before it can
compare, so it cannot use `idx_L_City` at all. `EXPLAIN` showed it plainly —
`possible_keys: NULL`, `type: index`, falling back to a `PRIMARY` scan.

The paginated `COUNT(*)` was where this hurt, because unlike the `LIMIT 20`
results query it cannot stop early — it has to examine every candidate row:

| Query | Before | After |
| --- | --- | --- |
| Complex filter — `COUNT(*)` | **232 ms** | **5.3 ms** |
| Complex filter — results page | 268 ms | 2.0 ms |

`L_City` is `varchar(50)` with collation `utf8mb4_0900_ai_ci` — already case-
and accent-insensitive — so `LOWER()` on the column was pure overhead. The
parameter is trimmed by `parseStringParam` before it reaches SQL. The fix keeps
behaviour identical while restoring index use:

```sql
WHERE L_City = TRIM(?)
```

The function now applies to the *parameter*, not the column, so the index still
works. Verified identical results for `Los Angeles`, `los angeles`,
`LOS ANGELES`, and `  Los Angeles  ` — all return 3,444 rows.

This is the general rule worth remembering: **never wrap an indexed column in a
function inside `WHERE`.** Transform the input instead.

## Indexes added and why

Composite index column order is the whole game: MySQL can use any **left-hand
prefix** of an index, so an index on `(A, B)` helps queries filtering on `A`, or
on `A AND B`, but does nothing for a query filtering on `B` alone. The rule is
**equality columns first, range columns last** — once the optimizer hits a range
condition it cannot use any column further right for lookups.

| Index | Columns | Why |
| --- | --- | --- |
| `idx_beds_baths_price` | `(L_Keyword2, LM_Dec_3, L_SystemPrice)` | Beds and baths are equality matches, so they lead; price is the trailing range column. |
| `idx_zip_price` | `(L_Zip, L_SystemPrice)` | Zip is the second most common entry point after city. |

Two candidate indexes were deliberately **not** created, because the schema
already had an equivalent and a duplicate index costs write performance and disk
for no read benefit:

- `(L_City, L_SystemPrice)` — already covered by `idx_property_city_price`
- `(L_SystemPrice)` — already covered by `idx_property_price`

### Measured effect of the composite indexes

With the sargable rewrite already in place, the remaining gains are smaller —
the heavy lifting was done by fixing the predicate, not by adding indexes:

| Query | Before | After | Change |
| --- | --- | --- | --- |
| Complex filter — results page | 2.3 ms | 0.9 ms | 63% faster |
| Complex filter — `COUNT(*)` | 5.6 ms | 3.6 ms | 36% faster |

`EXPLAIN` on the `COUNT(*)` now shows `type: index_merge` with
`Using intersect(idx_L_City, idx_property_beds, idx_property_baths)` — MySQL
reads several indexes and intersects the matching row ids rather than scanning
the table.

Differences below about 1 ms are reported as "within noise": at that scale the
variation between runs exceeds the effect being measured, so claiming a
percentage would be misleading.

## Gotcha: `CREATE INDEX` fails on this table

Adding any index to `rets_property` fails with:

```
Invalid default value for 'active_check'
```

The MLS import left `active_check TIMESTAMP NOT NULL DEFAULT '0000-00-00
00:00:00'`. `CREATE INDEX` is internally an `ALTER TABLE`, which re-validates
every column definition, and the server's `sql_mode` includes `NO_ZERO_DATE` —
so the zero timestamp is rejected even though it has nothing to do with the
index.

`scripts/analyze-performance.js` works around this by relaxing `sql_mode` for
the single connection that runs the DDL:

```sql
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
```

This affects only that one connection — it does not change the server config or
touch any data. The cleaner long-term fix is to correct the column default:

```sql
ALTER TABLE rets_property
  MODIFY active_check TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

That is left alone here because it changes the imported schema, which the MLS
sync may depend on.
