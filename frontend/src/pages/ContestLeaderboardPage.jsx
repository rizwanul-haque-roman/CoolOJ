import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import usePublicContest, { getPublicContestStatus as getContestStatus } from "../hooks/usePublicContest";
import ContestNotices from "../components/ContestNotices";
import ContestLeaderboard from "./ContestLeaderboard";


const STATUS_LABELS = {
  upcoming: "Upcoming",
  live: "Live",
  ended: "Finished",
  invalid: "Schedule unavailable",
};

function getStatusStyle(status) {
  if (status === "live") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "upcoming") {
    return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
  }

  if (status === "ended") {
    return "border-slate-400/20 bg-slate-400/10 text-slate-300";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function ContestLeaderboardPage() {
  const { id } = useParams();

  const [refreshKey, setRefreshKey] = useState(0);
  const { contest, loading, error, notFound, warning, now } = usePublicContest(id, refreshKey);

  const validId =
    typeof id === "string" &&
    /^[1-9]\d*$/.test(id) &&
    Number.isSafeInteger(Number(id));





  const status = contest
    ? getContestStatus(contest, now)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={validId ? `/contests/${id}` : "/contests"}
          className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          {validId ? "← Back to contest" : "← All contests"}
        </Link>

        <Link
          to="/contests"
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          All contests
        </Link>
      </div>

      {loading && (
        <div
          role="status"
          className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-10 text-center text-sm text-cyan-100"
        >
          Loading leaderboard page...
        </div>
      )}

      {!loading && error && (
        <section
          role="alert"
          className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6"
        >
          <h2 className="text-xl font-bold text-white">
            Leaderboard unavailable
          </h2>

          <p className="mt-3 text-sm text-rose-200">
            {error}
          </p>

          {validId && (
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
          <ContestNotices contest={contest} warning={warning} />
          <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                DPC-OJ Contest #{contest.id}
              </p>

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
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

            <h2 className="mt-3 break-words text-2xl font-bold text-white sm:text-3xl">
              {contest.title || "Untitled contest"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Contest standings. Keep this page open alongside
              your problem workspace to follow the results.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/contests/${contest.id}`}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Contest overview
              </Link>

              <Link
                to={`/contests/${contest.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Open contest in new tab ↗
              </Link>
            </div>
          </section>

          <ContestLeaderboard
            key={contest.id}
            contestId={contest.id}
            problems={contest.problems}
            status={status}
            refreshKey={refreshKey}
          />
        </>
      )}
    </div>
  );
}

export default ContestLeaderboardPage;