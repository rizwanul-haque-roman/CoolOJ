const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all public problems, optionally filtered by subject ID.
// Example: GET /api/problems?subject_id=1
router.get("/", async (req, res) => {
  const { subject_id } = req.query;

  try {
    let query = `
      SELECT
        p.*,
        s.name AS subject_name
      FROM problems AS p
      LEFT JOIN subjects AS s
        ON p.subject_id = s.id
      WHERE p.is_public = true
    `;

    const params = [];

    if (subject_id) {
      query += " AND p.subject_id = ?";
      params.push(subject_id);
    }

    query += " ORDER BY p.created_at DESC, p.id DESC";

    const [rows] = await db.execute(query, params);

    res.json(rows);
  } catch (err) {
    console.error("Problems list error:", err);

    res.status(500).json({
      error: "Unable to load problems.",
    });
  }
});

// GET all subjects.
// This route MUST appear before "/:id".
router.get("/meta/subjects", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
          id,
          name,
          semester_no
        FROM subjects
        ORDER BY semester_no ASC, id ASC
      `,
    );

    res.json(rows);
  } catch (err) {
    console.error("Subjects list error:", err);

    res.status(500).json({
      error: "Unable to load subjects.",
    });
  }
});

// GET one public problem by ID, including only visible/sample test cases.
router.get("/:id", async (req, res) => {
  const problemId = Number(req.params.id);

  if (!Number.isInteger(problemId) || problemId <= 0) {
    return res.status(400).json({
      error: "Invalid problem ID.",
    });
  }

  try {
    const [problemRows] = await db.execute(
      `
        SELECT
          p.*,
          s.name AS subject_name
        FROM problems AS p
        LEFT JOIN subjects AS s
          ON p.subject_id = s.id
        WHERE p.id = ? AND p.is_public = true
        LIMIT 1
      `,
      [problemId],
    );

    if (problemRows.length === 0) {
      return res.status(404).json({
        error: "Problem not found.",
      });
    }

    const [samples] = await db.execute(
      `
        SELECT
          id,
          input,
          expected_output
        FROM test_cases
        WHERE problem_id = ? AND is_sample = true
        ORDER BY id ASC
      `,
      [problemId],
    );

    // Your frontend currently reads:
    // problem.sample_input
    // problem.sample_output
    //
    // These fields are created from the first public sample test case.
    const firstSample = samples[0] || {};

    res.json({
      ...problemRows[0],

      sample_input: firstSample.input || "",
      sample_output: firstSample.expected_output || "",

      // Kept for future support of multiple samples.
      sample_tests: samples,
    });
  } catch (err) {
    console.error("Problem details error:", err);

    res.status(500).json({
      error: "Unable to load problem details.",
    });
  }
});

module.exports = router;