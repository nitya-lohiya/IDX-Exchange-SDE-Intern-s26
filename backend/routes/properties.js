const express = require("express");
const pool = require("../db");

const router = express.Router();

// validation helpers 

const parseIntParam = (value, { min, max, defaultValue, name }) => {
  if (value === undefined) return defaultValue;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw { status: 400, message: `${name} must be an integer` };
  }
  if (min !== undefined && n < min) {
    throw { status: 400, message: `${name} must be >= ${min}` };
  }
  if (max !== undefined && n > max) {
    throw { status: 400, message: `${name} must be <= ${max}` };
  }
  return n;
};

const parseStringParam = (value, { maxLength = 100, name }) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw { status: 400, message: `${name} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > maxLength) {
    throw { status: 400, message: `${name} is too long (max ${maxLength})` };
  }
  return trimmed;
};

//  GET /api/properties

router.get("/", async (req, res) => {
  try {
    const limit = parseIntParam(req.query.limit, {
      min: 1, max: 100, defaultValue: 20, name: "limit",
    });
    const offset = parseIntParam(req.query.offset, {
      min: 0, defaultValue: 0, name: "offset",
    });
    const city = parseStringParam(req.query.city, { name: "city" });
    const zipcode = parseStringParam(req.query.zipcode, { maxLength: 20, name: "zipcode" });
    const minPrice = parseIntParam(req.query.minPrice, { min: 0, name: "minPrice" });
    const maxPrice = parseIntParam(req.query.maxPrice, { min: 0, name: "maxPrice" });
    const beds = parseIntParam(req.query.beds, { min: 0, max: 50, name: "beds" });
    const baths = parseIntParam(req.query.baths, { min: 0, max: 50, name: "baths" });

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({ error: "minPrice cannot exceed maxPrice" });
    }

    const conditions = [];
    const values = [];

    if (city !== undefined) {
      // Compare the column directly instead of wrapping it in LOWER()/TRIM().
      // Calling a function on the column makes the predicate non-sargable, so
      // MySQL has to evaluate it for every row and cannot use idx_L_City —
      // that turned the paginated COUNT(*) into a ~230ms full scan.
      // L_City is utf8mb4_0900_ai_ci, so plain `=` is already case- and
      // accent-insensitive; the parameter is trimmed by parseStringParam, and
      // TRIM(?) here is belt-and-braces on the value, not the column.
      conditions.push("L_City = TRIM(?)");
      values.push(city);
    }
    if (zipcode !== undefined) {
      conditions.push("L_Zip = ?");
      values.push(zipcode);
    }
    if (minPrice !== undefined) {
      conditions.push("L_SystemPrice >= ?");
      values.push(minPrice);
    }
    if (maxPrice !== undefined) {
      conditions.push("L_SystemPrice <= ?");
      values.push(maxPrice);
    }
    if (beds !== undefined) {
      conditions.push("L_Keyword2 = ?");
      values.push(beds);
    }
    if (baths !== undefined) {
      conditions.push("LM_Dec_3 = ?");
      values.push(baths);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`;
    const [countRows] = await pool.query(countSql, values);
    const total = countRows[0].total;

    const resultsSql = `
      SELECT
        id,
        L_ListingID   AS listingId,
        L_Address     AS address,
        L_City        AS city,
        L_State       AS state,
        L_Zip         AS zipcode,
        L_SystemPrice AS price,
        L_Keyword2    AS beds,
        LM_Dec_3      AS baths,
        LM_Int2_3     AS sqft,
        L_Photos      AS photos,
        YearBuilt     AS yearBuilt,
        L_Status      AS status
      FROM rets_property
      ${whereClause}
      ORDER BY id
      LIMIT ? OFFSET ?
    `;
    const [results] = await pool.query(resultsSql, [...values, limit, offset]);

    res.json({ total, limit, offset, results });
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Properties query failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/properties/:id/openhouses ( comes BEFORE /:id) 

router.get("/:id/openhouses", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, {
      min: 1, max: 2147483647, name: "id",
    });

    const [propertyRows] = await pool.query(
      "SELECT L_ListingID FROM rets_property WHERE id = ?",
      [id]
    );
    if (propertyRows.length === 0) {
      return res.status(404).json({ error: `Property with id ${id} not found` });
    }

    const listingId = propertyRows[0].L_ListingID;
    if (!listingId) {
      return res.json([]);
    }

    const [openHouses] = await pool.query(
      `SELECT
         id,
         L_ListingID   AS listingId,
         OpenHouseDate AS date,
         OH_StartTime  AS startTime,
         OH_EndTime    AS endTime,
         OH_StartDate  AS startDate,
         OH_EndDate    AS endDate,
         all_data      AS rawData
       FROM rets_openhouse
       WHERE L_ListingID = ?
       ORDER BY OpenHouseDate ASC, OH_StartTime ASC`,
      [listingId]
    );

    res.json(openHouses);
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Open houses query failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//  GET /api/properties/:id 

router.get("/:id", async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, {
      min: 1, max: 2147483647, name: "id",
    });

    const [rows] = await pool.query(
      "SELECT * FROM rets_property WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: `Property with id ${id} not found` });
    }

    res.json(rows[0]);
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Property detail query failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
