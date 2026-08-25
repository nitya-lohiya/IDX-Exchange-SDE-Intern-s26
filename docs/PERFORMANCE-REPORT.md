# Performance report

Generated: 2026-08-25T01:26:46.903Z
Rows in `rets_property`: **53,122**
Each query is run once to warm up, then 5 times; the median is reported.

## Indexes before

- `PRIMARY (id)`
- `idx_L_ListingID (L_ListingID)`
- `idx_L_City (L_City)`
- `idx_L_Zip (L_Zip)`
- `idx_L_DisplayId (L_DisplayId)`
- `idx_rets_property_type (L_Type_)`
- `idx_property_price (L_SystemPrice)`
- `idx_property_beds (L_Keyword2)`
- `idx_property_baths (LM_Dec_3)`
- `idx_property_city_price (L_City, L_SystemPrice)`
- `idx_beds_baths_price (L_Keyword2, LM_Dec_3, L_SystemPrice)`
- `idx_zip_price (L_Zip, L_SystemPrice)`
- `ft_remarks (L_Remarks)`

## Before adding composite indexes

### Complex filter — results page

Median: **2.3 ms** (best 2.3, worst 2.8)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | range | idx_L_City,idx_property_price,idx_property_beds,idx_property_baths,idx_property_city_price,idx_beds_baths_price | idx_L_City | 203 | 3444 | 12.5 | Using index condition; Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=936 rows=20) (actual time=0.268..3.02 rows=20 loops=1)
    -> Filter: ((rets_property.L_Keyword2 = 3) and (rets_property.L_SystemPrice >= 200000) and (rets_property.L_SystemPrice <= 900000) and (rets_property.LM_Dec_3 = 2.0))  (cost=936 rows=430) (actual time=0.266..3.02 rows=20 loops=1)
        -> Index range scan on rets_property using idx_L_City over (L_City = 'Los Angeles'), with index condition: (rets_property.L_City = <cache>(trim('Los Angeles')))  (cost=936 rows=3444) (actual time=0.256..2.97 rows=402 loops=1)
```

</details>

### Complex filter — COUNT(*) for pagination

Median: **5.6 ms** (best 5.0, worst 6.7)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | index_merge | idx_L_City,idx_property_price,idx_property_beds,idx_property_baths,idx_property_city_price,idx_beds_baths_price | idx_L_City,idx_property_beds,idx_property_baths | 203,5,4 | 860 | 49.94 | Using intersect(idx_L_City,idx_property_beds,idx_property_baths); Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Aggregate: count(0)  (cost=1034 rows=1) (actual time=15.9..15.9 rows=1 loops=1)
    -> Filter: ((rets_property.L_Keyword2 = 3) and (rets_property.L_City = <cache>(trim('Los Angeles'))) and (rets_property.L_SystemPrice >= 200000) and (rets_property.L_SystemPrice <= 900000) and (rets_property.LM_Dec_3 = 2.0))  (cost=935 rows=430) (actual time=0.487..15.9 rows=174 loops=1)
        -> Intersect rows sorted by row ID  (cost=935 rows=861) (actual time=0.481..15.7 rows=385 loops=1)
            -> Index range scan on rets_property using idx_L_City over (L_City = 'Los Angeles')  (cost=0.0185..63.7 rows=3444) (actual time=0.0512..1.38 rows=3444 loops=1)
            -> Index range scan on rets_property using idx_property_beds over (L_Keyword2 = 3)  (cost=523e-6..9.34 rows=17867) (actual time=0.35..4.41 rows=17641 loops=1)
            -> Index range scan on rets_property using idx_property_baths over (LM_Dec_3 = 2.0)  (cost=258e-6..4.61 rows=17867) (actual time=0.0236..4.6 rows=19432 loops=1)
```

</details>

### City only — NON-SARGABLE (the old LOWER(TRIM(col)) form)

Median: **0.6 ms** (best 0.6, worst 0.6)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | index | NULL | PRIMARY | 4 | 20 | 100 | Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=22.7 rows=20) (actual time=0.0492..0.412 rows=20 loops=1)
    -> Filter: (lower(trim(rets_property.L_City)) = <cache>(lower(trim('Los Angeles'))))  (cost=22.7 rows=20) (actual time=0.0488..0.411 rows=20 loops=1)
        -> Index scan on rets_property using PRIMARY  (cost=22.7 rows=20) (actual time=0.011..0.376 rows=316 loops=1)
```

</details>

### City only — SARGABLE (shipped form: L_City = TRIM(?))

Median: **0.7 ms** (best 0.7, worst 0.7)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | ref | idx_L_City,idx_property_city_price | idx_property_city_price | 203 | 3444 | 100 | Using index; Using filesort |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=390 rows=20) (actual time=0.563..0.565 rows=20 loops=1)
    -> Sort: rets_property.id, limit input to 20 row(s) per chunk  (cost=390 rows=3444) (actual time=0.563..0.563 rows=20 loops=1)
        -> Covering index lookup on rets_property using idx_property_city_price (L_City = trim('Los Angeles'))  (cost=390 rows=3444) (actual time=0.0111..0.432 rows=3444 loops=1)
```

</details>

### Price range only

Median: **0.3 ms** (best 0.3, worst 0.3)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | index | idx_property_price,idx_property_city_price,idx_beds_baths_price,idx_zip_price | PRIMARY | 4 | 180 | 50 | Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=21.1 rows=20) (actual time=0.0242..0.0634 rows=20 loops=1)
    -> Filter: (rets_property.L_SystemPrice between 200000 and 900000)  (cost=21.1 rows=90) (actual time=0.024..0.0624 rows=20 loops=1)
        -> Index scan on rets_property using PRIMARY  (cost=21.1 rows=180) (actual time=0.023..0.0599 rows=54 loops=1)
```

</details>

## Indexes added

- `idx_beds_baths_price` — already existed, skipped.
- `idx_zip_price` — already existed, skipped.

## After adding composite indexes

### Complex filter — results page

Median: **0.9 ms** (best 0.8, worst 0.9)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | range | idx_L_City,idx_property_price,idx_property_beds,idx_property_baths,idx_property_city_price,idx_beds_baths_price | idx_L_City | 203 | 3444 | 12.5 | Using index condition; Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=918 rows=20) (actual time=0.0642..0.707 rows=20 loops=1)
    -> Filter: ((rets_property.L_Keyword2 = 3) and (rets_property.L_SystemPrice >= 200000) and (rets_property.L_SystemPrice <= 900000) and (rets_property.LM_Dec_3 = 2.0))  (cost=918 rows=430) (actual time=0.0638..0.706 rows=20 loops=1)
        -> Index range scan on rets_property using idx_L_City over (L_City = 'Los Angeles'), with index condition: (rets_property.L_City = <cache>(trim('Los Angeles')))  (cost=918 rows=3444) (actual time=0.0614..0.689 rows=402 loops=1)
```

</details>

### Complex filter — COUNT(*) for pagination

Median: **3.6 ms** (best 3.6, worst 3.7)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | index_merge | idx_L_City,idx_property_price,idx_property_beds,idx_property_baths,idx_property_city_price,idx_beds_baths_price | idx_L_City,idx_property_beds,idx_property_baths | 203,5,4 | 861 | 50 | Using intersect(idx_L_City,idx_property_beds,idx_property_baths); Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Aggregate: count(0)  (cost=1017 rows=1) (actual time=4.71..4.71 rows=1 loops=1)
    -> Filter: ((rets_property.L_Keyword2 = 3) and (rets_property.L_City = <cache>(trim('Los Angeles'))) and (rets_property.L_SystemPrice >= 200000) and (rets_property.L_SystemPrice <= 900000) and (rets_property.LM_Dec_3 = 2.0))  (cost=918 rows=430) (actual time=0.0472..4.7 rows=174 loops=1)
        -> Intersect rows sorted by row ID  (cost=918 rows=861) (actual time=0.0463..4.66 rows=385 loops=1)
            -> Index range scan on rets_property using idx_L_City over (L_City = 'Los Angeles')  (cost=0.0135..46.4 rows=3444) (actual time=0.02..0.401 rows=3444 loops=1)
            -> Index range scan on rets_property using idx_property_beds over (L_Keyword2 = 3)  (cost=486e-6..8.77 rows=18024) (actual time=0.00475..1.27 rows=17641 loops=1)
            -> Index range scan on rets_property using idx_property_baths over (LM_Dec_3 = 2.0)  (cost=258e-6..4.65 rows=18024) (actual time=0.00517..1.43 rows=19432 loops=1)
```

</details>

### City only — NON-SARGABLE (the old LOWER(TRIM(col)) form)

Median: **0.5 ms** (best 0.5, worst 0.5)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | index | NULL | PRIMARY | 4 | 20 | 100 | Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=22.5 rows=20) (actual time=0.0421..0.325 rows=20 loops=1)
    -> Filter: (lower(trim(rets_property.L_City)) = <cache>(lower(trim('Los Angeles'))))  (cost=22.5 rows=20) (actual time=0.0419..0.324 rows=20 loops=1)
        -> Index scan on rets_property using PRIMARY  (cost=22.5 rows=20) (actual time=0.0102..0.298 rows=316 loops=1)
```

</details>

### City only — SARGABLE (shipped form: L_City = TRIM(?))

Median: **0.6 ms** (best 0.6, worst 0.6)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | ref | idx_L_City,idx_property_city_price | idx_property_city_price | 203 | 3444 | 100 | Using index; Using filesort |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=380 rows=20) (actual time=0.418..0.419 rows=20 loops=1)
    -> Sort: rets_property.id, limit input to 20 row(s) per chunk  (cost=380 rows=3444) (actual time=0.417..0.418 rows=20 loops=1)
        -> Covering index lookup on rets_property using idx_property_city_price (L_City = trim('Los Angeles'))  (cost=380 rows=3444) (actual time=0.00787..0.32 rows=3444 loops=1)
```

</details>

### Price range only

Median: **0.3 ms** (best 0.3, worst 0.3)

| select_type | table | type | possible_keys | key | key_len | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SIMPLE | rets_property | index | idx_property_price,idx_property_city_price,idx_beds_baths_price,idx_zip_price | PRIMARY | 4 | 180 | 50 | Using where |

<details><summary>EXPLAIN ANALYZE (measured)</summary>

```
-> Limit: 20 row(s)  (cost=21 rows=20) (actual time=0.0196..0.0558 rows=20 loops=1)
    -> Filter: (rets_property.L_SystemPrice between 200000 and 900000)  (cost=21 rows=90) (actual time=0.0194..0.055 rows=20 loops=1)
        -> Index scan on rets_property using PRIMARY  (cost=21 rows=180) (actual time=0.0187..0.0534 rows=54 loops=1)
```

</details>

## Improvement

| Query | Before | After | Change | Rows examined before → after |
| --- | --- | --- | --- | --- |
| Complex filter — results page | 2.3 ms | 0.9 ms | 63% faster | 3444 → 3444 |
| Complex filter — COUNT(*) for pagination | 5.6 ms | 3.6 ms | 36% faster | 860 → 861 |
| City only — NON-SARGABLE (the old LOWER(TRIM(col)) form) | 0.6 ms | 0.5 ms | no material change (sub-ms, within noise) | 20 → 20 |
| City only — SARGABLE (shipped form: L_City = TRIM(?)) | 0.7 ms | 0.6 ms | no material change (sub-ms, within noise) | 3444 → 3444 |
| Price range only | 0.3 ms | 0.3 ms | no material change (sub-ms, within noise) | 180 → 180 |

## Indexes after

- `PRIMARY (id)`
- `idx_L_ListingID (L_ListingID)`
- `idx_L_City (L_City)`
- `idx_L_Zip (L_Zip)`
- `idx_L_DisplayId (L_DisplayId)`
- `idx_rets_property_type (L_Type_)`
- `idx_property_price (L_SystemPrice)`
- `idx_property_beds (L_Keyword2)`
- `idx_property_baths (LM_Dec_3)`
- `idx_property_city_price (L_City, L_SystemPrice)`
- `idx_beds_baths_price (L_Keyword2, LM_Dec_3, L_SystemPrice)`
- `idx_zip_price (L_Zip, L_SystemPrice)`
- `ft_remarks (L_Remarks)`
