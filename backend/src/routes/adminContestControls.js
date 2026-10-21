const express = require("express");
const router = express.Router();

const db = require("../db");

const {
  requireAuth,
  requireAdmin,
} = require("../middleware/auth");

const {
  getContestClock,
} = require("../utils/contestClock");

router.use(requireAuth, requireAdmin);

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseId(value) {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw fail(400, "Invalid contest ID.");
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id)) {
    throw fail(400, "Invalid contest ID.");
  }

  return id;
}

function has(object, field) {
  return Object.prototype.hasOwnProperty.call(
    object,
    field,
  );
}

function validateBody(body, allowedFields) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw fail(400, "A JSON object is required.");
  }

  const unsupported = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unsupported.length > 0) {
    throw fail(
      400,
      `Unsupported fields: ${unsupported.join(", ")}.`,
    );
  }

  if (
    !Number.isSafeInteger(body.expected_revision) ||
    body.expected_revision < 1
  ) {
    throw fail(
      400,
      "expected_revision must be a positive integer.",
    );
  }

  if (
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    body.reason.trim().length > 1000
  ) {
    throw fail(
      400,
      "A reason between 1 and 1000 characters is required.",
    );
  }

  return body.reason.trim();
}

// Canonical UTC strings with whole-second precision.
// The existing schedule columns are DATETIME without fractions.
function parseScheduleTime(value, field) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(
      value,
    )
  ) {
    throw fail(
      400,
      `${field} must use UTC ISO format, for example 2026-10-22T06:00:00.000Z.`,
    );
  }

  const date = new Date(value);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString() !== value
  ) {
    throw fail(400, `${field} is not a valid date.`);
  }

  return date;
}

function publicContest(contest, now) {
  return {
    ...contest,
    ...getContestClock(contest, now),
    timezone: "Asia/Dhaka",
  };
}

function sendError(res, error) {
  const expected =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 500;

  if (!expected) {
    console.error("Admin contest control error:", error);
  }

  return res.status(expected ? error.statusCode : 500).json({
    error: expected
      ? error.message
      : "Unable to process the contest control request.",
  });
}

async function withContestLock(contestId, callback) {
  const connection = await db.getConnection();
  let started = false;

  try {
    await connection.beginTransaction();
    started = true;

    const [rows] = await connection.execute(
      `
      SELECT *
      FROM contests
      WHERE id = ?
      FOR UPDATE
      `,
      [contestId],
    );

    if (rows.length === 0) {
      throw fail(404, "Contest not found.");
    }

    // Query the clock after the lock has been acquired.
    const [clockRows] = await connection.execute(
      "SELECT NOW(3) AS server_now",
    );

    const result = await callback(
      connection,
      rows[0],
      clockRows[0].server_now,
    );

    await connection.commit();
    started = false;

    return result;
  } catch (error) {
    if (started) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Contest control rollback error:",
          rollbackError,
        );
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function recordChange(
  connection,
  {
    adminId,
    contestId,
    revision,
    action,
    before,
    after,
    reason,
    announcement,
  },
) {
  await connection.execute(
    `
    INSERT INTO admin_audit_logs (
      admin_id,
      action,
      target_type,
      target_id,
      details
    )
    VALUES (?, ?, 'contest', ?, ?)
    `,
    [
      adminId,
      action,
      contestId,
      JSON.stringify({
        before,
        after,
        reason,
        revision,
      }),
    ],
  );

  await connection.execute(
    `
    INSERT INTO contest_announcements (
      contest_id,
      admin_id,
      contest_revision,
      event_type,
      message
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      contestId,
      adminId,
      revision,
      action,
      announcement,
    ],
  );
}

async function readUpdatedContest(
  connection,
  contestId,
  now,
) {
  const [rows] = await connection.execute(
    "SELECT * FROM contests WHERE id = ?",
    [contestId],
  );

  return publicContest(rows[0], now);
}

// Read-only admin contest details.
router.get("/contests/:id", async (req, res) => {
  try {
    const contestId = parseId(req.params.id);

    const [rows] = await db.execute(
      "SELECT * FROM contests WHERE id = ?",
      [contestId],
    );

    if (rows.length === 0) {
      throw fail(404, "Contest not found.");
    }

    const [clockRows] = await db.execute(
      "SELECT NOW(3) AS server_now",
    );

    const [announcements] = await db.execute(
      `
      SELECT
        id,
        contest_revision,
        event_type,
        message,
        created_at
      FROM contest_announcements
      WHERE contest_id = ?
      ORDER BY id DESC
      LIMIT 20
      `,
      [contestId],
    );

    return res.json({
      ...publicContest(
        rows[0],
        clockRows[0].server_now,
      ),
      announcements,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

// Edit metadata or safely change the schedule.
router.patch("/contests/:id", async (req, res) => {
  try {
    const contestId = parseId(req.params.id);

    const reason = validateBody(req.body, [
      "expected_revision",
      "reason",
      "title",
      "description",
      "start_time",
      "end_time",
    ]);

    const result = await withContestLock(
      contestId,
      async (connection, contest, now) => {
        if (
          Number(contest.revision) !==
          req.body.expected_revision
        ) {
          throw fail(
            409,
            "This contest was changed by another request. Reload it before saving.",
          );
        }

        const title = has(req.body, "title")
          ? req.body.title
          : contest.title;

        if (
          typeof title !== "string" ||
          !title.trim() ||
          Array.from(title.trim()).length > 200
        ) {
          throw fail(
            400,
            "Title must contain between 1 and 200 characters.",
          );
        }

        const description = has(req.body, "description")
          ? req.body.description
          : contest.description;

        if (
          description !== null &&
          (
            typeof description !== "string" ||
            Buffer.byteLength(description, "utf8") > 60000
          )
        ) {
          throw fail(
            400,
            "Description must be null or text no larger than 60000 bytes.",
          );
        }

        const start = has(req.body, "start_time")
          ? parseScheduleTime(
              req.body.start_time,
              "start_time",
            )
          : contest.start_time;

        const end = has(req.body, "end_time")
          ? parseScheduleTime(
              req.body.end_time,
              "end_time",
            )
          : contest.end_time;

        const startChanged =
          start.getTime() !==
          contest.start_time.getTime();

        const endChanged =
          end.getTime() !==
          contest.end_time.getTime();

        const scheduleChanged =
          startChanged || endChanged;

        const clock = getContestClock(contest, now);

        if (scheduleChanged) {
          if (clock.status === "invalid") {
            throw fail(
              409,
              "The existing schedule is invalid. Repair it through a separate reviewed maintenance operation.",
            );
          }

          if (clock.status === "ended") {
            throw fail(
              409,
              "Ended contests cannot be rescheduled or reopened in Phase 1.",
            );
          }

          if (end.getTime() <= start.getTime()) {
            throw fail(
              400,
              "The end time must be later than the start time.",
            );
          }

          if (end.getTime() <= now.getTime()) {
            throw fail(
              400,
              "The new end time must be in the future. Use End contest now for immediate closure.",
            );
          }

          if (clock.status === "live" && startChanged) {
            throw fail(
              409,
              "The start time is locked after the contest begins.",
            );
          }

          if (
            clock.status === "upcoming" &&
            start.getTime() <= now.getTime()
          ) {
            throw fail(
              400,
              "A rescheduled upcoming contest must still start in the future.",
            );
          }

          if (startChanged) {
            const [submissionRows] =
              await connection.execute(
                `
                SELECT id
                FROM submissions
                WHERE contest_id = ?
                LIMIT 1
                `,
                [contestId],
              );

            if (submissionRows.length > 0) {
              throw fail(
                409,
                "The start time cannot change because this contest already has submissions.",
              );
            }
          }
        }

        const next = {
          title: title.trim(),
          description,
          start_time: start,
          end_time: end,
        };

        const metadataChanged =
          next.title !== contest.title ||
          next.description !== contest.description;

        if (!metadataChanged && !scheduleChanged) {
          return {
            message: "No changes were necessary.",
            contest: publicContest(contest, now),
          };
        }

        const revision = Number(contest.revision) + 1;

        await connection.execute(
          `
          UPDATE contests
          SET
            title = ?,
            description = ?,
            start_time = ?,
            end_time = ?,
            revision = ?
          WHERE id = ?
          `,
          [
            next.title,
            next.description,
            next.start_time,
            next.end_time,
            revision,
            contestId,
          ],
        );

        const action = scheduleChanged
          ? "contest_schedule_changed"
          : "contest_details_changed";

        const announcement = scheduleChanged
          ? [
              "The contest schedule has changed.",
              `Starts: ${start.toISOString()}.`,
              `Ends: ${end.toISOString()}.`,
              `Reason: ${reason}`,
            ].join(" ")
          : `Contest details have been updated. Reason: ${reason}`;

        await recordChange(connection, {
          adminId: req.user.userId,
          contestId,
          revision,
          action,
          before: {
            title: contest.title,
            description: contest.description,
            start_time: contest.start_time,
            end_time: contest.end_time,
          },
          after: next,
          reason,
          announcement,
        });

        return {
          message: "Contest updated successfully.",
          contest: await readUpdatedContest(
            connection,
            contestId,
            now,
          ),
        };
      },
    );

    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Explicit early closure. Never overwrites the scheduled deadline.
router.post("/contests/:id/end", async (req, res) => {
  try {
    const contestId = parseId(req.params.id);

    const reason = validateBody(req.body, [
      "expected_revision",
      "reason",
    ]);

    const result = await withContestLock(
      contestId,
      async (connection, contest, now) => {
        if (
          Number(contest.revision) !==
          req.body.expected_revision
        ) {
          throw fail(
            409,
            "This contest was changed by another request. Reload it before ending it.",
          );
        }

        const clock = getContestClock(contest, now);

        if (
          clock.status !== "live" ||
          now.getTime() <= contest.start_time.getTime()
        ) {
          throw fail(
            409,
            "Only a currently running contest can be ended now.",
          );
        }

        const revision = Number(contest.revision) + 1;

        await connection.execute(
          `
          UPDATE contests
          SET ended_at = ?, revision = ?
          WHERE id = ?
          `,
          [now, revision, contestId],
        );

        await recordChange(connection, {
          adminId: req.user.userId,
          contestId,
          revision,
          action: "contest_ended_early",
          before: {
            ended_at: contest.ended_at,
            scheduled_end_time: contest.end_time,
          },
          after: {
            ended_at: now,
            scheduled_end_time: contest.end_time,
          },
          reason,
          announcement:
            `The contest was ended early at ${now.toISOString()}. Reason: ${reason}`,
        });

        return {
          message: "Contest ended successfully.",
          contest: await readUpdatedContest(
            connection,
            contestId,
            now,
          ),
        };
      },
    );

    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;