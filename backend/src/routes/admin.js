const express = require("express");
const router = express.Router();
const db = require("../db");
const { changeContestProblem } = require("../utils/liveContestProblems");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);
router.use(require("./adminContestControls"));

const VALID_ROLES = ["student", "admin"];
const VALID_STATUSES = ["active", "suspended", "deleted"];

async function writeAuditLog({
  adminId,
  action,
  targetType,
  targetId,
  details = null,
}) {
  await db.execute(
    `INSERT INTO admin_audit_logs
      (admin_id, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [
      adminId,
      action,
      targetType,
      targetId,
      details ? JSON.stringify(details) : null,
    ],
  );
}

async function countActiveAdmins() {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role = 'admin' AND status = 'active'`,
  );

  return Number(rows[0]?.total || 0);
}

// ============================================================
// ADMIN PROBLEM MANAGEMENT
//
// Protected by the existing:
// router.use(requireAuth, requireAdmin);
// ============================================================

const PROBLEM_DIFFICULTIES = ["easy", "medium", "hard"];

const PROBLEM_MAX_CASES = 200;
const PROBLEM_MAX_CASE_BYTES = 64 * 1024;
const PROBLEM_MAX_TOTAL_CASE_BYTES = 1024 * 1024;

function problemHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function readProblemId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw problemHttpError(400, "Invalid problem ID.");
  }

  return id;
}

function validateProblemCases(cases) {
  if (!Array.isArray(cases)) {
    throw problemHttpError(400, "test_cases must be an array.");
  }

  if (cases.length > PROBLEM_MAX_CASES) {
    throw problemHttpError(
      400,
      `A problem can contain at most ${PROBLEM_MAX_CASES} test cases.`,
    );
  }

  let totalBytes = 0;

  const normalized = cases.map((tc, index) => {
    if (
      !tc ||
      typeof tc !== "object" ||
      typeof tc.input !== "string" ||
      typeof tc.expected_output !== "string"
    ) {
      throw problemHttpError(
        400,
        `Test case ${index + 1} must contain string input and expected_output.`,
      );
    }

    if (
      tc.is_sample !== undefined &&
      typeof tc.is_sample !== "boolean"
    ) {
      throw problemHttpError(
        400,
        `Test case ${index + 1}: is_sample must be a boolean.`,
      );
    }

    const inputBytes = Buffer.byteLength(tc.input, "utf8");
    const outputBytes = Buffer.byteLength(tc.expected_output, "utf8");

    if (
      inputBytes > PROBLEM_MAX_CASE_BYTES ||
      outputBytes > PROBLEM_MAX_CASE_BYTES
    ) {
      throw problemHttpError(
        400,
        `Test case ${index + 1}: input and expected output must each be at most 64 KB.`,
      );
    }

    totalBytes += inputBytes + outputBytes;

    return {
      // Preserve whitespace exactly.
      input: tc.input,
      expected_output: tc.expected_output,
      is_sample: tc.is_sample ?? false,
    };
  });

  if (totalBytes > PROBLEM_MAX_TOTAL_CASE_BYTES) {
    throw problemHttpError(
      400,
      "Combined test-case content must not exceed 1 MB.",
    );
  }

  return normalized;
}

function validateProblemBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw problemHttpError(400, "A JSON object is required.");
  }

  if (
    typeof body.title !== "string" ||
    !body.title.trim() ||
    body.title.trim().length > 200
  ) {
    throw problemHttpError(
      400,
      "Title is required and must be at most 200 characters.",
    );
  }

  if (
    typeof body.statement !== "string" ||
    !body.statement.trim()
  ) {
    throw problemHttpError(400, "Problem statement is required.");
  }

  const optionalText = {};

  for (const field of [
    "input_format",
    "output_format",
    "constraints",
  ]) {
    const value = body[field] ?? "";

    if (typeof value !== "string") {
      throw problemHttpError(400, `${field} must be a string.`);
    }

    optionalText[field] = value;
  }

  const difficulty =
  typeof body.difficulty === "string"
    ? body.difficulty.trim().toLowerCase()
    : "";

  if (!PROBLEM_DIFFICULTIES.includes(difficulty)) {
    throw problemHttpError(
      400,
      "Difficulty must be easy, medium, or hard.",
    );
  }

  if (
    !Number.isSafeInteger(body.time_limit_ms) ||
    body.time_limit_ms < 1 ||
    body.time_limit_ms > 60000
  ) {
    throw problemHttpError(
      400,
      "Time limit must be an integer from 1 to 60000 ms.",
    );
  }

  if (
    !Number.isSafeInteger(body.memory_limit_kb) ||
    body.memory_limit_kb < 1 ||
    body.memory_limit_kb > 1048576
  ) {
    throw problemHttpError(
      400,
      "Memory limit must be an integer from 1 to 1048576 KB.",
    );
  }

  const subjectId = body.subject_id ?? null;

  if (
    subjectId !== null &&
    (!Number.isSafeInteger(subjectId) || subjectId <= 0)
  ) {
    throw problemHttpError(
      400,
      "subject_id must be a positive integer or null.",
    );
  }

  const isPublic = body.is_public ?? false;

  if (typeof isPublic !== "boolean") {
    throw problemHttpError(400, "is_public must be a boolean.");
  }

  // POST can omit cases when creating an empty draft.
  const testCases = validateProblemCases(body.test_cases ?? []);

  if (isPublic) {
    const hasSample = testCases.some((tc) => tc.is_sample);
    const hasHidden = testCases.some((tc) => !tc.is_sample);

    if (!hasSample || !hasHidden) {
      throw problemHttpError(
        400,
        "Publishing requires at least one sample and one hidden test case.",
      );
    }
  }

  return {
    title: body.title.trim(),
    statement: body.statement,
    ...optionalText,
    difficulty,
    time_limit_ms: body.time_limit_ms,
    memory_limit_kb: body.memory_limit_kb,
    subject_id: subjectId,
    is_public: isPublic,
    test_cases: testCases,
  };
}

async function insertProblemCases(connection, problemId, cases) {
  for (const tc of cases) {
    await connection.execute(
      `INSERT INTO test_cases
        (problem_id, input, expected_output, is_sample)
       VALUES (?, ?, ?, ?)`,
      [
        problemId,
        tc.input,
        tc.expected_output,
        tc.is_sample,
      ],
    );
  }
}

function sendProblemError(res, error, label) {
  const expected =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 500;

  if (!expected) {
    console.error(label, error);
  }

  return res.status(expected ? error.statusCode : 500).json({
    error: expected
      ? error.message
      : "Unable to complete the problem-management request.",
  });
}

// ------------------------------------------------------------
// GET /api/admin/problems
// Includes drafts. Retains the fields used by the existing list.
// ------------------------------------------------------------

router.get("/problems", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        p.id,
        p.title,
        p.difficulty,
        p.is_public,
        p.subject_id,
        p.time_limit_ms,
        p.memory_limit_kb,
        s.name AS subject_name,
        (
          SELECT COUNT(*)
          FROM test_cases tc
          WHERE tc.problem_id = p.id
        ) AS test_case_count,
        (
          SELECT COUNT(*)
          FROM test_cases tc
          WHERE tc.problem_id = p.id
            AND tc.is_sample = false
        ) AS hidden_test_count
      FROM problems p
      LEFT JOIN subjects s ON s.id = p.subject_id
      ORDER BY p.id DESC
    `);

    res.json(
      rows.map((row) => ({
        ...row,
        is_public: Boolean(row.is_public),
      })),
    );
  } catch (error) {
    sendProblemError(res, error, "Admin problem list error:");
  }
});

// ------------------------------------------------------------
// GET /api/admin/problems/:id
// Admin-only: includes hidden cases.
// ------------------------------------------------------------

router.get("/problems/:id", async (req, res) => {
  try {
    const id = readProblemId(req.params.id);

    const [rows] = await db.execute(
      "SELECT * FROM problems WHERE id = ?",
      [id],
    );

    if (!rows.length) {
      throw problemHttpError(404, "Problem not found.");
    }

    const [cases] = await db.execute(
      `SELECT id, input, expected_output, is_sample
       FROM test_cases
       WHERE problem_id = ?
       ORDER BY id ASC`,
      [id],
    );

    res.json({
      ...rows[0],
      is_public: Boolean(rows[0].is_public),
      test_cases: cases.map((tc) => ({
        ...tc,
        is_sample: Boolean(tc.is_sample),
      })),
    });
  } catch (error) {
    sendProblemError(res, error, "Admin problem details error:");
  }
});

// ------------------------------------------------------------
// POST /api/admin/problems
// PUT  /api/admin/problems/:id
//
// Saves metadata and the complete case list in one transaction.
// PUT is a full form save, not a partial update.
// ------------------------------------------------------------

async function saveAdminProblem(req, res) {
  let connection;

  try {
    const editing = req.method === "PUT";
    const requestedId = editing
      ? readProblemId(req.params.id)
      : null;

    // Require explicit cases on edits to avoid accidental deletion
    // caused by a client forgetting to include the case list.
    if (
      editing &&
      !Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        "test_cases",
      )
    ) {
      throw problemHttpError(
        400,
        "Editing requires the complete test_cases array.",
      );
    }

    const problem = validateProblemBody(req.body);

    connection = await db.getConnection();
    await connection.beginTransaction();

    if (editing) {
      const [existing] = await connection.execute(
        "SELECT id FROM problems WHERE id = ? FOR UPDATE",
        [requestedId],
      );

      if (!existing.length) {
        throw problemHttpError(404, "Problem not found.");
      }
    }

    if (problem.subject_id !== null) {
      const [subjects] = await connection.execute(
        "SELECT id FROM subjects WHERE id = ?",
        [problem.subject_id],
      );

      if (!subjects.length) {
        throw problemHttpError(
          400,
          "The selected subject does not exist.",
        );
      }
    }

    const values = [
      problem.title,
      problem.statement,
      problem.input_format,
      problem.output_format,
      problem.constraints,
      problem.difficulty,
      problem.time_limit_ms,
      problem.memory_limit_kb,
      problem.subject_id,
      problem.is_public,
    ];

    let savedId = requestedId;

    if (editing) {
      await connection.execute(
        `UPDATE problems SET
          title = ?,
          statement = ?,
          input_format = ?,
          output_format = ?,
          \`constraints\` = ?,
          difficulty = ?,
          time_limit_ms = ?,
          memory_limit_kb = ?,
          subject_id = ?,
          is_public = ?
         WHERE id = ?`,
        [...values, savedId],
      );

      await connection.execute(
        "DELETE FROM test_cases WHERE problem_id = ?",
        [savedId],
      );
    } else {
      const [result] = await connection.execute(
        `INSERT INTO problems (
          title,
          statement,
          input_format,
          output_format,
          \`constraints\`,
          difficulty,
          time_limit_ms,
          memory_limit_kb,
          subject_id,
          is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values,
      );

      savedId = result.insertId;
    }

    await insertProblemCases(
      connection,
      savedId,
      problem.test_cases,
    );

    await connection.commit();

    res.status(editing ? 200 : 201).json({
      id: savedId,
      is_public: problem.is_public,
      test_case_count: problem.test_cases.length,
      message: problem.is_public
        ? "Problem saved and published."
        : "Problem saved as a draft.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    sendProblemError(res, error, "Save admin problem error:");
  } finally {
    connection?.release();
  }
}

router.post("/problems", saveAdminProblem);
router.put("/problems/:id", saveAdminProblem);

// ------------------------------------------------------------
// POST /api/admin/problems/:id/testcases
//
// Appends additional cases.
// Does not change the problem's publication status.
// ------------------------------------------------------------

router.post("/problems/:id/testcases", async (req, res) => {
  let connection;

  try {
    const id = readProblemId(req.params.id);
    const cases = validateProblemCases(req.body?.test_cases);

    if (!cases.length) {
      throw problemHttpError(
        400,
        "test_cases must be a non-empty array.",
      );
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [problems] = await connection.execute(
      "SELECT id FROM problems WHERE id = ? FOR UPDATE",
      [id],
    );

    if (!problems.length) {
      throw problemHttpError(404, "Problem not found.");
    }

    const [existing] = await connection.execute(
      `SELECT input, expected_output, is_sample
       FROM test_cases
       WHERE problem_id = ?`,
      [id],
    );

    // Enforce limits against the complete resulting case set,
    // not only against this upload.
    validateProblemCases([
      ...existing.map((tc) => ({
        ...tc,
        is_sample: Boolean(tc.is_sample),
      })),
      ...cases,
    ]);

    await insertProblemCases(connection, id, cases);

    await connection.commit();

    res.status(201).json({
      id,
      added_count: cases.length,
      test_case_count: existing.length + cases.length,
      message: "Test cases added. Publication status is unchanged.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    sendProblemError(res, error, "Add problem test cases error:");
  } finally {
    connection?.release();
  }
});



router.post("/contests", async (req, res) => {
  const { title, description, start_time, end_time, problem_ids = [] } =
    req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({
      error: "title, start_time, and end_time are required.",
    });
  }

  if (!Array.isArray(problem_ids)) {
    return res.status(400).json({
      error: "problem_ids must be an array.",
    });
  }

  try {
    const [contest] = await db.execute(
      `INSERT INTO contests
        (title, description, start_time, end_time, created_by, is_public)
       VALUES (?, ?, ?, ?, ?, true)`,
      [title, description || null, start_time, end_time, req.user.userId],
    );

    const contestId = contest.insertId;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < problem_ids.length; i += 1) {
      if (i >= letters.length) {
        return res.status(400).json({
          error: "A contest can contain at most 26 problems.",
        });
      }

      await db.execute(
        `INSERT INTO contest_problems
          (contest_id, problem_id, serial_letter)
         VALUES (?, ?, ?)`,
        [contestId, problem_ids[i], letters[i]],
      );
    }

    const [rows] = await db.execute(
      "SELECT * FROM contests WHERE id = ?",
      [contestId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create contest error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/contests", async (req,res)=>{
  try{
    const [rows]=await db.execute(`SELECT c.*,
      (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id=c.id AND cp.withdrawn_at IS NULL) AS problem_count
      FROM contests c ORDER BY c.start_time DESC,c.id DESC`);
    return res.json(rows);
  }catch(error){console.error("Admin contest list error:",error);return res.status(500).json({error:"Unable to load contests."});}
});

router.get("/contests/:contestId/problems", async (req, res) => {
  const contestId = Number(req.params.contestId);

  if (!Number.isInteger(contestId) || contestId <= 0) {
    return res.status(400).json({ error: "Invalid contest ID." });
  }

  try {
    const [contestRows] = await db.execute(
      "SELECT id FROM contests WHERE id = ?",
      [contestId],
    );

    if (contestRows.length === 0) {
      return res.status(404).json({ error: "Contest not found." });
    }

    const [rows] = await db.execute(
      `SELECT
        p.id,
        p.title,
        p.difficulty,
        p.time_limit_ms,
        p.memory_limit_kb,
        cp.serial_letter,
          cp.withdrawn_at,
          cp.withdrawn_reason
      FROM contest_problems AS cp
      INNER JOIN problems AS p
        ON p.id = cp.problem_id
      WHERE cp.contest_id = ?
      ORDER BY cp.serial_letter ASC, p.id ASC`,
      [contestId],
    );

    res.json(rows);
  } catch (err) {
    console.error("Get contest problems error:", err);
    res.status(500).json({ error: "Unable to load contest problems." });
  }
});

async function handleLiveProblem(req,res,action){
  try{
    const result=await changeContestProblem({
      contestId:req.params.contestId,
      problemId:action==="add"?req.body?.problem_id:req.params.problemId,
      adminId:req.user.userId,action,
      reason:req.body?.reason,expectedRevision:req.body?.expected_revision,
    });
    return res.status(action==="add"?201:200).json(result);
  }catch(error){
    const expected=Number.isInteger(error.statusCode)&&error.statusCode>=400&&error.statusCode<500;
    if(!expected)console.error("Live contest problem error:",error);
    return res.status(expected?error.statusCode:500).json({error:expected?error.message:"Unable to change contest problems."});
  }
}
router.post("/contests/:contestId/problems",(req,res)=>handleLiveProblem(req,res,"add"));
router.delete("/contests/:contestId/problems/:problemId",(req,res)=>handleLiveProblem(req,res,"withdraw"));

router.get("/submissions", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        s.id,
        s.user_id,
        u.name AS user_name,
        u.email AS user_email,
        s.problem_id,
        p.title AS problem_title,
        s.language,
        s.verdict,
        s.score,
        s.time_used_ms,
        s.memory_used_kb,
        s.submitted_at
      FROM submissions AS s
      INNER JOIN users AS u
        ON u.id = s.user_id
      INNER JOIN problems AS p
        ON p.id = s.problem_id
      ORDER BY s.submitted_at DESC, s.id DESC
      LIMIT 100`,
    );

    res.json(rows);
  } catch (err) {
    console.error("Admin submissions error:", err);
    res.status(500).json({ error: "Unable to load submissions." });
  }
});

router.get("/users", async (req, res) => {
  const search = String(req.query.search || "").trim();

  try {
    const searchPattern = `%${search}%`;

    const [rows] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.suspended_at,
        u.suspended_reason,
        COUNT(s.id) AS submission_count,
        SUM(CASE WHEN s.verdict = 'Accepted' THEN 1 ELSE 0 END) AS accepted_count
      FROM users AS u
      LEFT JOIN submissions AS s
        ON s.user_id = u.id
      WHERE (? = '' OR u.name LIKE ? OR u.email LIKE ?)
      GROUP BY
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.suspended_at,
        u.suspended_reason
      ORDER BY u.created_at DESC, u.id DESC`,
      [search, searchPattern, searchPattern],
    );

    res.json(rows);
  } catch (err) {
    console.error("Admin users list error:", err);
    res.status(500).json({ error: "Unable to load users." });
  }
});

router.get("/users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  try {
    const [rows] = await db.execute(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.suspended_at,
        u.suspended_reason,
        COUNT(s.id) AS submission_count,
        SUM(CASE WHEN s.verdict = 'Accepted' THEN 1 ELSE 0 END) AS accepted_count
      FROM users AS u
      LEFT JOIN submissions AS s
        ON s.user_id = u.id
      WHERE u.id = ?
      GROUP BY
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.suspended_at,
        u.suspended_reason`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Admin user details error:", err);
    res.status(500).json({ error: "Unable to load user details." });
  }
});

router.patch("/users/:userId/role", async (req, res) => {
  const userId = Number(req.params.userId);
  const newRole = String(req.body.role || "").toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  if (!VALID_ROLES.includes(newRole)) {
    return res.status(400).json({
      error: "Role must be either 'student' or 'admin'.",
    });
  }

  if (userId === Number(req.user.userId)) {
    return res.status(400).json({
      error: "You cannot change your own role.",
    });
  }

  try {
    const [userRows] = await db.execute(
      `SELECT id, name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const targetUser = userRows[0];

    if (targetUser.role === newRole) {
      return res.json({
        message: "User already has this role.",
        user: targetUser,
      });
    }

    if (
      targetUser.role === "admin" &&
      targetUser.status === "active" &&
      newRole !== "admin"
    ) {
      const activeAdminCount = await countActiveAdmins();

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: "The last active administrator cannot be demoted.",
        });
      }
    }

    await db.execute(
      "UPDATE users SET role = ? WHERE id = ?",
      [newRole, userId],
    );

    await writeAuditLog({
      adminId: req.user.userId,
      action: "role_changed",
      targetType: "user",
      targetId: userId,
      details: {
        target_name: targetUser.name,
        target_email: targetUser.email,
        previous_role: targetUser.role,
        new_role: newRole,
      },
    });

    const [updatedRows] = await db.execute(
      `SELECT
        id,
        name,
        email,
        role,
        status,
        created_at,
        suspended_at,
        suspended_reason
      FROM users
      WHERE id = ?`,
      [userId],
    );

    res.json({
      message: "User role updated successfully.",
      user: updatedRows[0],
    });
  } catch (err) {
    console.error("Update user role error:", err);
    res.status(500).json({ error: "Unable to update user role." });
  }
});

router.patch("/users/:userId/status", async (req, res) => {
  const userId = Number(req.params.userId);
  const newStatus = String(req.body.status || "").toLowerCase();
  const reason = String(req.body.reason || "").trim();

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({
      error: "Status must be 'active', 'suspended', or 'deleted'.",
    });
  }

  if (userId === Number(req.user.userId)) {
    return res.status(400).json({
      error: "You cannot change your own account status.",
    });
  }

  try {
    const [userRows] = await db.execute(
      `SELECT id, name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const targetUser = userRows[0];

    if (targetUser.status === newStatus) {
      return res.json({
        message: "User already has this status.",
        user: targetUser,
      });
    }

    const removesActiveAdmin =
      targetUser.role === "admin" &&
      targetUser.status === "active" &&
      newStatus !== "active";

    if (removesActiveAdmin) {
      const activeAdminCount = await countActiveAdmins();

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error:
            "The last active administrator cannot be suspended or deleted.",
        });
      }
    }

    const suspendedAt = newStatus === "suspended" ? new Date() : null;
    const suspendedReason =
      newStatus === "suspended" ? reason || null : null;

    await db.execute(
      `UPDATE users
       SET status = ?, suspended_at = ?, suspended_reason = ?
       WHERE id = ?`,
      [newStatus, suspendedAt, suspendedReason, userId],
    );

    const actionMap = {
      active: "user_restored",
      suspended: "user_suspended",
      deleted: "user_soft_deleted",
    };

    await writeAuditLog({
      adminId: req.user.userId,
      action: actionMap[newStatus],
      targetType: "user",
      targetId: userId,
      details: {
        target_name: targetUser.name,
        target_email: targetUser.email,
        previous_status: targetUser.status,
        new_status: newStatus,
        reason: newStatus === "suspended" ? reason || null : null,
      },
    });

    const [updatedRows] = await db.execute(
      `SELECT
        id,
        name,
        email,
        role,
        status,
        created_at,
        suspended_at,
        suspended_reason
      FROM users
      WHERE id = ?`,
      [userId],
    );

    res.json({
      message: "User status updated successfully.",
      user: updatedRows[0],
    });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({ error: "Unable to update user status." });
  }
});

router.get("/audit-logs", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        a.id,
        a.action,
        a.target_type,
        a.target_id,
        a.details,
        a.created_at,
        admin.name AS admin_name,
        admin.email AS admin_email
      FROM admin_audit_logs AS a
      INNER JOIN users AS admin
        ON admin.id = a.admin_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 200`,
    );

    res.json(rows);
  } catch (err) {
    console.error("Admin audit log error:", err);
    res.status(500).json({ error: "Unable to load audit logs." });
  }
});



module.exports = router;