import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

const DEFAULT_CODE = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // your code goes here

    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    // your code goes here

    return 0;
}`,
  python: `def main():
    # your code goes here
    pass


if __name__ == "__main__":
    main()
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // your code goes here
    }
}`,
};

const LANGUAGE_OPTIONS = [
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

function ProblemDetails() {
  const { id } = useParams();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("statement");
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(DEFAULT_CODE.cpp);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/problems/${id}`);

        setProblem(res.data);

        if (res.data.starter_code?.trim()) {
          setCode(res.data.starter_code);
        } else {
          setCode(DEFAULT_CODE.cpp);
        }
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load problem details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

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

  const selectLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);

    if (!code.trim() || Object.values(DEFAULT_CODE).includes(code)) {
      setCode(DEFAULT_CODE[nextLanguage]);
    }
  };

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;

    setLanguage(nextLanguage);

    if (!code.trim() || Object.values(DEFAULT_CODE).includes(code)) {
      setCode(DEFAULT_CODE[nextLanguage]);
    }
  };

  const handleResetCode = () => {
    setCode(DEFAULT_CODE[language]);
    setOutput("");
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput("");

    try {
      const res = await api.post("/submissions/run", {
        language,
        code,
        input: customInput,
      });

      const result = res.data;

      setOutput(
        [
          `Verdict: ${result.verdict || "Unknown"}`,
          result.output ? `Output:\n${result.output}` : "Output:\n(no output)",
          result.error ? `Error:\n${result.error}` : "",
          `Time: ${result.time_used_ms ?? 0} ms`,
          `Memory: ${result.memory_used_kb ?? 0} KB`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    } catch (err) {
      setOutput(
        `Run Error\n\n${
          err.response?.data?.error || "Unable to run this code."
        }`,
      );
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setOutput("");

    try {
      const res = await api.post("/submissions", {
        problem_id: Number(id),
        language,
        code,
      });

      const result = res.data;

      setOutput(
        [
          `Verdict: ${result.verdict || "Unknown"}`,
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
      setOutput(
        `Submission Error\n\n${
          err.response?.data?.error || "Unable to submit this solution."
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(value || "");
    } catch {
      // Clipboard access can be unavailable in some browsers.
    }
  };

  const getDifficultyClass = (difficulty) => {
    const value = (difficulty || "").toLowerCase();

    if (value === "easy") {
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    }

    if (value === "medium") {
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    }

    if (value === "hard") {
      return "border-rose-400/20 bg-rose-400/10 text-rose-300";
    }

    return "border-white/10 bg-white/5 text-slate-300";
  };

  const getVerdictClass = (verdict) => {
    if (verdict === "Accepted") {
      return "text-emerald-300";
    }

    if (verdict === "Pending") {
      return "text-amber-300";
    }

    return "text-rose-300";
  };

  const switchTab = (tab) => {
    setActiveTab(tab);

    if (tab === "submissions") {
      loadSubmissions();
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-200">
        Loading problem details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-200">
        Problem not found.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[620px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-2xl backdrop-blur-xl">
      {/* Shared workspace header */}
      <div className="shrink-0 border-b border-white/10 bg-slate-900/70 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/problems"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="Back to problems"
            >
              ←
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="truncate text-base font-bold text-white">
                  {problem.title}
                </h2>

                <span
                  className={`hidden rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${getDifficultyClass(
                    problem.difficulty,
                  )}`}
                >
                  {problem.difficulty || "Unknown"}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
                  #{problem.id}
                </span>

                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
                  {problem.time_limit_ms} ms
                </span>

                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
                  {problem.memory_limit_kb} KB
                </span>

                <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
                  {problem.subject_name || "General"}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
            <span>Problem workspace</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Left statement and right editor */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[52%_48%]">
        {/* LEFT COLUMN */}
        <section className="flex min-h-0 flex-col border-b border-white/10 bg-slate-900/35 lg:border-b-0 lg:border-r">
          {/* Exact 44px top toolbar row */}
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-white/10 bg-slate-900/55 px-3">
            {[
              { key: "statement", label: "Statement" },
              { key: "submissions", label: "Submissions" },
              { key: "solution", label: "Solution" },
              { key: "help", label: "Help" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => switchTab(tab.key)}
                className={[
                  "relative h-full px-4 text-xs font-medium transition",
                  activeTab === tab.key
                    ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-400 after:to-cyan-400"
                    : "text-slate-500 hover:text-slate-200",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {activeTab === "statement" && (
              <article className="space-y-7 text-sm leading-7 text-slate-300">
                <section>
                  <h3 className="mb-3 text-base font-semibold text-white">
                    Problem Statement
                  </h3>

                  <p className="whitespace-pre-wrap">
                    {problem.statement || "No statement available."}
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 text-base font-semibold text-white">
                    Input Format
                  </h3>

                  <p className="whitespace-pre-wrap text-slate-400">
                    {problem.input_format || "Not provided"}
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 text-base font-semibold text-white">
                    Output Format
                  </h3>

                  <p className="whitespace-pre-wrap text-slate-400">
                    {problem.output_format || "Not provided"}
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 text-base font-semibold text-white">
                    Constraints
                  </h3>

                  <ul className="space-y-1 text-slate-400">
                    {(problem.constraints || "Not provided")
                      .split("\n")
                      .filter(Boolean)
                      .map((line, index) => (
                        <li
                          key={`${line}-${index}`}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span>{line}</span>
                        </li>
                      ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-3 text-base font-semibold text-white">
                    Sample 1
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Input
                        </span>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(problem.sample_input)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          Copy
                        </button>
                      </div>

                      <pre className="min-h-20 whitespace-pre-wrap px-3 py-3 font-mono text-xs leading-6 text-sky-100">
                        {problem.sample_input || "No sample input"}
                      </pre>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Output
                        </span>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(problem.sample_output)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          Copy
                        </button>
                      </div>

                      <pre className="min-h-20 whitespace-pre-wrap px-3 py-3 font-mono text-xs leading-6 text-sky-100">
                        {problem.sample_output || "No sample output"}
                      </pre>
                    </div>
                  </div>
                </section>

                {problem.explanation && (
                  <section>
                    <h3 className="mb-2 text-base font-semibold text-white">
                      Explanation
                    </h3>

                    <p className="whitespace-pre-wrap text-slate-400">
                      {problem.explanation}
                    </p>
                  </section>
                )}

                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="mb-4 text-sm font-semibold text-white">
                    More Info
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Time limit</span>
                      <span className="text-slate-200">
                        {problem.time_limit_ms} ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Memory limit</span>
                      <span className="text-slate-200">
                        {problem.memory_limit_kb} KB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Visibility</span>
                      <span className="text-slate-200">
                        {problem.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                </section>
              </article>
            )}

            {activeTab === "submissions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Submission History
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Your saved attempts for this problem.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadSubmissions}
                    disabled={loadingSubmissions}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingSubmissions ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {submissionsError && (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
                    {submissionsError}
                  </div>
                )}

                {loadingSubmissions ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-slate-500">
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-slate-500">
                    No submissions for this problem yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="border-b border-white/10 bg-white/[0.03] text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-medium">ID</th>
                          <th className="px-3 py-3 font-medium">Language</th>
                          <th className="px-3 py-3 font-medium">Verdict</th>
                          <th className="px-3 py-3 font-medium">Time</th>
                          <th className="px-3 py-3 font-medium">Memory</th>
                          <th className="px-3 py-3 font-medium">Submitted</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/10">
                        {submissions.map((submission) => (
                          <tr
                            key={submission.id}
                            className="transition hover:bg-white/[0.03]"
                          >
                            <td className="px-3 py-3 font-mono text-slate-300">
                              #{submission.id}
                            </td>

                            <td className="px-3 py-3 text-slate-300">
                              {LANGUAGE_OPTIONS.find(
                                (item) => item.value === submission.language,
                              )?.label || submission.language}
                            </td>

                            <td
                              className={`px-3 py-3 font-medium ${getVerdictClass(
                                submission.verdict,
                              )}`}
                            >
                              {submission.verdict || "Pending"}
                            </td>

                            <td className="px-3 py-3 text-slate-400">
                              {submission.time_used_ms ?? 0} ms
                            </td>

                            <td className="px-3 py-3 text-slate-400">
                              {submission.memory_used_kb ?? 0} KB
                            </td>

                            <td className="px-3 py-3 text-slate-500">
                              {submission.submitted_at
                                ? new Date(
                                    submission.submitted_at,
                                  ).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "solution" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
                Editorial and solutions will be available after the contest
                ends.
              </div>
            )}

            {activeTab === "help" && (
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-300">
                <h3 className="font-semibold text-white">Judge Notes</h3>
                <p>Read the statement and constraints carefully.</p>
                <p>Use standard input and output.</p>
                <p>Do not use file input or file output.</p>
                <p>Check integer limits before choosing data types.</p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <section className="flex min-h-0 flex-col bg-[#080d1d]">
          {/* Exact matching 44px toolbar row */}
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/75 px-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageMenuOpen((isOpen) => !isOpen)}
                className="flex min-w-[118px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg transition hover:border-indigo-400/60 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <span>
                  {LANGUAGE_OPTIONS.find((item) => item.value === language)
                    ?.label || "Select language"}
                </span>

                <svg
                  className={[
                    "h-3.5 w-3.5 text-slate-400 transition-transform",
                    languageMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {languageMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close language menu"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setLanguageMenuOpen(false)}
                  />

                  <div className="absolute left-0 top-full z-40 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl ring-1 ring-black/30">
                    {LANGUAGE_OPTIONS.map((item) => {
                      const isSelected = item.value === language;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => selectLanguage(item.value)}
                          className={[
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition",
                            isSelected
                              ? "bg-indigo-500/20 text-indigo-200"
                              : "text-slate-300 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          <span>{item.label}</span>

                          {isSelected && (
                            <svg
                              className="h-3.5 w-3.5 text-cyan-300"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.35a1 1 0 0 1-1.42.006L3.29 9.44a1 1 0 0 1 1.42-1.41l4.04 4.07 6.54-6.625a1 1 0 0 1 1.414-.185Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCode}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Reset code"
              >
                ↻
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(code)}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Copy code"
              >
                ⧉
              </button>

              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Editor settings"
              >
                ⚙
              </button>
            </div>
          </div>

          {/* Editor begins exactly parallel to statement body */}
          <div className="min-h-[260px] flex-1 overflow-hidden">
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck="false"
              className="h-full min-h-[260px] w-full resize-none bg-[#080d1d] px-4 py-4 font-mono text-sm leading-7 text-sky-100 outline-none placeholder:text-slate-600"
              aria-label="Code editor"
            />
          </div>

          <div className="shrink-0 border-t border-white/10 bg-slate-900/75">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Test against Custom Input
              </span>

              <button
                type="button"
                onClick={() => setCustomInput("")}
                className="text-[11px] text-slate-500 transition hover:text-slate-200"
              >
                Clear
              </button>
            </div>

            <textarea
              value={customInput}
              onChange={(event) => setCustomInput(event.target.value)}
              rows={4}
              spellCheck="false"
              placeholder="Enter custom input here..."
              className="w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-600"
              aria-label="Custom input"
            />
          </div>

          {output && (
            <div className="max-h-44 shrink-0 overflow-y-auto border-t border-white/10 bg-slate-950/80 px-4 py-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
                Output
              </div>

              <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-200">
                {output}
              </pre>
            </div>
          )}

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-white/10 bg-slate-900/80 px-4">
            <button
              type="button"
              onClick={handleRun}
              disabled={running || submitting}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>▶</span>
              {running ? "Running..." : "Run"}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || running}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-2 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>➤</span>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProblemDetails;
