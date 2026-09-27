import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const LANGUAGE_LABELS = {
  cpp: "C++",
  c: "C",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
};

function getVerdictClass(verdict) {
  if (verdict === "Accepted") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (verdict === "Pending" || verdict === "In Queue") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  if (verdict === "No Test Cases") {
    return "border-slate-400/20 bg-slate-400/10 text-slate-300";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-300";
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/submissions");
      setSubmissions(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to load submission history.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Submission History
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            View your previous attempts across all problems.
          </p>
        </div>

        <button
          onClick={loadSubmissions}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
          Loading your submissions...
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-slate-300">No submissions yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Open a problem and submit a solution to see it here.
          </p>

          <Link
            to="/problems"
            className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20"
          >
            Browse Problems
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#020714]/50">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Problem</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Verdict</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Memory</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {submissions.map((submission) => (
                <tr
                  key={submission.id}
                  className="transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-mono text-slate-300">
                    #{submission.id}
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      to={`/problems/${submission.problem_id}`}
                      className="font-medium text-cyan-300 transition hover:text-cyan-200"
                    >
                      {submission.problem_title || "Untitled Problem"}
                    </Link>
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {LANGUAGE_LABELS[submission.language] ||
                      submission.language}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVerdictClass(
                        submission.verdict,
                      )}`}
                    >
                      {submission.verdict || "Pending"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {submission.time_used_ms ?? 0} ms
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {submission.memory_used_kb ?? 0} KB
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {formatDate(submission.submitted_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      )}
    </div>
  );
}

export default Submissions;