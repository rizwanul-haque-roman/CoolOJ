function toMilliseconds(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  // mysql2 currently returns database date fields as Date objects.
  if (value instanceof Date) {
    return value.getTime();
  }

  // Require explicit offsets for string values.
  // Do not silently interpret a bare SQL DATETIME string.
  if (
    typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  ) {
    return Date.parse(value);
  }

  return NaN;
}

function getContestClock(contest, now = new Date()) {
  const startMs = toMilliseconds(contest.start_time);
  const scheduledEndMs = toMilliseconds(contest.end_time);
  const nowMs = toMilliseconds(now);

  const hasManualEnd =
    contest.ended_at !== null &&
    contest.ended_at !== undefined;

  const manualEndMs = hasManualEnd
    ? toMilliseconds(contest.ended_at)
    : null;

  const valid =
    Number.isFinite(startMs) &&
    Number.isFinite(scheduledEndMs) &&
    Number.isFinite(nowMs) &&
    scheduledEndMs > startMs &&
    (
      !hasManualEnd ||
      (
        Number.isFinite(manualEndMs) &&
        manualEndMs > startMs &&
        manualEndMs <= scheduledEndMs
      )
    );

  if (!valid) {
    return {
      status: "invalid",
      server_time: Number.isFinite(nowMs)
        ? new Date(nowMs).toISOString()
        : null,
      effective_end_time: null,
      remaining_seconds: 0,
    };
  }

  const effectiveEndMs = hasManualEnd
    ? manualEndMs
    : scheduledEndMs;

  const status =
    nowMs < startMs
      ? "upcoming"
      : nowMs < effectiveEndMs
        ? "live"
        : "ended";

  return {
    status,
    server_time: new Date(nowMs).toISOString(),
    effective_end_time:
      new Date(effectiveEndMs).toISOString(),
    remaining_seconds:
      status === "live"
        ? Math.max(
            0,
            Math.ceil((effectiveEndMs - nowMs) / 1000),
          )
        : 0,
  };
}

module.exports = {
  getContestClock,
};