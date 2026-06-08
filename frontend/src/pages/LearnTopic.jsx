import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios";

function LearnTopic() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject") || "1";

  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState(
    "// Code runner will be connected next.\n// For now, this editor is ready for integration.",
  );
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const fetchSidebarTopics = async () => {
      try {
        setSidebarLoading(true);
        const res = await api.get(`/learn/subjects/${subjectId}/topics`);
        setTopics(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load topic list");
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
        const res = await api.get(`/learn/topics/${topicId}`);
        setTopic(res.data);
        setCode(res.data.starter_code || "");
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load topic details");
      } finally {
        setLoading(false);
      }
    };
    fetchTopic();
  }, [topicId]);

  const currentIndex = useMemo(
    () => topics.findIndex((item) => String(item.id) === String(topicId)),
    [topics, topicId],
  );

  const handleRun = async () => {
    setRunning(true);
    setTimeout(() => {
      setOutput(
        "Runner placeholder:\n\nYour code editor is ready.\nNext we will connect this to Judge0 for live execution.",
      );
      setRunning(false);
    }, 700);
  };

  const renderLesson = (content) => {
    if (!content) return "No lesson content available.";
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
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200 shadow-lg backdrop-blur-xl">
        Loading topic...
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

  if (!topic) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200 shadow-lg backdrop-blur-xl">
        Topic not found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* ── Sidebar ── no col-span anywhere ── */}
      <aside className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            Topic Flow
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400 sm:leading-7">
            Complete lessons in order and practice as you go.
          </p>
        </div>

        {sidebarLoading ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200">
            Loading topics...
          </div>
        ) : (
          <div className="grid gap-3">
            {topics.map((item, index) => {
              const isActive = String(item.id) === String(topicId);
              return (
                <Link
                  key={item.id}
                  to={`/learn/topic/${item.id}?subject=${subjectId}`}
                  className={[
                    "flex items-start gap-3 rounded-2xl border p-3 transition sm:p-4",
                    isActive
                      ? "border-sky-400/40 bg-sky-400/10"
                      : "border-white/10 bg-white/[0.035] hover:border-sky-400/30 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sm font-medium text-sky-200">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-sm font-semibold text-white">
                      {item.title}
                    </strong>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.completed ? "Completed" : "Available"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </aside>

      {/* ── Lesson ── */}
      <section className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              {topic.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400 sm:leading-7">
              Learn the concept, study the example, then test code on the right.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full bg-indigo-400/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-indigo-200 sm:text-xs">
            Chapter {currentIndex >= 0 ? currentIndex + 1 : 1}
          </div>
        </div>

        <div
          className="max-w-none text-sm leading-7 text-slate-300 sm:text-[15px] sm:leading-8 [&_code]:rounded-md [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sky-200 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_strong]:font-semibold [&_strong]:text-white"
          dangerouslySetInnerHTML={{ __html: renderLesson(topic.content) }}
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20">
            Mark Complete
          </button>
          <Link
            to="/learn"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Back to Learn Hub
          </Link>
        </div>
      </section>

      {/* ── Editor ── */}
      <section className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            Practice Editor
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400 sm:leading-7">
            Write C code and run it beside the lesson.
          </p>
        </div>

        <textarea
          className="min-h-[280px] w-full resize-y rounded-3xl border border-white/10 bg-[#020714]/90 p-4 font-mono text-sm leading-6 text-sky-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15 sm:min-h-[380px] sm:leading-7"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck="false"
        />

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleRun}
            disabled={running}
          >
            {running ? "Running..." : "Run Code"}
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#020714]/95">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-wide text-indigo-200">
            Output
          </div>
          <pre className="min-h-[150px] overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-6 text-sky-100 sm:min-h-[170px] sm:text-sm sm:leading-7">
            {output}
          </pre>
        </div>
      </section>
    </div>
  );
}

export default LearnTopic;
