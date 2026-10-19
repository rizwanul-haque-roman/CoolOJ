const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

function parsePositiveId(value) {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function getContestStatus(contest) {
  if (!contest.start_time || !contest.end_time) {
    return "invalid";
  }

  const startTime = new Date(contest.start_time).getTime();
  const endTime = new Date(contest.end_time).getTime();
  const now = Date.now();

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime
  ) {
    return "invalid";
  }

  if (now < startTime) return "upcoming";
  if (now >= endTime) return "ended";

  return "live";
}

async function findPublicContest(contestId) {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM contests
      WHERE id = ? AND is_public = true
      LIMIT 1
    `,
    [contestId],
  );

  return rows[0] || null;
}

async function isRegistered(contestId, userId) {
  const [rows] = await db.execute(
    `
      SELECT contest_id
      FROM contest_registrations
      WHERE contest_id = ? AND user_id = ?
      LIMIT 1
    `,
    [contestId, userId],
  );

  return rows.length > 0;
}

// Public contest list.
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT *
        FROM contests
        WHERE is_public = true
        ORDER BY start_time ASC, id ASC
      `,
    );

    return res.json(rows);
  } catch (err) {
    console.error("Contest list error:", err);

    return res.status(500).json({
      error: "Unable to load contests.",
    });
  }
});

// Registration state for the authenticated user.
router.get("/:id/registration", requireAuth, async (req, res) => {
  const contestId = parsePositiveId(req.params.id);

  if (contestId === null) {
    return res.status(400).json({
      error: "Invalid contest ID.",
    });
  }

  try {
    const contest = await findPublicContest(contestId);

    if (!contest) {
      return res.status(404).json({
        error: "Contest not found.",
      });
    }

    const registered = await isRegistered(
      contestId,
      req.user.userId,
    );

    return res.json({ registered });
  } catch (err) {
    console.error("Contest registration-status error:", err);

    return res.status(500).json({
      error: "Unable to check contest registration status.",
    });
  }
});

// Protected problem statement for a live contest.
router.get(
  "/:contestId/problems/:problemId",
  requireAuth,
  async (req, res) => {
    const contestId = parsePositiveId(req.params.contestId);
    const problemId = parsePositiveId(req.params.problemId);

    if (contestId === null) {
      return res.status(400).json({
        error: "Invalid contest ID.",
      });
    }

    if (problemId === null) {
      return res.status(400).json({
        error: "Invalid problem ID.",
      });
    }

    try {
      const contest = await findPublicContest(contestId);

      if (!contest) {
        return res.status(404).json({
          error: "Contest not found or is not public.",
        });
      }

      const status = getContestStatus(contest);

      if (status === "invalid") {
        return res.status(400).json({
          error: "Contest schedule is invalid.",
        });
      }

      if (status === "upcoming") {
        return res.status(403).json({
          error: "This contest has not started yet.",
        });
      }

      if (status === "ended") {
        return res.status(403).json({
          error: "This contest has ended.",
        });
      }

      const registered = await isRegistered(
        contestId,
        req.user.userId,
      );

      if (!registered) {
        return res.status(403).json({
          error:
            "Register for this contest before opening its problems.",
        });
      }

      const [problemRows] = await db.execute(
        `
          SELECT
            p.id,
            p.title,
            p.statement,
            p.input_format,
            p.output_format,
            p.constraints,
            p.difficulty,
            p.time_limit_ms,
            p.memory_limit_kb,
            p.subject_id,
            p.is_public,
            cp.serial_letter
          FROM contest_problems AS cp
          INNER JOIN problems AS p
            ON p.id = cp.problem_id
          WHERE cp.contest_id = ?
            AND cp.problem_id = ?
          LIMIT 1
        `,
        [contestId, problemId],
      );

      if (problemRows.length === 0) {
        return res.status(403).json({
          error:
            "This problem is not assigned to the selected contest.",
        });
      }

      // Only sample test cases may be returned to the student.
      const [sampleTests] = await db.execute(
        `
          SELECT input, expected_output
          FROM test_cases
          WHERE problem_id = ? AND is_sample = true
          ORDER BY id ASC
        `,
        [problemId],
      );

      return res.json({
        ...problemRows[0],
        contest_id: contestId,
        contest_title: contest.title,
        sample_tests: sampleTests,
        sample_input: sampleTests[0]?.input ?? "",
        sample_output: sampleTests[0]?.expected_output ?? "",
      });
    } catch (err) {
      console.error("Contest problem access error:", err);

      return res.status(500).json({
        error: "Unable to load contest problem.",
      });
    }
  },
);

// Register the authenticated user.
// Current policy: registration is allowed before and during the contest,
// but not after it ends.
router.post("/:id/register", requireAuth, async (req, res) => {
  const contestId = parsePositiveId(req.params.id);

  if (contestId === null) {
    return res.status(400).json({
      error: "Invalid contest ID.",
    });
  }

  try {
    const contest = await findPublicContest(contestId);

    if (!contest) {
      return res.status(404).json({
        error: "Contest not found or is not public.",
      });
    }

    const registered = await isRegistered(
      contestId,
      req.user.userId,
    );

    if (registered) {
      return res.json({
        registered: true,
        message: "You are already registered for this contest.",
      });
    }

    const status = getContestStatus(contest);

    if (status === "invalid") {
      return res.status(400).json({
        error: "Contest schedule is invalid.",
      });
    }

    if (status === "ended") {
      return res.status(403).json({
        error: "Registration is closed. This contest has ended.",
      });
    }

    await db.execute(
      `
        INSERT IGNORE INTO contest_registrations
          (contest_id, user_id)
        VALUES (?, ?)
      `,
      [contestId, req.user.userId],
    );

    // Confirm that registration actually exists after the insert.
    const saved = await isRegistered(
      contestId,
      req.user.userId,
    );

    if (!saved) {
      return res.status(500).json({
        error: "Unable to save contest registration.",
      });
    }

    return res.json({
      registered: true,
      message: "Registered successfully.",
    });
  } catch (err) {
    console.error("Contest registration error:", err);

    return res.status(500).json({
      error: "Unable to register for this contest.",
    });
  }
});

// Existing leaderboard calculation preserved for now.
// It still needs the separate unique-solved-problem scoring fix.
router.get("/:id/leaderboard", async (req, res) => {
  const contestId = parsePositiveId(req.params.id);

  if (contestId === null) {
    return res.status(400).json({
      error: "Invalid contest ID.",
    });
  }

  try {
    const contest = await findPublicContest(contestId);

    if (!contest) {
      return res.status(404).json({
        error: "Contest not found.",
      });
    }

    const [rows] = await db.execute(
      `
        SELECT
          u.name,
          u.id AS user_id,
          COUNT(
            CASE WHEN s.verdict = 'Accepted' THEN 1 END
          ) AS solved,
          SUM(
            CASE
              WHEN s.verdict = 'Accepted' THEN 100
              ELSE 0
            END
          ) AS total_score,
          MIN(
            CASE
              WHEN s.verdict = 'Accepted'
              THEN s.submitted_at
            END
          ) AS last_ac_time
        FROM contest_registrations AS cr
        INNER JOIN users AS u
          ON cr.user_id = u.id
        LEFT JOIN submissions AS s
          ON s.user_id = u.id
          AND s.contest_id = cr.contest_id
        WHERE cr.contest_id = ?
        GROUP BY u.id, u.name
        ORDER BY
          total_score DESC,
          last_ac_time ASC,
          u.id ASC
      `,
      [contestId],
    );

    return res.json(rows);
  } catch (err) {
    console.error("Contest leaderboard error:", err);

    return res.status(500).json({
      error: "Unable to load contest leaderboard.",
    });
  }
});

// Public contest information and assigned-problem metadata.
// Does not return problem statements or hidden test cases.
router.get("/:id", async (req, res) => {
  const contestId = parsePositiveId(req.params.id);

  if (contestId === null) {
    return res.status(400).json({
      error: "Invalid contest ID.",
    });
  }

  try {
    const contest = await findPublicContest(contestId);

    if (!contest) {
      return res.status(404).json({
        error: "Contest not found.",
      });
    }

    const [problems] = await db.execute(
      `
        SELECT
          cp.serial_letter,
          p.id,
          p.title,
          p.difficulty
        FROM contest_problems AS cp
        INNER JOIN problems AS p
          ON cp.problem_id = p.id
        WHERE cp.contest_id = ?
        ORDER BY cp.serial_letter ASC
      `,
      [contestId],
    );

    return res.json({
      ...contest,
      problems,
    });
  } catch (err) {
    console.error("Contest details error:", err);

    return res.status(500).json({
      error: "Unable to load contest details.",
    });
  }
});

module.exports = router;