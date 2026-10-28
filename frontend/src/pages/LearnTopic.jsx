import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

const EDITOR_LANGUAGES = {
  c: "c",
  cpp: "cpp",
  python: "python",
  java: "java",
};

const MARKDOWN_CLASS_NAME = `
  max-w-none break-words text-[15px] leading-7 text-slate-300
  [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-3xl
  [&_h1]:font-bold [&_h1]:text-white
  [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-2xl
  [&_h2]:font-semibold [&_h2]:text-white
  [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl
  [&_h3]:font-semibold [&_h3]:text-white
  [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-semibold
  [&_h4]:text-white
  [&_p]:my-4
  [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6
  [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
  [&_li]:my-1
  [&_strong]:font-semibold [&_strong]:text-white
  [&_a]:text-cyan-300 [&_a]:underline
  [&_blockquote]:my-4 [&_blockquote]:border-l-2
  [&_blockquote]:border-cyan-400/40
  [&_blockquote]:pl-4 [&_blockquote]:text-slate-400
  [&_code]:rounded [&_code]:bg-white/10
  [&_code]:px-1 [&_code]:py-0.5
  [&_code]:font-mono [&_code]:text-sm
  [&_code]:text-sky-200
  [&_pre]:my-4 [&_pre]:overflow-x-auto
  [&_pre]:rounded-xl [&_pre]:border
  [&_pre]:border-white/10 [&_pre]:bg-[#080d1d]
  [&_pre]:p-4
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_pre_code]:whitespace-pre
  [&_table]:w-full [&_table]:border-collapse
  [&_table]:text-sm
  [&_th]:border [&_th]:border-white/10
  [&_th]:bg-white/5 [&_th]:p-3 [&_th]:text-left
  [&_td]:border [&_td]:border-white/10 [&_td]:p-3
  [&_hr]:my-6 [&_hr]:border-white/10
  [&_img]:max-w-full [&_img]:rounded-xl
`;

function LearnTopic() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject") || "1";

  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loadedTopicId, setLoadedTopicId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarError, setSidebarError] = useState("");

  const [language, setLanguage] = useState("c");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE.c);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");

  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  const lessonScrollRef = useRef(null);
  const runInFlightRef = useRef(false);
  const progressInFlightRef = useRef(false);
  const currentTopicRef = useRef(topicId);
  const runSequenceRef = useRef(0);
  const progressSequenceRef = useRef(0);

  currentTopicRef.current = topicId;

  const editorEnabled =
    Number(topic?.editor_enabled) === 1 ||
    topic?.editor_enabled === true;

  const runEnabled =
    Number(topic?.run_enabled) === 1 ||
    topic?.run_enabled === true;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSidebarTopics() {
      setSidebarLoading(true);
      setSidebarError("");
      setTopics([]);

      try {
        const response = await api.get(
          `/learn/subjects/${subjectId}/topics`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected topic list response.");
        }

        setTopics(response.data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setSidebarError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load topic list.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSidebarLoading(false);
        }
      }
    }

    fetchSidebarTopics();

    return () => controller.abort();
  }, [subjectId]);

  useEffect(() => {
    const controller = new AbortController();

    runSequenceRef.current += 1;
    runInFlightRef.current = false;
    progressSequenceRef.current += 1;
    progressInFlightRef.current = false;

    async function fetchTopic() {
      setLoading(true);
      setError("");
      setTopic(null);
      setLoadedTopicId(null);
      setOutput("");
      setCustomInput("");
      setRunning(false);
      setCompleted(false);
      setSavingProgress(false);
      setProgressError("");
      setLanguageMenuOpen(false);

      try {
        const response = await api.get(
          `/learn/topics/${topicId}`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        const data = response.data;

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          String(data.id) !== String(topicId)
        ) {
          throw new Error("Unexpected topic response.");
        }

        const nextLanguage = DEFAULT_CODE[data.default_language]
          ? data.default_language
          : "c";

        setTopic(data);
        setLanguage(nextLanguage);
        setCode(
          typeof data.starter_code === "string" &&
            data.starter_code.trim()
            ? data.starter_code
            : DEFAULT_CODE[nextLanguage],
        );
        setLoadedTopicId(String(topicId));
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load topic details.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchTopic();

    return () => {
      controller.abort();
      runSequenceRef.current += 1;
      progressSequenceRef.current += 1;
    };
  }, [topicId]);

  useEffect(() => {
    if (loadedTopicId !== String(topicId)) return;

    lessonScrollRef.current?.scrollTo({
      top: 0,
      left: 0,
    });
  }, [loadedTopicId, topicId]);

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

  const currentTopicCompleted =
    completed ||
    (currentIndex >= 0 &&
      Number(topics[currentIndex]?.completed) === 1);

  const selectLanguage = (nextLanguage) => {
    if (running) return;

    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);

    const isDefaultCode = Object.values(DEFAULT_CODE).includes(code);

    if (!code.trim() || isDefaultCode) {
      setCode(DEFAULT_CODE[nextLanguage] || "");
    }
  };

  const handleResetCode = () => {
    if (running) return;

    const lessonLanguage = DEFAULT_CODE[topic?.default_language]
      ? topic.default_language
      : "c";

    const hasLessonStarter =
      typeof topic?.starter_code === "string" &&
      topic.starter_code.trim();

    setCode(
      language === lessonLanguage && hasLessonStarter
        ? topic.starter_code
        : DEFAULT_CODE[language] || "",
    );

    setOutput("");
  };

  const handleRun = async () => {
    if (
      runInFlightRef.current ||
      loadedTopicId !== String(topicId)
    ) {
      return;
    }

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

    const requestTopicId = topicId;
    const requestSequence = ++runSequenceRef.current;

    const isCurrentRequest = () =>
      currentTopicRef.current === requestTopicId &&
      runSequenceRef.current === requestSequence;

    runInFlightRef.current = true;
    setRunning(true);
    setLanguageMenuOpen(false);
    setOutput("");

    try {
      const response = await api.post("/submissions/run", {
        language,
        code,
        input: customInput,
      });

      if (!isCurrentRequest()) return;

      const result = response.data;

      setOutput(
        [
          `Execution: ${
            result.execution_status || result.verdict || "Unknown"
          }`,
          "Note: Run executes your code; it does not check the lesson answer.",
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
      if (!isCurrentRequest()) return;

      setOutput(
        `Run Error\n\n${
          err.response?.data?.error ||
          "Unable to execute this code."
        }`,
      );
    } finally {
      if (isCurrentRequest()) {
        runInFlightRef.current = false;
        setRunning(false);
      }
    }
  };

  const handleMarkComplete = async () => {
    if (
      progressInFlightRef.current ||
      currentTopicCompleted ||
      loadedTopicId !== String(topicId)
    ) {
      return;
    }

    const requestedTopicId = topicId;
    const requestSequence = ++progressSequenceRef.current;

    const isCurrentRequest = () =>
      currentTopicRef.current === requestedTopicId &&
      progressSequenceRef.current === requestSequence;

    progressInFlightRef.current = true;
    setSavingProgress(true);
    setProgressError("");

    try {
      const response = await api.post(
        `/learn/topics/${requestedTopicId}/complete`,
      );

      if (!isCurrentRequest()) return;

      if (response.data?.completed !== true) {
        throw new Error("The server did not confirm completion.");
      }

      setCompleted(true);

      setTopics((previous) =>
        previous.map((item) =>
          String(item.id) === String(requestedTopicId)
            ? { ...item, completed: 1 }
            : item,
        ),
      );
    } catch (err) {
      if (!isCurrentRequest()) return;

      setProgressError(
        err.response?.status === 401
          ? "Please log in to save your progress."
          : err.response?.data?.error ||
              err.message ||
              "Failed to save progress.",
      );
    } finally {
      if (isCurrentRequest()) {
        progressInFlightRef.current = false;
        setSavingProgress(false);
      }
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard access may be unavailable.
    }
  };

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200"
      >
        {error}
      </div>
    );
  }

  if (
    loading ||
    !topic ||
    loadedTopicId !== String(topicId)
  ) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200"
      >
        Loading topic...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[640px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl">
      {/* Topic sidebar */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-white/10">
        <div className="shrink-0 border-b border-white/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">
              Topic Flow
            </h3>

            <span className="shrink-0 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[10px] font-semibold text-indigo-200">
              {topics.length} topics
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Complete lessons in order.
          </p>
        </div>

        <nav
          aria-label="Lesson topics"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        >
          {sidebarLoading ? (
            <div
              role="status"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200"
            >
              Loading topics...
            </div>
          ) : sidebarError ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200"
            >
              {sidebarError}
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

                const isCompleted =
                  Number(item.completed) === 1 ||
                  (isActive && completed);

                return (
                  <Link
                    key={item.id}
                    to={`/learn/topic/${item.id}?subject=${subjectId}`}
                    aria-current={isActive ? "page" : undefined}
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
                        {isCompleted ? "Completed" : "Available"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <Link
            to="/learn"
            className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Back to Learn Hub
          </Link>
        </div>
      </aside>

      {/* Lesson and practice workspace */}
      <section className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        {/* Lesson panel */}
        <article className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-white/10 xl:border-b-0 xl:border-r">
          <div className="shrink-0 border-b border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-white">
                  {topic.title}
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Study the lesson, review the examples, and practice
                  the concept in the editor.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                Chapter {currentIndex >= 0 ? currentIndex + 1 : 1}
              </span>
            </div>
          </div>

          <div
            ref={lessonScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
          >
            <div className={MARKDOWN_CLASS_NAME}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {topic.content || "No lesson content available."}
              </ReactMarkdown>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 p-4">
            {progressError && (
              <p role="alert" className="mb-3 text-xs text-rose-300">
                {progressError}
              </p>
            )}

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
                disabled={currentTopicCompleted || savingProgress}
                aria-busy={savingProgress}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white transition disabled:cursor-default",
                  currentTopicCompleted
                    ? "bg-emerald-500/80"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-400 enabled:hover:-translate-y-0.5 disabled:opacity-60",
                ].join(" ")}
              >
                {savingProgress
                  ? "Saving..."
                  : currentTopicCompleted
                    ? "Completed ✓"
                    : "Mark Complete"}
              </button>
            </div>
          </div>
        </article>

        {/* Practice editor */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
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
                  "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
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

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            {editorEnabled ? (
              <>
                {/* Editor toolbar */}
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-4">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={running}
                      aria-expanded={languageMenuOpen}
                      onClick={() =>
                        setLanguageMenuOpen((isOpen) => !isOpen)
                      }
                      className="flex min-w-[110px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/60 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <span>
                        {
                          LANGUAGE_OPTIONS.find(
                            (item) => item.value === language,
                          )?.label
                        }
                      </span>

                      <span
                        aria-hidden="true"
                        className="text-slate-400"
                      >
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
                            const selected =
                              item.value === language;

                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() =>
                                  selectLanguage(item.value)
                                }
                                className={[
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition",
                                  selected
                                    ? "bg-indigo-500/20 text-indigo-200"
                                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                                ].join(" ")}
                              >
                                <span>{item.label}</span>

                                {selected && (
                                  <span className="text-cyan-300">
                                    ✓
                                  </span>
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
                      disabled={running}
                      aria-label="Reset code"
                      title="Reset code"
                      className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      ↻
                    </button>

                    <button
                      type="button"
                      onClick={copyCode}
                      aria-label="Copy code"
                      title="Copy code"
                      className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      ⧉
                    </button>
                  </div>
                </div>

                {/* Monaco editor */}
                <div className="relative min-h-[240px] min-w-0 flex-1 overflow-hidden bg-[#080d1d]">
                  <Editor
                    height="100%"
                    width="100%"
                    language={EDITOR_LANGUAGES[language]}
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value ?? "")}
                    loading={
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Loading code editor...
                      </div>
                    }
                    options={{
                      automaticLayout: true,
                      ariaLabel: "Practice code editor",
                      fontSize: 14,
                      fontFamily:
                        "Consolas, 'Courier New', monospace",
                      lineHeight: 24,
                      lineNumbers: "on",
                      minimap: { enabled: false },
                      tabSize: 4,
                      insertSpaces: true,
                      detectIndentation: false,
                      tabFocusMode: false,
                      autoIndent: "full",
                      autoClosingBrackets: "always",
                      autoClosingQuotes: "always",
                      matchBrackets: "always",
                      folding: true,
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      renderWhitespace: "selection",
                      renderLineHighlight: "line",
                      padding: {
                        top: 16,
                        bottom: 16,
                      },
                      scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                      },
                      readOnly: running,
                      formatOnPaste: false,
                      formatOnType: false,
                    }}
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
                      disabled={running}
                      onClick={() => setCustomInput("")}
                      className="text-[11px] text-slate-500 transition hover:text-slate-200 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>

                  <textarea
                    value={customInput}
                    onChange={(event) =>
                      setCustomInput(event.target.value)
                    }
                    disabled={running}
                    rows={3}
                    spellCheck="false"
                    aria-label="Custom input"
                    placeholder="Enter input for your program..."
                    className="block w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-5 text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-60"
                  />
                </div>

                {/* Run button */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-900/80 px-4 py-3">
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
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span aria-hidden="true">▶</span>
                    {!runEnabled
                      ? "Run Unavailable"
                      : running
                        ? "Running..."
                        : "Run Code"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[240px] flex-1 items-center justify-center bg-[#080d1d] p-6">
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
                    Unsupported tools remain disabled rather than
                    producing unreliable execution results.
                  </p>
                </div>
              </div>
            )}

            {/* Output */}
            <div className="shrink-0 overflow-hidden border-t border-white/10 bg-slate-950/90">
              <div className="border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
                Output
              </div>

              <pre
                role="status"
                aria-live="polite"
                className="h-[150px] overflow-y-auto overscroll-contain whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-5 text-slate-200"
              >
                {running
                  ? "Executing code..."
                  : output ||
                    (editorEnabled
                      ? "Run your code to see the output here."
                      : topic.editor_message ||
                        "No code execution is available for this subject.")}
              </pre>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

export default LearnTopic;