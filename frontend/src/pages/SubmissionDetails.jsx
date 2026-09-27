import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  return "border-rose-400/20 bg-rose-400/10 text-rose-300";
}

function SubmissionDetails() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/submissions/${submissionId}`);
        setSubmission(res.data);
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load submission details.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6 text-sm text-cyan-200">
        Loading submission...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-6">
        <p className="text-sm text-rose-200">{error}</p>
        <Link
          to="/submissions"
          className="mt-4 inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
        >
          Back to Submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/submissions"
            className="text-sm text-cyan-300 transition hover:text-cyan-200"
          >
            ← Back to Submissions
          </Link>

          <h2 className="mt-4 text-2xl font-bold text-white">
            Submission #{submission.id}
          </h2>

          <Link
            to={`/problems/${submission.problem_id}`}
            className="mt-1 inline-block text-sm text-slate-400 transition hover:text-cyan-300"
          >
            {submission.problem_title}
          </Link>
        </div>

        <span
          className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-semibold ${getVerdictClass(
            submission.verdict,
          )}`}
        >
          {submission.verdict || "Pending"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Language
          </p>
          <p className="mt-2 font-semibold text-white">
            {LANGUAGE_LABELS[submission.language] || submission.language}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Score
          </p>
          <p className="mt-2 font-semibold text-white">
            {submission.score ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Time
          </p>
          <p className="mt-2 font-semibold text-white">
            {submission.time_used_ms ?? 0} ms
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Memory
          </p>
          <p className="mt-2 font-semibold text-white">
            {submission.memory_used_kb ?? 0} KB
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Submitted
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {submission.submitted_at
              ? new Date(submission.submitted_at).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      {submission.user_name && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Submitted by
          </p>
          <p className="mt-2 font-semibold text-white">
            {submission.user_name}
          </p>
          {submission.user_email && (
            <p className="mt-1 text-sm text-slate-400">
              {submission.user_email}
            </p>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="font-semibold text-white">Submitted Source Code</h3>
          <p className="mt-1 text-sm text-slate-400">
            Read-only view of the code submitted for this attempt.
          </p>
        </div>

        <pre className="max-h-[650px] overflow-auto p-6 font-mono text-sm leading-7 text-sky-100">
          {submission.code}
        </pre>
      </section>
    </div>
  );
}

export default SubmissionDetails;