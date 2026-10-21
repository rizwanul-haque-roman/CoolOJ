import { useEffect, useState } from "react";
import api from "../api/axios";

function ProblemResult({ result }) {
  const solved = result?.solved === true;
  const wrongAttempts = Number(result?.wrong_attempts || 0);

  if (solved) {
    const elapsed = Number(result.elapsed_minutes || 0);
    const addedPenalty = Number(result.penalty_minutes || 0);

    return (
      <div
        title={`Solved at minute ${elapsed}. ${wrongAttempts} penalized attempt(s). ${addedPenalty} added penalty minutes.`}
        className="mx-auto flex min-h-[68px] w-[88px] flex-col items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/[0.12] px-2 py-2 text-emerald-200"
      >
        <span className="font-mono text-lg font-bold">
          {wrongAttempts > 0 ? `+${wrongAttempts}` : "+"}
        </span>

        <span className="mt-1 font-mono text-xs text-emerald-300/80">
          {elapsed} min
        </span>

        <span className="sr-only">
          Solved after {wrongAttempts} penalized attempts
        </span>
      </div>
    );
  }

  if (wrongAttempts > 0) {
    return (
      <div
        title={`${wrongAttempts} penalized attempt(s). Not solved. No time added to the total yet.`}
        className="mx-auto flex min-h-[68px] w-[88px] flex-col items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[0.10] px-2 py-2 text-rose-200"
      >
        <span className="font-mono text-lg font-bold">
          -{wrongAttempts}
        </span>

        <span className="mt-1 text-[10px] text-rose-300/80">
          Unsolved
        </span>
      </div>
    );
  }

  return (
    <div
      title="No solved result or penalized attempts recorded."
      className="mx-auto flex min-h-[68px] w-[88px] items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] font-mono text-lg text-slate-600"
    >
      —
    </div>
  );
}

function ContestLeaderboard({
  contestId,
  problems = [],
  status,
  refreshKey = 0,
}) {
  const [rows, setRows] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer;

    async function loadLeaderboard() {
      setFetching(true);

      try {
        const response = await api.get(
          `/contests/${contestId}/leaderboard`,
          { signal: controller.signal },
        );

        if (
          !Array.isArray(response.data) ||
          response.data.some(
            (row) =>
              !row ||
              typeof row !== "object" ||
              !Array.isArray(row.problems),
          )
        ) {
          throw new Error(
            "The server returned an unexpected leaderboard response.",
          );
        }

        if (controller.signal.aborted) return;

        // Preserve the backend's order and shared ranks.
        setRows(response.data);
        setUpdatedAt(new Date());
        setError("");
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.error ||
            err.message ||
            "Unable to load the leaderboard.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setFetching(false);

          // Schedule after completion to avoid overlapping requests.
          if (status === "live") {
            timer = window.setTimeout(loadLeaderboard, 30000);
          }
        }
      }
    }

    loadLeaderboard();

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [contestId, status, refreshKey, reloadKey]);

  const standings = rows || [];
  const initialLoading = rows === null && !error;

  const totalSolves = standings.reduce(
    (sum, row) => sum + Number(row.solved || 0),
    0,
  );

  const problemSummaries = problems.map((problem) => {
    let solved = 0;
    let wrongAttempts = 0;

    for (const row of standings) {
      const result = row.problems.find(
        (item) =>
          Number(item.problem_id) === Number(problem.id),
      );

      if (result?.solved) solved += 1;

      wrongAttempts += Number(result?.wrong_attempts || 0);
    }

    return {
      problemId: Number(problem.id),
      solved,
      wrongAttempts,
    };
  });

  const headerClass =
    "px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400";

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
      <div className="border-b border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              DPC-OJ Standings
            </p>

            <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
              Contest Leaderboard
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Most problems solved, then lowest total time.
              Each penalized attempt adds 20 minutes when
              that problem is solved.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={fetching}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              className={fetching ? "animate-spin" : ""}
            >
              ↻
            </span>

            {fetching ? "Updating..." : "Refresh standings"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-300">
            {standings.length} participants
          </span>

          <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-300">
            {problems.length} problems
          </span>

          <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-emerald-200">
            {totalSolves} solves
          </span>

          <span className="inline-flex items-center gap-2 text-slate-400">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                status === "live"
                  ? "animate-pulse bg-emerald-300"
                  : "bg-slate-500"
              }`}
            />

            {status === "live"
              ? "Auto-refresh every 30 seconds"
              : status === "ended"
                ? "Contest finished"
                : status === "upcoming"
                  ? "Contest not started"
                  : "Schedule unavailable"}
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="m-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          <p>{error}</p>

          {rows !== null && (
            <p className="mt-1 text-xs text-rose-200/70">
              Showing the last successfully loaded standings.
            </p>
          )}
        </div>
      )}

      {initialLoading ? (
        <div
          role="status"
          className="px-6 py-16 text-center text-sm text-cyan-200"
        >
          Loading contest standings...
        </div>
      ) : rows !== null && standings.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-200">
            No participants yet
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Registered students will appear here, even before
            solving a problem.
          </p>
        </div>
      ) : standings.length > 0 ? (
        <div className="max-h-[650px] overflow-auto">
          <table className="w-full min-w-[800px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Contest standings. Problem cells show solved
              status, penalized attempts, and elapsed solve
              minutes. Total time includes penalties.
            </caption>

            <thead>
              <tr>
                <th
                  scope="col"
                  className={`sticky top-0 z-20 border-b border-white/10 bg-slate-950 ${headerClass}`}
                >
                  Rank
                </th>

                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 min-w-[180px] border-b border-r border-white/10 bg-slate-950 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Contestant
                </th>

                <th
                  scope="col"
                  className={`sticky top-0 z-20 border-b border-white/10 bg-slate-950 ${headerClass}`}
                >
                  Solved
                </th>

                <th
                  scope="col"
                  className={`sticky top-0 z-20 whitespace-nowrap border-b border-white/10 bg-slate-950 ${headerClass}`}
                >
                  Total Time
                </th>

                <th
                  scope="col"
                  className={`sticky top-0 z-20 border-b border-white/10 bg-slate-950 ${headerClass}`}
                >
                  Score
                </th>

                {problems.map((problem) => (
                  <th
                    key={problem.id}
                    scope="col"
                    title={problem.title}
                    className="sticky top-0 z-20 min-w-[112px] border-b border-l border-white/10 bg-slate-950 px-3 py-3 text-center"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 font-mono text-sm font-bold text-cyan-200">
                      {problem.serial_letter || "?"}
                    </span>

                    <span className="mx-auto mt-1 block max-w-[104px] truncate text-[10px] font-normal text-slate-500">
                      {problem.title}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {standings.map((row) => {
                const resultMap = new Map(
                  row.problems.map((result) => [
                    Number(result.problem_id),
                    result,
                  ]),
                );

                return (
                  <tr
                    key={row.user_id}
                    className="group transition hover:bg-cyan-400/[0.03]"
                  >
                    <td className="border-b border-white/[0.06] px-4 py-4 text-center">
                      <span
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 font-mono font-bold ${
                          Number(row.rank) === 1
                            ? "border border-amber-300/25 bg-amber-300/10 text-amber-200"
                            : "text-slate-300"
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>

                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-white/[0.06] bg-slate-900 px-4 py-4 text-left transition group-hover:bg-slate-800"
                    >
                      <span className="block max-w-[240px] break-words font-semibold text-slate-100">
                        {row.name}
                      </span>

                      <span className="mt-1 block text-[10px] font-normal uppercase tracking-wide text-slate-500">
                        Student
                      </span>
                    </th>

                    <td className="border-b border-white/[0.06] px-4 py-4 text-center font-mono text-xl font-bold text-emerald-300">
                      {row.solved}
                    </td>

                    <td className="whitespace-nowrap border-b border-white/[0.06] px-4 py-4 text-center">
                      <span className="font-mono text-base font-bold text-white">
                        {row.total_time_minutes}
                      </span>

                      <span className="ml-1 text-[10px] text-slate-500">
                        min
                      </span>

                      <span className="mt-1 block text-[10px] text-slate-500">
                        {Number(row.total_penalty_minutes) > 0
                          ? `Includes +${row.total_penalty_minutes} penalty`
                          : "No added penalty"}
                      </span>
                    </td>

                    <td className="border-b border-white/[0.06] px-4 py-4 text-center font-mono font-semibold text-cyan-200">
                      {row.total_score}
                    </td>

                    {problems.map((problem) => (
                      <td
                        key={problem.id}
                        className="border-b border-l border-white/[0.06] px-3 py-3 text-center"
                      >
                        <ProblemResult
                          result={resultMap.get(
                            Number(problem.id),
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="bg-slate-950/60">
                <th
                  scope="row"
                  colSpan={5}
                  className="border-t border-white/10 px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Problem summary
                </th>

                {problemSummaries.map((summary) => (
                  <td
                    key={summary.problemId}
                    className="border-l border-t border-white/10 px-3 py-4 text-center"
                  >
                    <span className="block font-mono text-xs font-semibold text-emerald-300">
                      {summary.solved} solved
                    </span>

                    <span className="mt-1 block text-[10px] text-slate-500">
                      {summary.wrongAttempts} penalized attempts
                    </span>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-white/10 bg-slate-950/30 p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-emerald-400/30 bg-emerald-400/20" />
            + / +n: solved / solved after n penalized attempts
          </span>

          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-rose-400/30 bg-rose-400/20" />
            -n: n penalized attempts, not solved
          </span>

          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded border border-white/10 bg-white/[0.03]" />
            —: no solve or penalized attempts
          </span>
        </div>

        <p className="text-[11px] leading-5 text-slate-500">
          Cell times are elapsed minutes from contest start.
          Total time sums elapsed solve minutes and penalties
          for solved problems only. Compilation errors and
          internal errors do not add penalties. Standings may
          change while submissions are being judged.
        </p>

        <p
          role="status"
          className="text-[11px] text-slate-500"
        >
          {updatedAt
            ? `Last updated ${updatedAt.toLocaleTimeString()}`
            : "No standings loaded yet"}
        </p>
      </div>
    </section>
  );
}

export default ContestLeaderboard;