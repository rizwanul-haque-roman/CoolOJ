import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

function ProblemDetails() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("statement");
  const [code, setCode] = useState(
    `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code goes here\n\n}`,
  );
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [customInput, setCustomInput] = useState("");

  const languages = [
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
  ];

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/problems/${id}`);
        setProblem(res.data);
        if (res.data.starter_code) setCode(res.data.starter_code);
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

    const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    setSubmissionsError("");

    try {
      const res = await api.get(`/submissions/problem/${id}`);
      setSubmissions(res.data);
    } catch (err) {
      setSubmissionsError(
        err.response?.data?.error || "Failed to load submission history.",
      );
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const normalizedCode = code.toLowerCase();
      let message = "Test run completed (simulated)";

      if (normalizedCode.includes("compile_error")) {
        message = "Compilation Error (simulated)";
      } else if (
        normalizedCode.includes("time_limit") ||
        normalizedCode.includes("while(true)")
      ) {
        message = "Time Limit Exceeded (simulated)";
      } else if (normalizedCode.includes("runtime_error")) {
        message = "Runtime Error (simulated)";
      }

      const languageLabel =
        languages.find((item) => item.value === language)?.label || language;

      setOutput(
        [
          message,
          "",
          `Language: ${languageLabel}`,
          `Custom input: ${customInput || "(empty)"}`,
          "",
          "Note: Local code execution is not enabled in this demo environment.",
          "Use Submit to evaluate the solution against the problem test cases.",
        ].join("\n"),
      );
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmissionResult(null);
    setOutput("");

    try {
      const res = await api.post("/submissions", {
        problem_id: Number(id),
        language,
        code,
      });

      const result = res.data;
      setSubmissionResult(result);

      setOutput(
        [
          `Verdict: ${result.verdict}`,
          `Tests: ${result.passed_tests ?? 0}/${result.total_tests ?? 0}`,
          `Time: ${result.time_used_ms ?? 0} ms`,
          `Memory: ${result.memory_used_kb ?? 0} KB`,
          `Score: ${result.score ?? 0}`,
          "",
          `Submission ID: ${result.submission_id}`,
        ].join("\n"),
      );

      setActiveTab("submissions");
      await loadSubmissions();
    } catch (err) {
      const message =
        err.response?.data?.error || "Submission failed. Please try again.";
      setOutput(`Submission Error\n\n${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { key: "statement", label: "Statement" },
    { key: "submissions", label: "Submissions" },
    { key: "solution", label: "Solution" },
    { key: "help", label: "Help" },
  ];

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
    <div className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex w-[52%] shrink-0 flex-col border-r border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <div className="border-b border-white/10 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/problems"
                className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Back to Problems"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h2 className="truncate text-lg font-bold text-white">
                {problem.title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={getDifficultyClass(problem.difficulty)}>
                {problem.difficulty || "Unknown"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {problem.time_limit_ms} ms
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {problem.memory_limit_kb} KB
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              {problem.subject_name || "General"}
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1">
              # {problem.id}
            </span>
          </div>
        </div>

        <div className="flex gap-0 border-b border-white/10 bg-slate-900/60 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);

                if (tab.key === "submissions") {
                  loadSubmissions();
                }
              }}
              className={[
                "relative px-4 py-3 text-sm font-medium transition",
                activeTab === tab.key
                  ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-indigo-500 after:to-cyan-400"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-8 text-slate-300">
          {activeTab === "statement" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-base font-semibold text-white">
                  Problem Statement
                </h3>
                <p className="whitespace-pre-wrap leading-8 text-slate-300">
                  {problem.statement || "No statement available."}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  Input Format
                </h3>
                <p className="leading-7 text-slate-300">
                  {problem.input_format || "Not provided"}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  Output Format
                </h3>
                <p className="leading-7 text-slate-300">
                  {problem.output_format || "Not provided"}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  Constraints
                </h3>
                <ul className="space-y-1 text-slate-300">
                  {(problem.constraints || "Not provided")
                    .split("\n")
                    .filter(Boolean)
                    .map((line, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold text-white">
                  Sample 1:
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#020714]/80 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Input
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            problem.sample_input || "1 2",
                          )
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="font-mono text-sm text-sky-100">
                      {problem.sample_input || "1 2"}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#020714]/80 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Output
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            problem.sample_output || "3",
                          )
                        }
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="font-mono text-sm text-sky-100">
                      {problem.sample_output || "3"}
                    </pre>
                  </div>
                </div>

                {problem.explanation && (
                  <div className="mt-4">
                    <h4 className="mb-2 text-sm font-semibold text-white">
                      Explanation:
                    </h4>
                    <p className="text-sm leading-7 text-slate-300">
                      {problem.explanation}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-4 text-base font-semibold text-white">
                  More Info
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time limit</span>
                    <span className="font-medium text-white">
                      {problem.time_limit_ms} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Memory limit</span>
                    <span className="font-medium text-white">
                      {problem.memory_limit_kb} KB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Visibility</span>
                    <span className="font-medium text-white">
                      {problem.is_public ? "Public" : "Private"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "submissions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Submission History
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Your saved attempts for this problem.
                </p>
              </div>

              <button
                onClick={loadSubmissions}
                disabled={loadingSubmissions}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSubmissions ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {submissionsError && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {submissionsError}
              </div>
            )}

            {loadingSubmissions ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400">
                Loading submissions...
              </div>
            ) : submissions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400">
                No submissions for this problem yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#020714]/50">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Language</th>
                      <th className="px-4 py-3 font-medium">Verdict</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Memory</th>
                      <th className="px-4 py-3 font-medium">Submitted</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {submissions.map((submission) => {
                      const accepted = submission.verdict === "Accepted";

                      return (
                        <tr
                          key={submission.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-3 font-mono text-slate-300">
                            #{submission.id}
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {languages.find(
                              (item) => item.value === submission.language,
                            )?.label || submission.language}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={[
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                accepted
                                  ? "bg-emerald-400/10 text-emerald-300"
                                  : "bg-rose-400/10 text-rose-300",
                              ].join(" ")}
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
                            {submission.submitted_at
                              ? new Date(submission.submitted_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
)}

          {activeTab === "solution" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400">
              Editorial and solutions will be available after the contest ends.
            </div>
          )}

          {activeTab === "help" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Judge Notes</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  Read the statement carefully before coding.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  Follow the input and output format exactly.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  Watch the time and memory limits before submission.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                  Use standard I/O — do not use file I/O.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-[#070b17] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-slate-200 outline-none transition focus:border-indigo-400/60"
            >
              {languages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCode(
                  `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code goes here\n\n}`,
                )
              }
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Reset code"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Expand"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <textarea
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-7 text-sky-100 outline-none placeholder:text-slate-500"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck="false"
            style={{ minHeight: "300px" }}
          />
        </div>

        <div className="border-t border-white/10">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Test against Custom Input
            </span>
            <button
              onClick={() => setCustomInput("")}
              className="text-xs text-slate-500 transition hover:text-slate-300"
            >
              Clear
            </button>
          </div>
          <textarea
            className="w-full resize-none bg-transparent px-4 pb-3 font-mono text-sm leading-7 text-slate-300 outline-none placeholder:text-slate-500"
            rows={3}
            placeholder="Enter custom input here..."
            value={customInput}
            onChange={(event) => setCustomInput(event.target.value)}
            spellCheck="false"
          />
        </div>

        {output && (
          <div className="border-t border-white/10 bg-[#020714]/60">
            <div className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-indigo-300">
              Output
            </div>
            <pre className="max-h-32 overflow-y-auto px-4 pb-3 font-mono text-sm leading-7 text-sky-100">
              {output}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/80 px-4 py-3">
          <button
            onClick={handleRun}
            disabled={running || submitting}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {running ? "Running..." : "Run"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || running}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22 11 13 2 9l20-7z" />
            </svg>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProblemDetails;