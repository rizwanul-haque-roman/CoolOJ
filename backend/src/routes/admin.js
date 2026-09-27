const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.use(requireAuth, requireAdmin);

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

router.post("/problems", async (req, res) => {
  const {
    title,
    statement,
    input_format,
    output_format,
    constraints,
    difficulty,
    time_limit_ms,
    memory_limit_kb,
    subject_id,
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO problems
        (
          title,
          statement,
          input_format,
          output_format,
          constraints,
          difficulty,
          time_limit_ms,
          memory_limit_kb,
          subject_id
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        statement,
        input_format,
        output_format,
        constraints,
        difficulty,
        time_limit_ms,
        memory_limit_kb,
        subject_id,
      ],
    );

    const [rows] = await db.execute(
      "SELECT * FROM problems WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create problem error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/problems/:id/testcases", async (req, res) => {
  const { test_cases } = req.body;

  if (!Array.isArray(test_cases) || test_cases.length === 0) {
    return res.status(400).json({
      error: "test_cases must be a non-empty array.",
    });
  }

  try {
    const [problemRows] = await db.execute(
      "SELECT id FROM problems WHERE id = ?",
      [req.params.id],
    );

    if (problemRows.length === 0) {
      return res.status(404).json({ error: "Problem not found." });
    }

    for (const tc of test_cases) {
      if (
        typeof tc.input !== "string" ||
        typeof tc.expected_output !== "string"
      ) {
        return res.status(400).json({
          error:
            "Each test case must include string values for input and expected_output.",
        });
      }

      await db.execute(
        `INSERT INTO test_cases
          (problem_id, input, expected_output, is_sample)
         VALUES (?, ?, ?, ?)`,
        [req.params.id, tc.input, tc.expected_output, tc.is_sample || false],
      );
    }

    await db.execute(
      "UPDATE problems SET is_public = true WHERE id = ?",
      [req.params.id],
    );

    res.json({ message: "Test cases added and problem published." });
  } catch (err) {
    console.error("Add test cases error:", err);
    res.status(500).json({ error: err.message });
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

router.get("/contests", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
        c.id,
        c.title,
        c.description,
        c.start_time,
        c.end_time,
        c.created_by,
        c.is_public,
        COUNT(DISTINCT cp.problem_id) AS problem_count
      FROM contests AS c
      LEFT JOIN contest_problems AS cp
        ON cp.contest_id = c.id
      GROUP BY
        c.id,
        c.title,
        c.description,
        c.start_time,
        c.end_time,
        c.created_by,
        c.is_public
      ORDER BY c.start_time DESC, c.id DESC`,
    );

    res.json(rows);
  } catch (err) {
    console.error("Get admin contests error:", err);
    res.status(500).json({ error: "Unable to load contests." });
  }
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
        cp.serial_letter
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

router.post("/contests/:contestId/problems", async (req, res) => {
  const contestId = Number(req.params.contestId);
  const problemId = Number(req.body.problem_id);

  if (!Number.isInteger(contestId) || contestId <= 0) {
    return res.status(400).json({ error: "Invalid contest ID." });
  }

  if (!Number.isInteger(problemId) || problemId <= 0) {
    return res.status(400).json({ error: "A valid problem_id is required." });
  }

  try {
    const [contestRows] = await db.execute(
      "SELECT id FROM contests WHERE id = ?",
      [contestId],
    );

    if (contestRows.length === 0) {
      return res.status(404).json({ error: "Contest not found." });
    }

    const [problemRows] = await db.execute(
      "SELECT id FROM problems WHERE id = ?",
      [problemId],
    );

    if (problemRows.length === 0) {
      return res.status(404).json({ error: "Problem not found." });
    }

    const [existingRows] = await db.execute(
      `SELECT id
       FROM contest_problems
       WHERE contest_id = ? AND problem_id = ?`,
      [contestId, problemId],
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        error: "This problem is already assigned to this contest.",
      });
    }

    const [assignedRows] = await db.execute(
      `SELECT serial_letter
       FROM contest_problems
       WHERE contest_id = ?
       ORDER BY serial_letter DESC
       LIMIT 1`,
      [contestId],
    );

    let serialLetter = "A";

    if (assignedRows.length > 0) {
      const lastLetter = assignedRows[0].serial_letter;
      serialLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
    }

    if (serialLetter > "Z") {
      return res.status(400).json({
        error: "A contest can contain at most 26 problems.",
      });
    }

    await db.execute(
      `INSERT INTO contest_problems
        (contest_id, problem_id, serial_letter)
       VALUES (?, ?, ?)`,
      [contestId, problemId, serialLetter],
    );

    res.status(201).json({
      message: "Problem added to contest.",
      contest_id: contestId,
      problem_id: problemId,
      serial_letter: serialLetter,
    });
  } catch (err) {
    console.error("Add contest problem error:", err);
    res.status(500).json({ error: "Unable to add problem to contest." });
  }
});

router.delete(
  "/contests/:contestId/problems/:problemId",
  async (req, res) => {
    const contestId = Number(req.params.contestId);
    const problemId = Number(req.params.problemId);

    if (!Number.isInteger(contestId) || contestId <= 0) {
      return res.status(400).json({ error: "Invalid contest ID." });
    }

    if (!Number.isInteger(problemId) || problemId <= 0) {
      return res.status(400).json({ error: "Invalid problem ID." });
    }

    try {
      const [result] = await db.execute(
        `DELETE FROM contest_problems
         WHERE contest_id = ? AND problem_id = ?`,
        [contestId, problemId],
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "That problem is not assigned to this contest.",
        });
      }

      res.json({
        message: "Problem removed from contest.",
      });
    } catch (err) {
      console.error("Remove contest problem error:", err);
      res.status(500).json({
        error: "Unable to remove problem from contest.",
      });
    }
  },
);

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