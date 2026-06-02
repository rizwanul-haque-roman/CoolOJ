const express = require("express");
const router = express.Router();
const db = require("../db");
const axios = require("axios");
const { requireAuth } = require("../middleware/auth");

const LANGUAGE_IDS = {
  c: 1,
  cpp: 2,
  java: 4, // check this from /languages
  python: 25, // check this from /languages
};

router.post("/", requireAuth, async (req, res) => {
  const { problem_id, language, code, contest_id } = req.body;
  const user_id = req.user.userId;

  try {
    const [sub] = await db.execute(
      "INSERT INTO submissions (user_id, problem_id, contest_id, language, code) VALUES (?, ?, ?, ?, ?)",
      [user_id, problem_id, contest_id || null, language, code],
    );
    const submission_id = sub.insertId;

    const [tests] = await db.execute(
      "SELECT input, expected_output FROM test_cases WHERE problem_id = ? AND is_sample = false",
      [problem_id],
    );

    if (tests.length === 0) {
      await db.execute(
        "UPDATE submissions SET verdict = 'No Test Cases' WHERE id = ?",
        [submission_id],
      );
      return res.json({ submission_id, verdict: "No Test Cases" });
    }

    let finalVerdict = "Accepted";
    let totalTime = 0;
    let totalMemory = 0;

    for (const test of tests) {
      const judgeResponse = await axios.post(
        `${process.env.JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: LANGUAGE_IDS[language] || 2,
          stdin: test.input,
          cpu_time_limit: 2,
          memory_limit: 262144,
        },
      );

      const result = judgeResponse.data;
    //   console.log(result);
      totalTime += result.time ? parseFloat(result.time) * 1000 : 0;
      totalMemory = Math.max(totalMemory, result.memory || 0);

      if (result.status.id !== 3) {
        const statusMap = {
          4: "Wrong Answer",
          5: "Time Limit Exceeded",
          6: "Compilation Error",
          7: "Runtime Error",
          8: "Runtime Error",
          11: "Runtime Error",
          13: "Internal Error",
        };
        finalVerdict = statusMap[result.status.id] || result.status.description;
        break;
      }
    }

    await db.execute(
      "UPDATE submissions SET verdict = ?, time_used_ms = ?, memory_used_kb = ?, score = ? WHERE id = ?",
      [
        finalVerdict,
        Math.round(totalTime),
        totalMemory,
        finalVerdict === "Accepted" ? 100 : 0,
        submission_id,
      ],
    );

    res.json({ submission_id, verdict: finalVerdict });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/problem/:problem_id", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, language, verdict, time_used_ms, memory_used_kb, submitted_at FROM submissions WHERE user_id = ? AND problem_id = ? ORDER BY submitted_at DESC",
      [req.user.userId, req.params.problem_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
