const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;

function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

router.post("/register", async (req, res) => {
  const username = String(req.body.username || req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!username || !email || !password) {
    return res.status(400).json({
      error: "Username, email, and password are required.",
    });
  }

  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({
      error:
        "Username must be 3-30 characters and may contain only letters, numbers, underscores, and hyphens.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters long.",
    });
  }

  try {
    const [existing] = await db.execute(
      `SELECT id, name, email
       FROM users
       WHERE LOWER(name) = LOWER(?) OR LOWER(email) = LOWER(?)
       LIMIT 1`,
      [username, email],
    );

    if (existing.length > 0) {
      const existingUser = existing[0];

      if (existingUser.name.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ error: "Username is already taken." });
      }

      return res.status(409).json({ error: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'student')`,
      [username, email, passwordHash],
    );

    const user = {
      id: result.insertId,
      name: username,
      email,
      role: "student",
    };

    const token = createToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("Registration error:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Username or email is already registered.",
      });
    }

    return res.status(500).json({
      error: "Unable to create account.",
    });
  }
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required.",
    });
  }

  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = createToken(safeUser);

    return res.json({
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Unable to log in." });
  }
});

module.exports = router;