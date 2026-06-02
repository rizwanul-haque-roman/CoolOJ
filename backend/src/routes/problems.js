const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all public problems (with optional subject filter)
router.get('/', async (req, res) => {
  const { subject_id } = req.query;

  try {
    let query = `
      SELECT p.*, s.name AS subject_name
      FROM problems p
      LEFT JOIN subjects s ON p.subject_id = s.id
      WHERE p.is_public = true
    `;
    const params = [];

    if (subject_id) {
      query += ' AND p.subject_id = ?';
      params.push(subject_id);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single problem by ID (with sample test cases)
router.get('/:id', async (req, res) => {
  try {
    const [problemRows] = await db.execute(
      'SELECT * FROM problems WHERE id = ? AND is_public = true',
      [req.params.id]
    );

    if (problemRows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const [samples] = await db.execute(
      'SELECT input, expected_output FROM test_cases WHERE problem_id = ? AND is_sample = true',
      [req.params.id]
    );

    res.json({ ...problemRows[0], sample_tests: samples });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all subjects
router.get('/meta/subjects', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM subjects ORDER BY semester_no'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;