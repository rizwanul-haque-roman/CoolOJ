import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

const FILTERS = [
  { value: "all", label: "All Contests" },
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "ended", label: "Finished" },
];

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

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function StatusBadge({ status }) {
  const styles = {
    live: {
      label: "Live",
      className:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },
    upcoming: {
      label: "Upcoming",
      className:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    },
    ended: {
      label: "Finished",
      className:
        "border-slate-400/20 bg-slate-400/10 text-slate-300",
    },
    invalid: {
      label: "Schedule unavailable",
      className:
        "border-amber-400/20 bg-amber-400/10 text-amber-200",
    },
  };

  const badge = styles[status] || styles.invalid;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
    >
      {status === "live" && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300"
        />
      )}

      {badge.label}
    </span>
  );
}

function ContestCard({ contest, now }) {
  const status = getStatus(contest, now);

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg transition hover:border-cyan-400/30 hover:bg-slate-900/80">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={status} />

        <span className="font-mono text-xs text-slate-500">
          #{contest.id}
        </span>
      </div>

      <h3 className="mt-5 break-words text-xl font-bold text-white">
        {contest.title || "Untitled contest"}
      </h3>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
        {contest.description || "No description has been added yet."}
      </p>

      <dl className="mt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-sm text-slate-500">
            Starts
          </dt>

          <dd className="text-right text-sm text-slate-200">
            {formatDate(contest.start_time)}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-sm text-slate-500">
            Ends
          </dt>

          <dd className="text-right text-sm text-slate-200">
            {formatDate(contest.end_time)}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-sm text-slate-500">
            Duration
          </dt>

          <dd className="text-right text-sm text-slate-200">
            {formatDuration(
              contest.start_time,
              contest.end_time,
            )}
          </dd>
        </div>

        {contest.problem_count !== undefined &&
          contest.problem_count !== null && (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-slate-500">
                Problems
              </dt>

              <dd className="text-sm text-slate-200">
                {Number(contest.problem_count)}
              </dd>
            </div>
          )}

        {contest.participant_count !== undefined &&
          contest.participant_count !== null && (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-slate-500">
                Registered
              </dt>

              <dd className="text-sm text-slate-200">
                {Number(contest.participant_count)}
              </dd>
            </div>
          )}
      </dl>

      <div className="mt-auto pt-6">
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs leading-6 text-slate-500">
            {status === "live" && "This contest is currently running."}

            {status === "upcoming" &&
              "This contest has not started yet."}

            {status === "ended" && "This contest has finished."}

            {status === "invalid" &&
              "The contest schedule needs to be checked."}
          </p>

          <Link
            to={`/contests/${contest.id}`}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            View Contest →
          </Link>
        </div>
      </div>
    </article>
  );
}

function Contests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();

    async function loadContests() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/contests", {
          signal: controller.signal,
        });

        if (!Array.isArray(response.data)) {
          throw new Error(
            "The server returned an unexpected contest response.",
          );
        }

        if (!controller.signal.aborted) {
          setContests(response.data);
          setNow(Date.now());
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.error ||
            err.message ||
            "Unable to load contests. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadContests();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const [refreshKey, setRefreshKey] = useState(0);

  // Refreshes are separate from the initial load.
  useEffect(() => {
    if (refreshKey === 0) return;

    const controller = new AbortController();

    async function refreshContests() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/contests", {
          signal: controller.signal,
        });

        if (!Array.isArray(response.data)) {
          throw new Error(
            "The server returned an unexpected contest response.",
          );
        }

        if (!controller.signal.aborted) {
          setContests(response.data);
          setNow(Date.now());
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.error ||
            err.message ||
            "Unable to load contests. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    refreshContests();

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  const counts = useMemo(() => {
    const result = {
      all: contests.length,
      live: 0,
      upcoming: 0,
      ended: 0,
    };

    for (const contest of contests) {
      const status = getStatus(contest, now);

      if (status !== "invalid") {
        result[status] += 1;
      }
    }

    return result;
  }, [contests, now]);

  const filteredContests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contests.filter((contest) => {
      const matchesStatus =
        statusFilter === "all" ||
        getStatus(contest, now) === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        [contest.id, contest.title, contest.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [contests, search, statusFilter, now]);

  const refreshContests = () => {
    setRefreshKey((value) => value + 1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              DPC-OJ Competitions
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Contests
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-400">
              Explore upcoming competitions, live contests, and
              completed events.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshContests}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {!loading && !error && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Contests",
                value: counts.all,
                color: "text-white",
              },
              {
                label: "Live Now",
                value: counts.live,
                color: "text-emerald-300",
              },
              {
                label: "Upcoming",
                value: counts.upcoming,
                color: "text-cyan-300",
              },
              {
                label: "Finished",
                value: counts.ended,
                color: "text-slate-300",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>

                <p
                  className={`mt-2 text-3xl font-bold ${stat.color}`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div
            role="group"
            aria-label="Filter contests by status"
            className="flex flex-wrap gap-2"
          >
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={statusFilter === filter.value}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  statusFilter === filter.value
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            aria-label="Search contests"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contests..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/10 xl:max-w-sm"
          />
        </div>

        {loading && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-6 text-sm text-cyan-100"
          >
            Loading contests from the database...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5"
          >
            <p className="text-sm text-rose-200">
              {error}
            </p>

            <button
              type="button"
              onClick={refreshContests}
              className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/20"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && contests.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center">
            <h3 className="text-lg font-semibold text-white">
              No contests available
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Public contests will appear here once they are
              created and published.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          contests.length > 0 &&
          filteredContests.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center">
              <h3 className="text-lg font-semibold text-white">
                No matching contests
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Try a different search or status filter.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                Clear filters
              </button>
            </div>
          )}

        {!loading && !error && filteredContests.length > 0 && (
          <>
            <p className="mt-5 text-sm text-slate-400">
              Showing {filteredContests.length} of{" "}
              {contests.length} contest
              {contests.length === 1 ? "" : "s"}.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredContests.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  now={now}
                />
              ))}
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Dates and times are displayed in your browser’s
              local timezone.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default Contests;