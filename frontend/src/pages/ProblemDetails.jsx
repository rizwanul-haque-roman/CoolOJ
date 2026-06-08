import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

function ProblemDetails() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/problems/${id}`);
        setProblem(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load problem details");
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

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

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200 shadow-lg backdrop-blur-xl">
        Loading problem details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200 shadow-lg backdrop-blur-xl">
        {error}
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200 shadow-lg backdrop-blur-xl">
        Problem not found.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      <div className="space-y-6 xl:col-span-3">
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {problem.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Solve the challenge carefully, follow the format, and prepare
                your solution for the judge pipeline.
              </p>
            </div>

            <span className={getDifficultyClass(problem.difficulty)}>
              {problem.difficulty || "Unknown"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Problem ID
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{problem.id}</h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Time Limit
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {problem.time_limit_ms} ms
              </h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Memory Limit
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {problem.memory_limit_kb} KB
              </h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Subject
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {problem.subject_name || "General"}
              </h3>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="text-xl font-semibold text-white">Statement</h3>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-slate-300">
            {problem.statement || "No statement available."}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="text-xl font-semibold text-white">Input & Output</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium text-slate-400">Input Format</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {problem.input_format || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium text-slate-400">Output Format</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {problem.output_format || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium text-slate-400">Constraints</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {problem.constraints || "Not provided"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="text-xl font-semibold text-white">Sample Walkthrough</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Sample Input
              </h4>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#020714]/90 p-4 font-mono text-sm leading-7 text-sky-100">
1 2
              </pre>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Sample Output
              </h4>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#020714]/90 p-4 font-mono text-sm leading-7 text-sky-100">
3
              </pre>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6 xl:col-span-1">
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Actions</h3>
          <div className="mt-5 space-y-3">
            <button className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20">
              Open Editor
            </button>

            <button className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Submit Solution
            </button>

            <Link
              to="/problems"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Back to Problems
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Judge Notes</h3>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <li>Read the statement carefully before coding.</li>
            <li>Follow the input and output format exactly.</li>
            <li>Watch the time and memory limits before submission.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Status</h3>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-slate-400">Visibility</span>
              <strong className="text-sm text-white">
                {problem.is_public ? "Public" : "Private"}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-slate-400">Difficulty</span>
              <strong className="text-sm text-white">
                {problem.difficulty || "Unknown"}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-sm text-slate-400">Route Param</span>
              <strong className="text-sm text-white">{id}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProblemDetails;