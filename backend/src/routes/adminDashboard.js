const express = require("express"),
  router = express.Router();
const db = require("../db"),
  { requireAuth, requireAdmin } = require("../middleware/auth"),
  { getContestClock } = require("../utils/contestClock");
router.use(requireAuth, requireAdmin);
router.get("/", async (req, res) => {
  try {
    const days = req.query.days === undefined ? 7 : Number(req.query.days);
    if (![7, 30].includes(days))
      return res.status(400).json({ error: "Choose a 7- or 30-day range." });
    const [clock] = await db.execute(
      "SELECT NOW(3) server_time,DATE_FORMAT(NOW(),'%Y-%m-%d') today",
    );
    const now = clock[0].server_time;
    const [accounts] =
      await db.execute(`SELECT COUNT(*) accounts,COALESCE(SUM(role='student' AND status='active'),0) active_students,
    COALESCE(SUM(status='suspended'),0) suspended,COALESCE(SUM(DATE(created_at)=CURDATE()),0) new_today FROM users`);
    const [problems] = await db.execute(
      `SELECT COUNT(*) total,COALESCE(SUM(is_public=true),0) public_problems FROM problems`,
    );
    const [submissions] =
      await db.execute(`SELECT COALESCE(SUM(DATE(submitted_at)=CURDATE()),0) today,
    COALESCE(SUM(verdict='Pending'),0) pending,COALESCE(SUM(verdict='Pending' AND submitted_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE)),0) pending_over_five_minutes,
    COALESCE(SUM(verdict='Internal Error' AND DATE(submitted_at)=CURDATE()),0) internal_errors_today FROM submissions`);
    const [contestRows] =
      await db.execute(`SELECT c.*,(SELECT COUNT(*) FROM contest_registrations cr WHERE cr.contest_id=c.id) registered,
    (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id=c.id AND cp.withdrawn_at IS NULL) active_problems
    FROM contests c ORDER BY c.start_time DESC,c.id DESC`);
    const contests = contestRows.map((c) => ({
      ...c,
      ...getContestClock(c, now),
    }));
    const [missingTests] = await db.execute(
      `SELECT COUNT(*) total FROM problems p WHERE NOT EXISTS(SELECT 1 FROM test_cases tc WHERE tc.problem_id=p.id AND tc.is_sample=false)`,
    );
    const [recent] =
      await db.execute(`SELECT s.id,s.user_id,u.name user_name,p.title problem_title,s.problem_id,s.contest_id,s.language,s.verdict,s.submitted_at
    FROM submissions s INNER JOIN users u ON u.id=s.user_id INNER JOIN problems p ON p.id=s.problem_id ORDER BY s.submitted_at DESC,s.id DESC LIMIT 10`);
    const [audit] = await db.execute(
      `SELECT
        a.id,
        a.action,
        a.category,
        a.target_type,
        a.target_id,
        a.description,
        a.outcome,
        a.created_at,
        COALESCE(
          NULLIF(a.admin_name, ''),
          u.name,
          CONCAT('Administrator #', a.admin_id),
          'Unknown administrator'
        ) AS admin_name,
        COALESCE(
          NULLIF(a.admin_email, ''),
          u.email
        ) AS admin_email
      FROM admin_audit_logs AS a
      LEFT JOIN users AS u
        ON u.id = a.admin_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 10`,
    );
    const [trend] =
      await db.execute(`SELECT DATE_FORMAT(submitted_at,'%Y-%m-%d') day,COUNT(*) submissions,COALESCE(SUM(verdict='Accepted'),0) accepted
    FROM submissions WHERE submitted_at>=DATE_SUB(CURDATE(),INTERVAL ${days - 1} DAY) AND submitted_at<=NOW(3) GROUP BY DATE_FORMAT(submitted_at,'%Y-%m-%d') ORDER BY day`);
    const [verdicts] = await db.execute(
      `SELECT verdict,COUNT(*) total FROM submissions WHERE submitted_at>=DATE_SUB(CURDATE(),INTERVAL ${days - 1} DAY) AND submitted_at<=NOW(3) GROUP BY verdict ORDER BY total DESC`,
    );
    const [withdrawals] = await db.execute(
      "SELECT COUNT(*) total FROM contest_problems WHERE withdrawn_at>=DATE_SUB(NOW(),INTERVAL 7 DAY)",
    );
    const numeric = (row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]));
    res.json({
      server_time: now,
      today: clock[0].today,
      timezone: "Asia/Dhaka",
      days,
      accounts: numeric(accounts[0]),
      problems: numeric(problems[0]),
      submissions: numeric(submissions[0]),
      contest_counts: {
        total: contests.length,
        live: contests.filter((c) => c.status === "live").length,
        upcoming: contests.filter((c) => c.status === "upcoming").length,
      },
      contests: contests
        .filter((c) => ["live", "upcoming"].includes(c.status))
        .sort(
          (a, b) =>
            (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) ||
            new Date(a.start_time) - new Date(b.start_time),
        )
        .slice(0, 10),
      attention: {
        missing_hidden_tests: Number(missingTests[0].total),
        empty_upcoming: contests.filter(
          (c) => c.status === "upcoming" && !Number(c.active_problems),
        ).length,
        invalid_schedules: contests.filter((c) => c.status === "invalid")
          .length,
        withdrawals_last_seven_days: Number(withdrawals[0].total),
      },
      recent_submissions: recent,
      audit,
      trend,
      verdicts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Unable to load the dashboard." });
  }
});
module.exports = router;