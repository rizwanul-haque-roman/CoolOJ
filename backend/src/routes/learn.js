const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

// GET all semesters
router.get("/semesters", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT *
        FROM semesters
        ORDER BY number ASC
      `,
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /semesters error:", err);

    return res.status(500).json({
      error: "Failed to fetch semesters",
    });
  }
});

// GET subjects for a semester
router.get("/semesters/:semesterId/subjects", async (req, res) => {
  try {
    const { semesterId } = req.params;

    const [rows] = await db.query(
      `
        SELECT *
        FROM semester_subjects
        WHERE semester_id = ?
        ORDER BY id ASC
      `,
      [semesterId],
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /semesters/:semesterId/subjects error:", err);

    return res.status(500).json({
      error: "Failed to fetch subjects",
    });
  }
});

// Public lesson list, with personal progress for authenticated requests.
router.get(
  "/subjects/:subjectId/topics",
  (req, res, next) => {
    // Guests may browse. If credentials are supplied, validate them.
    if (req.headers.authorization !== undefined) {
      return requireAuth(req, res, next);
    }

    return next();
  },
  async (req, res) => {
    const rawSubjectId = req.params.subjectId;
    const subjectId = Number(rawSubjectId);

    if (
      !/^[1-9]\d*$/.test(rawSubjectId) ||
      !Number.isSafeInteger(subjectId)
    ) {
      return res.status(400).json({
        error: "Invalid subject ID.",
      });
    }

    // Never use a userId supplied in query parameters.
    const userId = req.user?.userId ?? null;

    try {
      const [rows] = await db.execute(
        `
          SELECT
            lt.id,
            lt.subject_id,
            lt.order_index,
            lt.title,
            CASE
              WHEN tp.id IS NOT NULL THEN 1
              ELSE 0
            END AS completed
          FROM learn_topics AS lt
          INNER JOIN semester_subjects AS ss
            ON ss.id = lt.subject_id
          INNER JOIN semesters AS s
            ON s.id = ss.semester_id
          LEFT JOIN topic_progress AS tp
            ON tp.topic_id = lt.id
            AND tp.user_id = ?
          WHERE lt.subject_id = ?
            AND lt.status = 'published'
            AND COALESCE(ss.is_placeholder, 0) = 0
            AND s.is_active = 1
          ORDER BY lt.order_index ASC, lt.id ASC
        `,
        [userId, subjectId],
      );

      return res.json(rows);
    } catch (err) {
      console.error("GET learning topics error:", err);

      return res.status(500).json({
        error: "Failed to fetch topics.",
      });
    }
  },
);

// GET single topic with subject execution/editor policy
router.get("/topics/:topicId", async (req, res) => {
  try {
    const { topicId } = req.params;

    const [rows] = await db.query(
      `
        SELECT
          lt.id,
          lt.subject_id,
          lt.order_index,
          lt.title,
          lt.content,
          lt.starter_code,

          ss.name AS subject_name,
          ss.language AS subject_language,
          ss.execution_mode,
          ss.default_language,
          ss.editor_enabled,
          ss.run_enabled,
          ss.editor_message

        FROM learn_topics AS lt
        INNER JOIN semester_subjects AS ss
          ON ss.id = lt.subject_id

        WHERE lt.id = ?
        LIMIT 1
      `,
      [topicId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Topic not found",
      });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /topics/:topicId error:", err);

    return res.status(500).json({
      error: "Failed to fetch topic",
    });
  }
});

// POST mark a published topic complete for the authenticated user
router.post(
  "/topics/:topicId/complete",
  requireAuth,
  async (req, res) => {
    const rawTopicId = req.params.topicId;
    const topicId = Number(rawTopicId);

    if (
      !/^[1-9]\d*$/.test(rawTopicId) ||
      !Number.isSafeInteger(topicId)
    ) {
      return res.status(400).json({
        error: "Invalid topic ID.",
      });
    }

    try {
      const [topics] = await db.execute(
        `
          SELECT lt.id
          FROM learn_topics AS lt
          INNER JOIN semester_subjects AS ss
            ON ss.id = lt.subject_id
          INNER JOIN semesters AS s
            ON s.id = ss.semester_id
          WHERE lt.id = ?
            AND lt.status = 'published'
            AND COALESCE(ss.is_placeholder, 0) = 0
            AND s.is_active = 1
          LIMIT 1
        `,
        [topicId],
      );

      if (!topics.length) {
        return res.status(404).json({
          error: "Lesson not found or unavailable.",
        });
      }

      await db.execute(
        `
          INSERT INTO topic_progress (user_id, topic_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE id = id
        `,
        [req.user.userId, topicId],
      );

      return res.json({
        topic_id: topicId,
        completed: true,
        message: "Topic marked as complete.",
      });
    } catch (err) {
      console.error("Complete learning topic error:", err);

      return res.status(500).json({
        error: "Failed to mark topic complete.",
      });
    }
  },
);

// GET progress summary for a subject
router.get("/subjects/:subjectId/progress", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.json({
        completed: 0,
        total: 0,
      });
    }

    const [[{ total }]] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM learn_topics
        WHERE subject_id = ?
      `,
      [subjectId],
    );

    const [[{ completed }]] = await db.query(
      `
        SELECT COUNT(*) AS completed
        FROM topic_progress AS tp
        INNER JOIN learn_topics AS lt
          ON tp.topic_id = lt.id
        WHERE lt.subject_id = ?
          AND tp.user_id = ?
      `,
      [subjectId, userId],
    );

    return res.json({
      completed,
      total,
    });
  } catch (err) {
    console.error("GET /subjects/:subjectId/progress error:", err);

    return res.status(500).json({
      error: "Failed to fetch progress",
    });
  }
});

module.exports = router;