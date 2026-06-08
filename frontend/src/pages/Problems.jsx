import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Problems() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/problems");
        setProblems(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load problems");
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const title = (problem.title || "").toLowerCase();
      const difficulty = (problem.difficulty || "").toLowerCase();
      const query = search.toLowerCase();

      return title.includes(query) || difficulty.includes(query);
    });
  }, [problems, search]);

  const totalProblems = problems.length;
  const easyCount = problems.filter(
    (problem) => (problem.difficulty || "").toLowerCase() === "easy"
  ).length;
  const mediumCount = problems.filter(
    (problem) => (problem.difficulty || "").toLowerCase() === "medium"
  ).length;
  const hardCount = problems.filter(
    (problem) => (problem.difficulty || "").toLowerCase() === "hard"
  ).length;

  const getDifficultyClass = (difficulty) => {
    const value = (difficulty || "").toLowerCase();

    if (value === "easy") {
      return "inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200";
    }
    if (value === "medium") {
      return "inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200";
    }
    if (value === "hard") {
      return "inline-flex items-center rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-200";
    }

    return "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300";
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total Problems
          </p>
          <h3 className="mt-3 text-3xl font-bold text-white">{totalProblems}</h3>
          <p className="mt-2 text-sm text-slate-400">
            All available coding challenges
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Easy Track
          </p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">{easyCount}</h3>
          <p className="mt-2 text-sm text-slate-400">
            Warm-up and beginner-friendly tasks
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Medium Track
          </p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">{mediumCount}</h3>
          <p className="mt-2 text-sm text-slate-400">
            Core problem-solving practice
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Hard Track
          </p>
          <h3 className="mt-3 text-3xl font-bold text-rose-300">{hardCount}</h3>
          <p className="mt-2 text-sm text-slate-400">
            Advanced challenge mode
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl sm:p-6 xl:col-span-3">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Problem Archive
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Search, explore, and enter any challenge from the archive.
              </p>
            </div>

            <input
              type="text"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 lg:max-w-sm"
              placeholder="Search by title or difficulty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading && (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200">
              Loading problems...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && filteredProblems.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
              No problems matched your search.
            </div>
          )}

          {!loading && !error && filteredProblems.length > 0 && (
            <div className="space-y-4">
              {filteredProblems.map((problem) => (
                <div
                  key={problem.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-white">
                        {problem.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Problem ID: {problem.id}
                      </p>
                    </div>

                    <span className={getDifficultyClass(problem.difficulty)}>
                      {problem.difficulty || "Unknown"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Solve this problem, test your logic, and push your solution
                    through the judge.
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-400">
                      Ready for coding and submission workflow
                    </p>

                    <Link
                      to={`/problems/${problem.id}`}
                      className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20"
                    >
                      Open Problem
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 xl:col-span-1">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Archive Status</h3>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-slate-400">Total visible</span>
                <strong className="text-base text-white">{filteredProblems.length}</strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-slate-400">Search query</span>
                <strong className="max-w-[140px] truncate text-right text-sm text-white">
                  {search ? search : "None"}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-slate-400">System mode</span>
                <strong className="text-emerald-300">Online</strong>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Difficulty Guide</h3>

            <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              <li>
                <strong className="text-emerald-300">Easy:</strong> basic implementation
                and warm-up level.
              </li>
              <li>
                <strong className="text-amber-300">Medium:</strong> stronger logic,
                patterns, and careful handling.
              </li>
              <li>
                <strong className="text-rose-300">Hard:</strong> advanced reasoning
                and tighter constraints.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Quick Tip</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Start with easier tasks, get your submission flow working, then move
              toward medium and hard problems once the judge integration is fully
              stable.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Problems;