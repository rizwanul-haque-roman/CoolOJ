const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const COMPILER_API_URL =
  process.env.ONLINE_COMPILER_API_URL || "https://api.onlinecompiler.io";

const COMPILER_API_KEY = process.env.ONLINE_COMPILER_API_KEY;

const COMPILER_BY_LANGUAGE = {
  c: "gcc-15",
  cpp: "g++-15",
  python: "python-3.14",
  java: "openjdk-25",
  javascript: "typescript-deno",
};

function getCompiler(language) {
  const normalizedLanguage = String(language || "").trim().toLowerCase();
  return COMPILER_BY_LANGUAGE[normalizedLanguage] || null;
}

function normalizeOutput(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function getCompilerError(result) {
  return String(
    result?.error ||
      result?.compile_output ||
      result?.compiler_output ||
      result?.stderr ||
      result?.message ||
      "",
  ).trim();
}

function getCompilerText(result) {
  return [
    result?.status,
    result?.error,
    result?.compile_output,
    result?.compiler_output,
    result?.stderr,
    result?.message,
    result?.output,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
}

function mapCompilerResult(result) {
  const rawStatus = String(result?.status || "")
    .trim()
    .toLowerCase();

  const status = rawStatus.replace(/[\s-]+/g, "_");

  const exitCode =
    result?.exit_code === null || result?.exit_code === undefined
      ? null
      : Number(result.exit_code);

  const timeSeconds = Number(result?.time || 0);
  const compilerText = getCompilerText(result);

  /*
   * Timeout must be checked first.
   * Some compiler APIs use an error exit code after terminating
   * an infinite loop, so exit_code alone is not enough.
   */
  if (
    status.includes("timeout") ||
    status.includes("timed_out") ||
    status.includes("time_limit") ||
    compilerText.includes("time limit") ||
    compilerText.includes("timed out") ||
    compilerText.includes("timeout") ||
    compilerText.includes("execution time exceeded") ||
    compilerText.includes("process timed out") ||
    compilerText.includes("wall time limit") ||
    compilerText.includes("cpu time limit")
  ) {
    return "Time Limit Exceeded";
  }

  /*
   * Compilation error detection.
   * gcc/g++ compiler errors commonly contain `error:`.
   */
  if (
    status.includes("compile") ||
    status.includes("compilation") ||
    compilerText.includes("compilation error") ||
    compilerText.includes("compile error") ||
    compilerText.includes("error: expected") ||
    compilerText.includes("error: missing") ||
    compilerText.includes("error: stray") ||
    compilerText.includes("error: invalid") ||
    compilerText.includes("error: no matching") ||
    compilerText.includes("error: ") ||
    compilerText.includes("fatal error:")
  ) {
    return "Compilation Error";
  }

  /*
   * Success must explicitly have a zero exit code.
   */
  if (
    status === "success" ||
    status === "completed" ||
    status === "finished" ||
    status === "ok" ||
    status === "accepted"
  ) {
    if (exitCode === 0 || exitCode === null) {
      return "Accepted";
    }

    return "Runtime Error";
  }

  /*
   * Some services do not return an explicit timeout status.
   * If your configured external judge has a two-second limit,
   * a reported runtime at or above approximately two seconds
   * is treated as a timeout.
   */
  if (
    timeSeconds >= 2 &&
    (
      exitCode === null ||
      exitCode !== 0 ||
      compilerText.includes("killed") ||
      compilerText.includes("terminated")
    )
  ) {
    return "Time Limit Exceeded";
  }

  /*
   * Runtime failures occur after a program compiles but exits
   * abnormally, crashes, is killed, or receives a signal.
   */
  if (
    status.includes("runtime") ||
    status.includes("execution_error") ||
    status.includes("run_error") ||
    status.includes("failed") ||
    compilerText.includes("segmentation fault") ||
    compilerText.includes("segfault") ||
    compilerText.includes("null pointer") ||
    compilerText.includes("floating point exception") ||
    compilerText.includes("stack overflow") ||
    compilerText.includes("terminated") ||
    compilerText.includes("killed") ||
    compilerText.includes("signal") ||
    (exitCode !== null && exitCode !== 0)
  ) {
    return "Runtime Error";
  }

  return "Internal Error";
}

async function executeCode({ language, code, input }) {
  if (!COMPILER_API_KEY) {
    throw new Error("ONLINE_COMPILER_API_KEY is not configured.");
  }

  const compiler = getCompiler(language);

  if (!compiler) {
    const error = new Error(`Unsupported language: ${language}`);
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(
    `${COMPILER_API_URL}/api/run-code-sync/`,
    {
      method: "POST",
      headers: {
        Authorization: COMPILER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compiler,
        code,
        input: String(input ?? ""),
      }),
    },
  );

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(
      payload?.error || "Compiler API request failed.",
    );

    error.statusCode = response.status;
    throw error;
  }

  /*
   * Temporary debug output.
   * Keep it while testing the verdicts. It does not expose
   * your API key because it logs only the compiler response.
   */
  console.log(
    "Compiler API response:",
    JSON.stringify(payload, null, 2),
  );

  return {
    raw: payload,
    verdict: mapCompilerResult(payload),
    output: String(payload?.output ?? ""),
    error: getCompilerError(payload),
    timeUsedMs: Math.round(Number(payload?.time || 0) * 1000),
    memoryUsedKb: Math.round(Number(payload?.memory || 0)),
    exitCode:
      payload?.exit_code === null || payload?.exit_code === undefined
        ? null
        : Number(payload.exit_code),
  };
}

function publicExecutionResult(result) {
  return {
    verdict: result.verdict,
    output: result.output,
    error: result.error,
    exit_code: result.exitCode,
    time_used_ms: result.timeUsedMs,
    memory_used_kb: result.memoryUsedKb,
  };
}

router.post("/run", requireAuth, async (req, res) => {
  const { language, code, input = "" } = req.body;

  if (!language || typeof code !== "string") {
    return res.status(400).json({
      error: "language and code are required.",
    });
  }

  if (!code.trim()) {
    return res.status(400).json({
      error: "Code cannot be empty.",
    });
  }

  if (Buffer.byteLength(code, "utf8") > 100 * 1024) {
    return res.status(400).json({
      error: "Code must be smaller than 100 KB.",
    });
  }

  if (Buffer.byteLength(String(input), "utf8") > 100 * 1024) {
    return res.status(400).json({
      error: "Input must be smaller than 100 KB.",
    });
  }

  try {
    const result = await executeCode({
      language,
      code,
      input,
    });

    res.json({
      ...publicExecutionResult(result),
      saved: false,
    });
  } catch (err) {
    console.error("Run code error:", err);

    res.status(err.statusCode || 502).json({
      error: err.message || "Unable to execute code.",
    });
  }
});

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

  if (!getCompiler(language)) {
    return res.status(400).json({
      error: `Unsupported language: ${language}.`,
    });
  }

  if (Buffer.byteLength(code, "utf8") > 100 * 1024) {
    return res.status(400).json({
      error: "Code must be smaller than 100 KB.",
    });
  }

  try {
    const [problemRows] = await db.execute(
      `
        SELECT id
        FROM problems
        WHERE id = ?
      `,
      [problem_id],
    );

    if (problemRows.length === 0) {
      return res.status(404).json({
        error: "Problem not found.",
      });
    }

    const [tests] = await db.execute(
      `
        SELECT input, expected_output
        FROM test_cases
        WHERE problem_id = ? AND is_sample = false
        ORDER BY id ASC
      `,
      [problem_id],
    );

    if (tests.length === 0) {
      return res.status(400).json({
        error: "This problem has no hidden test cases yet.",
      });
    }

    const [submission] = await db.execute(
      `
        INSERT INTO submissions
          (user_id, problem_id, contest_id, language, code)
        VALUES (?, ?, ?, ?, ?)
      `,
      [userId, problem_id, contest_id || null, language, code],
    );

    const submissionId = submission.insertId;

    let verdict = "Accepted";
    let passedTests = 0;
    let totalTimeMs = 0;
    let maximumMemoryKb = 0;
    let judgeError = "";

    for (const test of tests) {
      let result;

      try {
        result = await executeCode({
          language,
          code,
          input: test.input,
        });
      } catch (err) {
        verdict = "Internal Error";
        judgeError = err.message;
        break;
      }

      totalTimeMs += result.timeUsedMs;
      maximumMemoryKb = Math.max(
        maximumMemoryKb,
        result.memoryUsedKb,
      );

      if (result.verdict !== "Accepted") {
        verdict = result.verdict;
        judgeError = result.error;
        break;
      }

      if (
        normalizeOutput(result.output) !==
        normalizeOutput(test.expected_output)
      ) {
        verdict = "Wrong Answer";
        break;
      }

      passedTests += 1;
    }

    const score =
      verdict === "Accepted"
        ? 100
        : Math.floor((passedTests / tests.length) * 100);

    await db.execute(
      `
        UPDATE submissions
        SET
          verdict = ?,
          time_used_ms = ?,
          memory_used_kb = ?,
          score = ?
        WHERE id = ?
      `,
      [
        verdict,
        totalTimeMs,
        maximumMemoryKb,
        score,
        submissionId,
      ],
    );

    res.json({
      submission_id: submissionId,
      verdict,
      passed_tests: passedTests,
      total_tests: tests.length,
      time_used_ms: totalTimeMs,
      memory_used_kb: maximumMemoryKb,
      score,
      error: judgeError || undefined,
    });
  } catch (err) {
    console.error("Submission error:", err);

    res.status(500).json({
      error: "Unable to process submission.",
    });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
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
        INNER JOIN problems AS p
          ON p.id = s.problem_id
        WHERE s.user_id = ?
        ORDER BY s.submitted_at DESC, s.id DESC
      `,
      [req.user.userId],
    );

    res.json(rows);
  } catch (err) {
    console.error("Global submission history error:", err);

    res.status(500).json({
      error: "Unable to load submission history.",
    });
  }
});

router.get("/problem/:problem_id", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
        SELECT
          id,
          language,
          verdict,
          time_used_ms,
          memory_used_kb,
          score,
          submitted_at
        FROM submissions
        WHERE user_id = ? AND problem_id = ?
        ORDER BY submitted_at DESC, id DESC
      `,
      [req.user.userId, req.params.problem_id],
    );

    res.json(rows);
  } catch (err) {
    console.error("Problem submission history error:", err);

    res.status(500).json({
      error: "Unable to load submission history.",
    });
  }
});

router.get("/:submission_id", requireAuth, async (req, res) => {
  const submissionId = Number(req.params.submission_id);

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return res.status(400).json({
      error: "Invalid submission ID.",
    });
  }

  try {
    const [rows] = await db.execute(
      `
        SELECT
          s.id,
          s.user_id,
          s.problem_id,
          s.contest_id,
          s.language,
          s.code,
          s.verdict,
          s.score,
          s.time_used_ms,
          s.memory_used_kb,
          s.submitted_at,
          p.title AS problem_title,
          u.name AS user_name,
          u.email AS user_email
        FROM submissions AS s
        INNER JOIN problems AS p
          ON p.id = s.problem_id
        INNER JOIN users AS u
          ON u.id = s.user_id
        WHERE s.id = ?
        LIMIT 1
      `,
      [submissionId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Submission not found.",
      });
    }

    const submission = rows[0];

    const isOwner =
      Number(submission.user_id) === Number(req.user.userId);

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "You do not have permission to view this submission.",
      });
    }

    if (!isAdmin) {
      delete submission.user_email;
      delete submission.user_id;
    }

    res.json(submission);
  } catch (err) {
    console.error("Submission details error:", err);

    res.status(500).json({
      error: "Unable to load submission details.",
    });
  }
});

module.exports = router;