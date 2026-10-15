import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

function getStatus(contest, now) {
  const start = new Date(contest.start_time).getTime();
  const end = new Date(contest.end_time).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return "invalid";
  }

  if (now < start) return "upcoming";
  if (now < end) return "live";

  return "ended";
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(startValue, endValue) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return "Not available";
  }

  const totalMinutes = Math.ceil((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / 1000),
  );

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const clock = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  return days > 0 ? `${days}d ${clock}` : clock;
}

function statusStyle(status) {
  if (status === "live") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "upcoming") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  if (status === "ended") {
    return "border-slate-400/20 bg-slate-400/10 text-slate-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

const STATUS_LABELS = {
  upcoming: "Upcoming",
  live: "Live",
  ended: "Finished",
  invalid: "Schedule unavailable",
};

function ContestDetails() {
  const { id } = useParams();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();

    async function loadContest() {
      setLoading(true);
      setError("");
      setNotFound(false);
      setContest(null);

      const contestId = Number(id);

      if (!Number.isInteger(contestId) || contestId <= 0) {
        setError("The contest ID is invalid.");
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/contests/${contestId}`,
          { signal: controller.signal },
        );

        const data = response.data;

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          !data.id ||
          !Array.isArray(data.problems)
        ) {
          throw new Error(
            "The server returned an unexpected contest response.",
          );
        }

        if (!controller.signal.aborted) {
          setContest(data);
          setNow(Date.now());
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        const missing = err.response?.status === 404;

        setNotFound(missing);
        setError(
          missing
            ? "This contest does not exist or is not public."
            : err.response?.data?.error ||
                err.message ||
                "Unable to load the contest.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadContest();

    return () => controller.abort();
  }, [id, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const status = contest ? getStatus(contest, now) : null;

  const countdownTarget =
    status === "upcoming"
      ? new Date(contest.start_time).getTime()
      : status === "live"
        ? new Date(contest.end_time).getTime()
        : null;

  const problems = contest?.problems || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/contests"
          className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          ← Back to contests
        </Link>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div
          role="status"
          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6 text-sm text-cyan-100"
        >
          Loading contest details...
        </div>
      )}

      {!loading && error && (
        <section
          role="alert"
          className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6"
        >
          <h2 className="text-xl font-bold text-white">
            {notFound
              ? "Contest unavailable"
              : "Unable to load contest"}
          </h2>

          <p className="mt-3 text-sm text-rose-200">
            {error}
          </p>

          {!notFound && (
            <button
              type="button"
              onClick={() =>
                setRefreshKey((value) => value + 1)
              }
              className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
            >
              Try again
            </button>
          )}
        </section>
      )}

      {!loading && !error && contest && (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                DPC-OJ Contest #{contest.id}
              </p>

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                  status,
                )}`}
              >
                {status === "live" && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300"
                  />
                )}

                {STATUS_LABELS[status]}
              </span>
            </div>

            <h2 className="mt-4 break-words text-2xl font-bold text-white sm:text-3xl">
              {contest.title || "Untitled contest"}
            </h2>

            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
              {contest.description ||
                "No description has been added yet."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Starts",
                  value: formatDate(contest.start_time),
                },
                {
                  label: "Ends",
                  value: formatDate(contest.end_time),
                },
                {
                  label: "Duration",
                  value: formatDuration(
                    contest.start_time,
                    contest.end_time,
                  ),
                },
                {
                  label: "Assigned Problems",
                  value: problems.length,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {countdownTarget !== null && (
              <div
                className={`mt-5 rounded-2xl border p-5 ${statusStyle(
                  status,
                )}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {status === "upcoming"
                    ? "Starts in"
                    : "Time remaining"}
                </p>

                <p className="mt-2 font-mono text-3xl font-bold tracking-wide">
                  {formatCountdown(countdownTarget - now)}
                </p>
              </div>
            )}

            {status === "ended" && (
              <p className="mt-5 text-sm text-slate-400">
                This contest has finished.
              </p>
            )}

            {status === "invalid" && (
              <p className="mt-5 text-sm text-amber-200">
                The contest schedule needs to be corrected.
              </p>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Dates and times use your browser’s local timezone.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white">
                Contest Problems
              </h3>

              <span className="text-sm text-slate-400">
                {problems.length} problem
                {problems.length === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-2 text-sm leading-7 text-slate-400">
              Problems assigned to this contest are listed below.
              Contest solving and submissions will be connected in
              a later step.
            </p>

            {problems.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-200">
                  No problems have been assigned yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[500px] text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.04]">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Letter
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Problem
                      </th>

                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Difficulty
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {problems.map((problem) => (
                      <tr
                        key={problem.id}
                        className="border-b border-white/5 transition hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 font-mono font-bold text-cyan-200">
                            {problem.serial_letter || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-semibold text-white">
                          {problem.title || "Untitled problem"}
                        </td>

                        <td className="px-4 py-4 capitalize text-slate-300">
                          {problem.difficulty || "Not specified"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default ContestDetails;