const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

function runMockJudge(code, language, tests) {
  const normalizedCode = (code || "").toLowerCase();

  if (!code || !code.trim()) {
    return {
      verdict: "Compilation Error",
      timeUsedMs: 0,
      memoryUsedKb: 0,
      passedTests: 0,
      totalTests: tests.length,
    };
  }

  if (normalizedCode.includes("compile_error")) {
    return {
      verdict: "Compilation Error",
      timeUsedMs: 0,
      memoryUsedKb: 0,
      passedTests: 0,
      totalTests: tests.length,
    };
  }

  if (
    normalizedCode.includes("time_limit") ||
    normalizedCode.includes("infinite_loop") ||
    normalizedCode.includes("while(true)")
  ) {
    return {
      verdict: "Time Limit Exceeded",
      timeUsedMs: 2000,
      memoryUsedKb: 16384,
      passedTests: 0,
      totalTests: tests.length,
    };
  }

  if (
    normalizedCode.includes("runtime_error") ||
    normalizedCode.includes("throw new") ||
    normalizedCode.includes("segmentation fault")
  ) {
    return {
      verdict: "Runtime Error",
      timeUsedMs: 14,
      memoryUsedKb: 10240,
      passedTests: 0,
      totalTests: tests.length,
    };
  }

  if (
    normalizedCode.includes("wrong_answer") ||
    normalizedCode.includes("wrong answer")
  ) {
    return {
      verdict: "Wrong Answer",
      timeUsedMs: 21,
      memoryUsedKb: 12288,
      passedTests: Math.max(0, tests.length - 1),
      totalTests: tests.length,
    };
  }

  const languagePenalty = {
    c: 0,
    cpp: 0,
    java: 20,
    python: 12,
    javascript: 8,
  };

  const baseTime = 18 + (languagePenalty[language] || 5);

  return {
    verdict: "Accepted",
    timeUsedMs: baseTime + Math.min(code.length, 100),
    memoryUsedKb: 8192 + Math.min(code.length * 3, 12288),
    passedTests: tests.length,
    totalTests: tests.length,
  };
}

router.post("/", requireAuth, async (req, res) => {
  const { problem_id, language, code, contest_id } = req.body;
  const userId = req.user.userId;

  if (!problem_id || !language || typeof code !== "string") {
    return res.status(400).json({
      error: "problem_id, language, and code are required.",
    });
  }

  if (!code.trim()) {
    return res.status(400).json({
      error: "Code cannot be empty.",
    });
  }

  try {
    const [sub] = await db.execute(
      `INSERT INTO submissions
       (user_id, problem_id, contest_id, language, code)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, problem_id, contest_id || null, language, code],
    );

    const submissionId = sub.insertId;

    const [tests] = await db.execute(
      `SELECT input, expected_output
       FROM test_cases
       WHERE problem_id = ? AND is_sample = false`,
      [problem_id],
    );

    if (tests.length === 0) {
      await db.execute(
        `UPDATE submissions
         SET verdict = 'No Test Cases', score = 0
         WHERE id = ?`,
        [submissionId],
      );

      return res.json({
        submission_id: submissionId,
        verdict: "No Test Cases",
        passed_tests: 0,
        total_tests: 0,
        time_used_ms: 0,
        memory_used_kb: 0,
        score: 0,
      });
    }

    const result = runMockJudge(code, language, tests);
    const score = result.verdict === "Accepted" ? 100 : 0;

    await db.execute(
      `UPDATE submissions
       SET verdict = ?, time_used_ms = ?, memory_used_kb = ?, score = ?
       WHERE id = ?`,
      [
        result.verdict,
        result.timeUsedMs,
        result.memoryUsedKb,
        score,
        submissionId,
      ],
    );

    res.json({
      submission_id: submissionId,
      verdict: result.verdict,
      passed_tests: result.passedTests,
      total_tests: result.totalTests,
      time_used_ms: result.timeUsedMs,
      memory_used_kb: result.memoryUsedKb,
      score,
    });
  } catch (err) {
    console.error("Submission error:", err);
    res.status(500).json({ error: "Unable to process submission." });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        s.id,
        s.problem_id,
        p.title AS problem_title,
        s.language,
        s.verdict,
        s.time_used_ms,
        s.memory_used_kb,
        s.score,
        s.submitted_at
      FROM submissions AS s
      INNER JOIN problems AS p ON p.id = s.problem_id
      WHERE s.user_id = ?
      ORDER BY s.submitted_at DESC, s.id DESC`,
      [req.user.userId],
    );

    res.json(rows);
  } catch (err) {
    console.error("Global submission history error:", err);
    res.status(500).json({ error: "Unable to load submission history." });
  }
});

router.get("/problem/:problem_id", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        id,
        language,
        verdict,
        time_used_ms,
        memory_used_kb,
        score,
        submitted_at
      FROM submissions
      WHERE user_id = ? AND problem_id = ?
      ORDER BY submitted_at DESC, id DESC`,
      [req.user.userId, req.params.problem_id],
    );

    res.json(rows);
  } catch (err) {
    console.error("Problem submission history error:", err);
    res.status(500).json({ error: "Unable to load submission history." });
  }
});

module.exports = router;