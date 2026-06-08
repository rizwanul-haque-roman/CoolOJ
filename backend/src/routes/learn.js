const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all semesters
router.get('/semesters', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM semesters ORDER BY number'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /semesters error:', err);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
});

// GET subjects for a semester
router.get('/semesters/:semesterId/subjects', async (req, res) => {
  try {
    const { semesterId } = req.params;

    const [rows] = await db.query(
      `SELECT *
       FROM semester_subjects
       WHERE semester_id = ?
       ORDER BY id`,
      [semesterId]
    );

    res.json(rows);
  } catch (err) {
    console.error('GET /semesters/:semesterId/subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// GET topics for a subject
router.get('/subjects/:subjectId/topics', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.query.userId || null;

    if (userId) {
      const [rows] = await db.query(
        `SELECT lt.*,
                CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END AS completed
         FROM learn_topics lt
         LEFT JOIN topic_progress tp
           ON lt.id = tp.topic_id
          AND tp.user_id = ?
         WHERE lt.subject_id = ?
         ORDER BY lt.order_index`,
        [userId, subjectId]
      );

      return res.json(rows);
    }

    const [rows] = await db.query(
      `SELECT lt.*,
              0 AS completed
       FROM learn_topics lt
       WHERE lt.subject_id = ?
       ORDER BY lt.order_index`,
      [subjectId]
    );

    res.json(rows);
  } catch (err) {
    console.error('GET /subjects/:subjectId/topics error:', err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// GET single topic
router.get('/topics/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;

    const [rows] = await db.query(
      `SELECT *
       FROM learn_topics
       WHERE id = ?`,
      [topicId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('GET /topics/:topicId error:', err);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

// POST mark topic complete
router.post('/topics/:topicId/complete', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await db.query(
      `INSERT IGNORE INTO topic_progress (user_id, topic_id)
       VALUES (?, ?)`,
      [userId, topicId]
    );

    res.json({ message: 'Topic marked as complete' });
  } catch (err) {
    console.error('POST /topics/:topicId/complete error:', err);
    res.status(500).json({ error: 'Failed to mark topic complete' });
  }
});

// GET progress summary for a subject
router.get('/subjects/:subjectId/progress', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.json({ completed: 0, total: 0 });
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM learn_topics
       WHERE subject_id = ?`,
      [subjectId]
    );

    const [[{ completed }]] = await db.query(
      `SELECT COUNT(*) AS completed
       FROM topic_progress tp
       JOIN learn_topics lt ON tp.topic_id = lt.id
       WHERE lt.subject_id = ?
         AND tp.user_id = ?`,
      [subjectId, userId]
    );

    res.json({ completed, total });
  } catch (err) {
    console.error('GET /subjects/:subjectId/progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

module.exports = router;