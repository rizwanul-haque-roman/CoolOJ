import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Learn() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoading(true);
        const res = await api.get("/learn/semesters");
        setSemesters(res.data);

        if (res.data.length > 0) {
          setSelectedSemester(res.data[0]);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load semesters");
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedSemester) return;

      try {
        setSubjectLoading(true);
        const res = await api.get(`/learn/semesters/${selectedSemester.id}/subjects`);
        setSubjects(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load subjects");
      } finally {
        setSubjectLoading(false);
      }
    };

    fetchSubjects();
  }, [selectedSemester]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200 shadow-lg backdrop-blur-xl">
        Loading learning hub...
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

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Semester Tracks</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              Follow the National University CSE-style semester flow and unlock guided practice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {semesters.map((semester) => {
            const isActive = selectedSemester?.id === semester.id;

            return (
              <button
                key={semester.id}
                onClick={() => setSelectedSemester(semester)}
                className={[
                  "rounded-3xl border p-5 text-left transition duration-200",
                  isActive
                    ? "border-sky-400/40 bg-sky-400/10 shadow-[0_0_0_1px_rgba(87,177,255,0.15),0_16px_40px_rgba(13,22,52,0.35)]"
                    : "border-white/10 bg-white/5 hover:border-sky-400/30 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                <span className="mb-3 inline-block rounded-full bg-indigo-400/15 px-3 py-1 text-xs font-medium text-sky-200">
                  Semester {semester.number}
                </span>

                <h4 className="text-lg font-semibold text-white">{semester.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {semester.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">
              {selectedSemester?.title || "Subjects"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              Start with Semester 1 for active content. Other semesters stay visible as roadmap placeholders.
            </p>
          </div>
        </div>

        {subjectLoading ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200">
            Loading subjects...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                      subject.is_placeholder
                        ? "bg-amber-400/15 text-amber-200"
                        : "bg-emerald-400/15 text-emerald-200",
                    ].join(" ")}
                  >
                    {subject.is_placeholder ? "Placeholder" : "Ready"}
                  </span>

                  <span className="inline-flex items-center rounded-full bg-indigo-400/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-200">
                    {subject.language || "general"}
                  </span>
                </div>

                <h4 className="text-lg font-semibold text-white">{subject.name}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {subject.description}
                </p>

                <div className="mt-5">
                  {subject.is_placeholder ? (
                    <button
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 opacity-60"
                      disabled
                    >
                      Coming Later
                    </button>
                  ) : (
                    <Link
                      to={`/learn/topic/1?subject=${subject.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px] hover:shadow-cyan-500/20"
                    >
                      Open Learning Track
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Learn;