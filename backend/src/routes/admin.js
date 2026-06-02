const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.post('/problems', async (req, res) => {
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
      'INSERT INTO problems (title, statement, input_format, output_format, constraints, difficulty, time_limit_ms, memory_limit_kb, subject_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
      ]
    );

    const [rows] = await db.execute(
      'SELECT * FROM problems WHERE id = ?',
      [result.insertId]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/problems/:id/testcases', async (req, res) => {
  const { test_cases } = req.body;

  try {
    for (const tc of test_cases) {
      await db.execute(
        'INSERT INTO test_cases (problem_id, input, expected_output, is_sample) VALUES (?, ?, ?, ?)',
        [req.params.id, tc.input, tc.expected_output, tc.is_sample || false]
      );
    }

    await db.execute(
      'UPDATE problems SET is_public = true WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Test cases added and problem published' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/contests', async (req, res) => {
  const { title, description, start_time, end_time, problem_ids } = req.body;

  try {
    const [contest] = await db.execute(
      'INSERT INTO contests (title, description, start_time, end_time, created_by, is_public) VALUES (?, ?, ?, ?, ?, true)',
      [title, description, start_time, end_time, req.user.userId]
    );

    const contest_id = contest.insertId;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < problem_ids.length; i++) {
      await db.execute(
        'INSERT INTO contest_problems (contest_id, problem_id, serial_letter) VALUES (?, ?, ?)',
        [contest_id, problem_ids[i], letters[i]]
      );
    }

    const [rows] = await db.execute(
      'SELECT * FROM contests WHERE id = ?',
      [contest_id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT s.id, u.name AS user_name, p.title AS problem_title, s.language, s.verdict, s.submitted_at
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       JOIN problems p ON s.problem_id = p.id
       ORDER BY s.submitted_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;