import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios";

const DEFAULT_CODE = {
  c: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  python: `print("Hello, World!")`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
};

const LANGUAGE_OPTIONS = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
];

function LearnTopic() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject") || "1";

  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [error, setError] = useState("");

  const [language, setLanguage] = useState("c");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE.c);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const editorEnabled =
    Number(topic?.editor_enabled) === 1 ||
    topic?.editor_enabled === true;

  const runEnabled =
    Number(topic?.run_enabled) === 1 ||
    topic?.run_enabled === true;

  useEffect(() => {
    const fetchSidebarTopics = async () => {
      try {
        setSidebarLoading(true);

        const res = await api.get(
          `/learn/subjects/${subjectId}/topics`,
        );

        setTopics(res.data);
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load topic list.",
        );
      } finally {
        setSidebarLoading(false);
      }
    };

    fetchSidebarTopics();
  }, [subjectId]);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/learn/topics/${topicId}`);

        setTopic(res.data);

        const nextLanguage =
          DEFAULT_CODE[res.data.default_language]
            ? res.data.default_language
            : "c";

        setLanguage(nextLanguage);

        setCode(
          res.data.starter_code?.trim() ||
            DEFAULT_CODE[nextLanguage] ||
            "",
        );

        setOutput("");
        setCustomInput("");
        setCompleted(false);
        setLanguageMenuOpen(false);
      } catch (err) {
        setError(
          err.response?.data?.error || "Failed to load topic details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [topicId]);

  const currentIndex = useMemo(
    () =>
      topics.findIndex(
        (item) => String(item.id) === String(topicId),
      ),
    [topics, topicId],
  );

  const previousTopic =
    currentIndex > 0 ? topics[currentIndex - 1] : null;

  const nextTopic =
    currentIndex >= 0 && currentIndex < topics.length - 1
      ? topics[currentIndex + 1]
      : null;

  const selectLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);

    const currentIsDefault = Object.values(DEFAULT_CODE).includes(code);

    if (!code.trim() || currentIsDefault) {
      setCode(DEFAULT_CODE[nextLanguage]);
    }
  };

  const handleResetCode = () => {
    setCode(DEFAULT_CODE[language] || "");
    setOutput("");
  };

  const handleRun = async () => {
    if (!editorEnabled || !runEnabled) {
      setOutput(
        topic?.editor_message ||
          "Code execution is not available for this subject.",
      );
      return;
    }

    if (!code.trim()) {
      setOutput("Run Error\n\nCode cannot be empty.");
      return;
    }

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
          result.output
            ? `Output:\n${result.output}`
            : "Output:\n(no output)",
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
          err.response?.data?.error ||
          "Unable to execute this code."
        }`,
      );
    } finally {
      setRunning(false);
    }
  };

  const handleMarkComplete = () => {
    setCompleted(true);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API may be unavailable in some browsers.
    }
  };

  const renderLesson = (content) => {
    if (!content) {
      return "No lesson content available.";
    }

    return content
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/`([^`]+)`/gim, "<code>$1</code>")
      .replace(/\n/g, "<br />");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200">
        Loading topic...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200">
        Topic not found.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[640px] gap-5 overflow-hidden">
      {/* Topic sidebar */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
        <div className="shrink-0 border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Topic Flow
            </h3>

            <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold text-indigo-200">
              {topics.length} topics
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Complete lessons in order and practice as you go.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {sidebarLoading ? (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200">
              Loading topics...
            </div>
          ) : topics.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
              No topics available.
            </div>
          ) : (
            <div className="grid gap-3">
              {topics.map((item, index) => {
                const isActive =
                  String(item.id) === String(topicId);

                return (
                  <Link
                    key={item.id}
                    to={`/learn/topic/${item.id}?subject=${subjectId}`}
                    className={[
                      "flex items-start gap-3 rounded-2xl border p-3 transition",
                      isActive
                        ? "border-cyan-400/40 bg-cyan-400/10 shadow-lg shadow-cyan-500/5"
                        : "border-white/10 bg-white/[0.035] hover:border-indigo-400/30 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        isActive
                          ? "bg-cyan-400/20 text-cyan-200"
                          : "bg-indigo-400/15 text-indigo-200",
                      ].join(" ")}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <strong className="block text-sm font-semibold text-white">
                        {item.title}
                      </strong>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.completed ? "Completed" : "Available"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 p-4">
          <Link
            to="/learn"
            className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Back to Learn Hub
          </Link>
        </div>
      </aside>

      {/* Main learning workspace */}
      <section className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        {/* Lesson panel */}
        <article className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
          <div className="shrink-0 border-b border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-white">
                  {topic.title}
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Study the lesson, review the examples, and practice the
                  concept in the editor.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                Chapter {currentIndex >= 0 ? currentIndex + 1 : 1}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div
              className="max-w-none text-[15px] leading-8 text-slate-300 [&_br]:leading-8 [&_code]:rounded-md [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sky-200 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_strong]:font-semibold [&_strong]:text-white"
              dangerouslySetInnerHTML={{
                __html: renderLesson(topic.content),
              }}
            />
          </div>

          <div className="shrink-0 border-t border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {previousTopic && (
                  <Link
                    to={`/learn/topic/${previousTopic.id}?subject=${subjectId}`}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                  >
                    ← Previous
                  </Link>
                )}

                {nextTopic && (
                  <Link
                    to={`/learn/topic/${nextTopic.id}?subject=${subjectId}`}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                  >
                    Next →
                  </Link>
                )}
              </div>

              <button
                type="button"
                onClick={handleMarkComplete}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white transition",
                  completed
                    ? "bg-emerald-500/80"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-400 hover:-translate-y-0.5",
                ].join(" ")}
              >
                {completed ? "Completed ✓" : "Mark Complete"}
              </button>
            </div>
          </div>
        </article>

        {/* Practice editor */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
          <div className="shrink-0 border-b border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Practice Editor
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {editorEnabled
                    ? "Write code and run it beside the lesson."
                    : "This subject currently uses lesson-only mode."}
                </p>
              </div>

              <span
                className={[
                  "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  editorEnabled && runEnabled
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300",
                ].join(" ")}
              >
                {editorEnabled && runEnabled
                  ? "Live Runner"
                  : "Lesson Mode"}
              </span>
            </div>
          </div>

          {editorEnabled ? (
            <>
              {/* Editor toolbar */}
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-4">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setLanguageMenuOpen((isOpen) => !isOpen)
                    }
                    className="flex min-w-[110px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/60 hover:bg-slate-800"
                  >
                    <span>
                      {
                        LANGUAGE_OPTIONS.find(
                          (item) => item.value === language,
                        )?.label
                      }
                    </span>

                    <span className="text-slate-400">
                      {languageMenuOpen ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {languageMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close language menu"
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setLanguageMenuOpen(false)}
                      />

                      <div className="absolute left-0 top-full z-40 mt-2 min-w-[150px] overflow-hidden rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl">
                        {LANGUAGE_OPTIONS.map((item) => {
                          const selected = item.value === language;

                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => selectLanguage(item.value)}
                              className={[
                                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition",
                                selected
                                  ? "bg-indigo-500/20 text-indigo-200"
                                  : "text-slate-300 hover:bg-white/10 hover:text-white",
                              ].join(" ")}
                            >
                              <span>{item.label}</span>

                              {selected && (
                                <span className="text-cyan-300">✓</span>
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
                    onClick={copyCode}
                    className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Copy code"
                  >
                    ⧉
                  </button>
                </div>
              </div>

              {/* Code editor */}
              <div className="min-h-[240px] flex-1 overflow-hidden">
                <textarea
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  spellCheck="false"
                  aria-label="Practice code editor"
                  className="h-full min-h-[240px] w-full resize-none bg-[#080d1d] px-4 py-4 font-mono text-sm leading-7 text-sky-100 outline-none placeholder:text-slate-600"
                />
              </div>

              {/* Custom input */}
              <div className="shrink-0 border-t border-white/10 bg-slate-900/75">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Custom Input
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
                  onChange={(event) =>
                    setCustomInput(event.target.value)
                  }
                  rows={3}
                  spellCheck="false"
                  placeholder="Enter input for your program..."
                  className="w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-600"
                />
              </div>

              {/* Run button */}
              <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-slate-900/80 px-4 py-3">
                <span className="text-xs text-slate-500">
                  {!runEnabled
                    ? "Execution is disabled for this subject."
                    : running
                      ? "Executing code..."
                      : "Ready to run"}
                </span>

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!runEnabled || running}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>▶</span>
                  {!runEnabled
                    ? "Run Unavailable"
                    : running
                      ? "Running..."
                      : "Run Code"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[#080d1d] p-6">
              <div className="max-w-md rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-xl">
                  🔒
                </div>

                <h3 className="mt-4 text-lg font-semibold text-amber-100">
                  Practice editor unavailable
                </h3>

                <p className="mt-3 text-sm leading-6 text-amber-100/70">
                  {topic.editor_message ||
                    "This subject is currently available as a lesson and curated resources."}
                </p>

                <p className="mt-4 text-xs leading-5 text-slate-400">
                  The current runner supports C, C++, Python, Java, and
                  JavaScript. Unsupported tools remain disabled rather than
                  producing unreliable execution results.
                </p>
              </div>
            </div>
          )}

          {/* Output */}
          <div className="shrink-0 overflow-hidden rounded-b-3xl border-t border-white/10 bg-slate-950/90">
            <div className="border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
              Output
            </div>

            <pre className="h-[150px] overflow-y-auto whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-5 text-slate-200">
              {output ||
                (editorEnabled
                  ? "Run your code to see the output here."
                  : topic.editor_message ||
                    "No code execution is available for this subject.")}
            </pre>
          </div>
        </section>
      </section>
    </div>
  );
}

export default LearnTopic;