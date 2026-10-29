import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function semesterLabel(number) {
  const semester = Number(number);
  const year = Math.ceil(semester / 2);

  const yearLabels = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
  };

  return `${yearLabels[year] || `${year}th`} year - Semester ${semester}`;
}

function Learn() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [error, setError] = useState("");
  const [subjectError, setSubjectError] = useState("");

  const [semesterRetry, setSemesterRetry] = useState(0);
  const [subjectRetry, setSubjectRetry] = useState(0);

  const selectedSemesterId = selectedSemester?.id ?? null;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSemesters() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/learn/semesters", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected semester response.");
        }

        const availableSemesters = response.data
          .filter((semester) => Number(semester.is_active) === 1)
          .sort((a, b) => Number(a.number) - Number(b.number));

        setSemesters(availableSemesters);

        setSelectedSemester((previous) => {
          const existingSelection = availableSemesters.find(
            (semester) => String(semester.id) === String(previous?.id),
          );

          return existingSelection || availableSemesters[0] || null;
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load semesters.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchSemesters();

    return () => controller.abort();
  }, [semesterRetry]);

  useEffect(() => {
    if (selectedSemesterId === null) {
      setSubjects([]);
      setSubjectError("");
      setSubjectLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchSubjects() {
      setSubjectLoading(true);
      setSubjectError("");
      setSubjects([]);

      try {
        const response = await api.get(
          `/learn/semesters/${selectedSemesterId}/subjects`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected course response.");
        }

        const courses = response.data;

        const coursesWithProgress = await Promise.all(
          courses.map(async (subject) => {
            const isPlaceholder =
              Number(subject.is_placeholder) === 1;

            if (isPlaceholder) {
              return {
                ...subject,
                isPlaceholder: true,
                lessonCount: 0,
                completedCount: 0,
                startTopicId: null,
                lessonError: "",
              };
            }

            try {
              const topicResponse = await api.get(
                `/learn/subjects/${subject.id}/topics`,
                { signal: controller.signal },
              );

              if (!Array.isArray(topicResponse.data)) {
                throw new Error("Unexpected lesson response.");
              }

              const lessons = [...topicResponse.data].sort(
                (a, b) =>
                  Number(a.order_index) - Number(b.order_index) ||
                  Number(a.id) - Number(b.id),
              );

              const completedLessons = lessons.filter(
                (lesson) => Number(lesson.completed) === 1,
              );

              // The earliest incomplete lesson has no incomplete
              // lessons before it. If all are complete, reopen lesson 1.
              const startLesson =
                lessons.find(
                  (lesson) => Number(lesson.completed) !== 1,
                ) ||
                lessons[0] ||
                null;

              return {
                ...subject,
                isPlaceholder: false,
                lessonCount: lessons.length,
                completedCount: completedLessons.length,
                startTopicId: startLesson?.id ?? null,
                lessonError: "",
              };
            } catch (err) {
              if (controller.signal.aborted) throw err;

              return {
                ...subject,
                isPlaceholder: false,
                lessonCount: 0,
                completedCount: 0,
                startTopicId: null,
                lessonError:
                  err.response?.status === 401
                    ? "Your session has expired. Please log in again."
                    : err.response?.data?.error ||
                      err.message ||
                      "Unable to load lessons.",
              };
            }
          }),
        );

        if (controller.signal.aborted) return;

        setSubjects(coursesWithProgress);
      } catch (err) {
        if (controller.signal.aborted) return;

        setSubjectError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load courses.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSubjectLoading(false);
        }
      }
    }

    fetchSubjects();

    return () => controller.abort();
  }, [selectedSemesterId, subjectRetry]);

  const selectSemester = (semester) => {
    if (String(semester.id) === String(selectedSemesterId)) return;

    setSubjects([]);
    setSubjectError("");
    setSubjectLoading(true);
    setSelectedSemester(semester);
  };

  if (loading) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200 shadow-lg backdrop-blur-xl"
      >
        Loading learning hub...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200 shadow-lg backdrop-blur-xl"
      >
        <p>{error}</p>

        <button
          type="button"
          onClick={() => setSemesterRetry((value) => value + 1)}
          className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Semester selection */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">
              Semester Tracks
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              Follow the National University CSE semester flow and
              learn programming through guided lessons and practice.
            </p>
          </div>
        </div>

        {semesters.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
            No learning semesters are available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {semesters.map((semester) => {
              const isActive =
                String(selectedSemesterId) === String(semester.id);

              return (
                <button
                  key={semester.id}
                  type="button"
                  onClick={() => selectSemester(semester)}
                  aria-pressed={isActive}
                  className={[
                    "rounded-3xl border p-5 text-left transition duration-200",
                    isActive
                      ? "border-sky-400/40 bg-sky-400/10 shadow-[0_0_0_1px_rgba(87,177,255,0.15),0_16px_40px_rgba(13,22,52,0.35)]"
                      : "border-white/10 bg-white/5 hover:border-sky-400/30 hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <span className="mb-3 inline-block rounded-full bg-indigo-400/15 px-3 py-1 text-xs font-medium text-sky-200">
                    {semesterLabel(semester.number)}
                  </span>

                  <h4 className="text-lg font-semibold text-white">
                    {Number(semester.course_count || 0)}{" "}
                    {Number(semester.course_count || 0) === 1
                      ? "course"
                      : "courses"}
                  </h4>

                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    {Array.isArray(semester.course_names) &&
                    semester.course_names.length > 0
                      ? semester.course_names.join(", ")
                      : "No courses added yet."}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Courses */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">
              {selectedSemester
                ? `${semesterLabel(selectedSemester.number)} — Courses`
                : "Courses"}
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              Choose a course to start learning or continue from your
              next incomplete lesson. Unavailable courses are marked
              as coming soon.
            </p>
          </div>

          {selectedSemester && (
            <button
              type="button"
              disabled={subjectLoading}
              onClick={() => setSubjectRetry((value) => value + 1)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {subjectLoading ? "Loading..." : "Refresh"}
            </button>
          )}
        </div>

        {subjectLoading ? (
          <div
            role="status"
            className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-200"
          >
            Loading courses and progress...
          </div>
        ) : subjectError ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-200"
          >
            <p>{subjectError}</p>

            <button
              type="button"
              onClick={() => setSubjectRetry((value) => value + 1)}
              className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        ) : !selectedSemester ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
            Select a semester to view its courses.
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-slate-400">
            No programming learning tracks are currently included for
            this semester.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {subjects.map((subject) => {
              const hasLessons =
                !subject.isPlaceholder &&
                subject.lessonCount > 0 &&
                subject.startTopicId !== null &&
                !subject.lessonError;

              const isComplete =
                hasLessons &&
                subject.completedCount === subject.lessonCount;

              const hasProgress =
                hasLessons && subject.completedCount > 0;

              const progressPercent = subject.lessonCount
                ? Math.round(
                    (subject.completedCount / subject.lessonCount) *
                      100,
                  )
                : 0;

              const statusLabel = subject.lessonError
                ? "Unavailable"
                : !hasLessons
                  ? "Coming soon"
                  : isComplete
                    ? "Completed"
                    : "Ready";

              const actionLabel = isComplete
                ? "Review Learning Track"
                : hasProgress
                  ? "Continue Learning"
                  : "Start Learning";

              return (
                <div
                  key={subject.id}
                  className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        subject.lessonError
                          ? "bg-rose-400/15 text-rose-200"
                          : !hasLessons
                            ? "bg-amber-400/15 text-amber-200"
                            : "bg-emerald-400/15 text-emerald-200",
                      ].join(" ")}
                    >
                      {statusLabel}
                    </span>

                    <span className="inline-flex items-center rounded-full bg-indigo-400/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-200">
                      {subject.language || "general"}
                    </span>
                  </div>

                  <h4 className="text-lg font-semibold text-white">
                    {subject.name}
                  </h4>

                  {subject.description && (
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      {subject.description}
                    </p>
                  )}

                  {hasLessons && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>
                          {subject.completedCount} of{" "}
                          {subject.lessonCount} lessons completed
                        </span>

                        <span>{progressPercent}%</span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label={`${subject.name} completion`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent}
                        className="h-1.5 overflow-hidden rounded-full bg-white/10"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {subject.lessonError && (
                    <p
                      role="alert"
                      className="mt-4 text-xs leading-6 text-rose-300"
                    >
                      {subject.lessonError}
                    </p>
                  )}

                  <div className="mt-auto pt-5">
                    {subject.lessonError ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSubjectRetry((value) => value + 1)
                        }
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                      >
                        Retry Loading Lessons
                      </button>
                    ) : !hasLessons ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 opacity-60"
                      >
                        Coming Soon
                      </button>
                    ) : (
                      <Link
                        to={`/learn/topic/${subject.startTopicId}?subject=${subject.id}`}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-px hover:shadow-cyan-500/20"
                      >
                        {actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Learn;