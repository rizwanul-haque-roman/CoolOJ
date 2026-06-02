const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM contests WHERE is_public = true ORDER BY start_time ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [contestRows] = await db.execute(
      'SELECT * FROM contests WHERE id = ? AND is_public = true',
      [req.params.id]
    );

    if (contestRows.length === 0) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const [problems] = await db.execute(
      `SELECT cp.serial_letter, p.id, p.title, p.difficulty
       FROM contest_problems cp
       JOIN problems p ON cp.problem_id = p.id
       WHERE cp.contest_id = ?
       ORDER BY cp.serial_letter`,
      [req.params.id]
    );

    res.json({ ...contestRows[0], problems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    await db.execute(
      'INSERT IGNORE INTO contest_registrations (contest_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.userId]
    );
    res.json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.name, u.id AS user_id,
              COUNT(CASE WHEN s.verdict = 'Accepted' THEN 1 END) AS solved,
              SUM(CASE WHEN s.verdict = 'Accepted' THEN 100 ELSE 0 END) AS total_score,
              MIN(CASE WHEN s.verdict = 'Accepted' THEN s.submitted_at END) AS last_ac_time
       FROM contest_registrations cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN submissions s ON s.user_id = u.id AND s.contest_id = cr.contest_id
       WHERE cr.contest_id = ?
       GROUP BY u.id, u.name
       ORDER BY total_score DESC, last_ac_time ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;