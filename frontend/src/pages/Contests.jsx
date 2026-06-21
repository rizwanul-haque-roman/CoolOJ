import { useState } from "react";
import { Link } from "react-router-dom";

const PLACEHOLDER_CONTESTS = [
  {
    id: 1,
    title: "Weekly Contest #1",
    description: "Sharpen your problem solving with timed challenges.",
    start_time: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    is_public: true,
    problem_count: 4,
    participants: 128,
  },
  {
    id: 2,
    title: "DPC Batch 08 — Round 1",
    description: "Official contest for Batch 08 students.",
    start_time: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 1).toISOString(),
    is_public: false,
    problem_count: 5,
    participants: 64,
  },
  {
    id: 3,
    title: "Beginner Friendly Contest",
    description: "Easy problems to get you started with competitive programming.",
    start_time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    end_time: new Date(Date.now() - 1000 * 60 * 60 * 46).toISOString(),
    is_public: true,
    problem_count: 3,
    participants: 210,
  },
  {
    id: 4,
    title: "Advanced Algorithms Sprint",
    description: "Graphs, DP, and data structures under pressure.",
    start_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 27).toISOString(),
    is_public: true,
    problem_count: 6,
    participants: 0,
  },
  {
    id: 5,
    title: "Monthly Grand Contest",
    description: "Full 3-hour rated contest open to all.",
    start_time: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
    end_time: new Date(Date.now() - 1000 * 60 * 60 * 197).toISOString(),
    is_public: true,
    problem_count: 7,
    participants: 342,
  },
];

function getStatus(contest) {
  const now = new Date();
  const start = new Date(contest.start_time);
  const end = new Date(contest.end_time);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
}

function StatusBadge({ status }) {
  if (status === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        Live
      </span>
    );
  if (status === "upcoming")
    return (
      <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
        Upcoming
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-slate-400/20 bg-slate-400/10 px-3 py-1 text-xs font-semibold text-slate-400">
      Ended
    </span>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ContestCard({ contest }) {
  const status = getStatus(contest);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20 hover:bg-white/[0.05] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-white">{contest.title}</h3>
          <StatusBadge status={status} />
          {!contest.is_public && (
            <span className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
              Private
            </span>
          )}
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {contest.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
          <span>
            Start:{" "}
            <strong className="text-slate-200">{formatDate(contest.start_time)}</strong>
          </span>
          <span>
            End:{" "}
            <strong className="text-slate-200">{formatDate(contest.end_time)}</strong>
          </span>
          <span>
            Problems:{" "}
            <strong className="text-slate-200">{contest.problem_count}</strong>
          </span>
          <span>
            Participants:{" "}
            <strong className="text-slate-200">{contest.participants}</strong>
          </span>
        </div>
      </div>

      <div className="shrink-0 sm:text-right">
        {status === "live" && (
          <button className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20 sm:w-auto">
            Enter Contest
          </button>
        )}
        {status === "upcoming" && (
          <button className="inline-flex w-full items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-400/10 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-400/20 sm:w-auto">
            Register
          </button>
        )}
        {status === "ended" && (
          <button className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 sm:w-auto">
            View Results
          </button>
        )}
      </div>
    </div>
  );
}

function Contests() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "All" },
    { key: "live", label: "Live" },
    { key: "upcoming", label: "Upcoming" },
    { key: "ended", label: "Ended" },
  ];

  const filtered =
    activeTab === "all"
      ? PLACEHOLDER_CONTESTS
      : PLACEHOLDER_CONTESTS.filter((c) => getStatus(c) === activeTab);

  const liveCount = PLACEHOLDER_CONTESTS.filter((c) => getStatus(c) === "live").length;
  const upcomingCount = PLACEHOLDER_CONTESTS.filter((c) => getStatus(c) === "upcoming").length;
  const endedCount = PLACEHOLDER_CONTESTS.filter((c) => getStatus(c) === "ended").length;

  return (
    <div className="space-y-6">

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Live Now</p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">{liveCount}</h3>
          <p className="mt-1 text-sm text-slate-400">Currently running</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Upcoming</p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">{upcomingCount}</h3>
          <p className="mt-1 text-sm text-slate-400">Scheduled soon</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <h3 className="mt-3 text-3xl font-bold text-white">{PLACEHOLDER_CONTESTS.length}</h3>
          <p className="mt-1 text-sm text-slate-400">All contests</p>
        </div>
      </section>

      {/* Main content */}
      <section className="grid gap-6 xl:grid-cols-4">

        {/* Contest list */}
        <div className="space-y-5 xl:col-span-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Contests</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Compete, climb the leaderboard, and sharpen your skills.
                </p>
              </div>

              {/* Tab filter */}
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={[
                      "rounded-2xl border px-4 py-1.5 text-sm font-medium transition",
                      activeTab === tab.key
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                        : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400">
                  No contests in this category yet.
                </div>
              ) : (
                filtered.map((contest) => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6 xl:col-span-1">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">How It Works</h3>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                Register before the contest starts.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                Solve as many problems as you can within the time limit.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                Rank is determined by problems solved and penalty time.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                Results and editorials available after the contest ends.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Legend</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live
                </span>
                <span className="text-slate-400">Contest is running now</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                  Upcoming
                </span>
                <span className="text-slate-400">Scheduled in future</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                  Ended
                </span>
                <span className="text-slate-400">Past the end time</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contests;