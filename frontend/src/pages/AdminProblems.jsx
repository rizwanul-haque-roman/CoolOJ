import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const BASE = "/admin/problems";

function blankProblem() {
  return {
    title: "",
    statement: "",
    input_format: "",
    output_format: "",
    constraints: "",
    difficulty: "easy",
    time_limit_ms: 1000,
    memory_limit_kb: 262144,
    subject_id: "",
    is_public: false,
    test_cases: [],
  };
}

function blankCase() {
  return {
    input: "",
    expected_output: "",
    is_sample: false,
  };
}

function errorMessage(error) {
  return error.response?.data?.error || error.message || "Request failed.";
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100";

const buttonClass =
  "rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50";

export default function AdminProblems() {
  const pageRef = useRef(null);
  const pageTopRef = useRef(null);
  const scrollOwnerRef = useRef(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    let owner = page.parentElement;
    while (owner && owner !== document.body && owner !== document.documentElement) {
      if (/^(auto|scroll|overlay)$/.test(getComputedStyle(owner).overflowY)) break;
      owner = owner.parentElement;
    }
    if (!owner || owner === document.body || owner === document.documentElement) {
      owner = page;
    }
    scrollOwnerRef.current = owner;

    const originals = new Map();
    function setStyle(element, property, value) {
      if (!originals.has(element)) originals.set(element, new Map());
      const properties = originals.get(element);
      if (!properties.has(property)) {
        properties.set(property, [
          element.style.getPropertyValue(property),
          element.style.getPropertyPriority(property),
        ]);
      }
      element.style.setProperty(property, value);
    }

    // One main scroll owner; ancestor clipping is scoped to this route.
    for (let ancestor = owner.parentElement; ancestor; ancestor = ancestor.parentElement) {
      ancestor.scrollTop = 0;
      setStyle(ancestor, "overflow-y", "hidden");
    }
    setStyle(owner, "overflow-y", "auto");
    setStyle(owner, "min-height", "0px");
    setStyle(owner, "box-sizing", "border-box");

    function fitScrollOwner() {
      const top = Math.max(0, owner.getBoundingClientRect().top);
      const viewportHeight = document.documentElement.clientHeight;
      setStyle(owner, "height", `${Math.max(0, viewportHeight - top)}px`);
    }

    fitScrollOwner();
    window.addEventListener("resize", fitScrollOwner);
    const observer = new ResizeObserver(fitScrollOwner);
    if (owner.parentElement) observer.observe(owner.parentElement);

    return () => {
      window.removeEventListener("resize", fitScrollOwner);
      observer.disconnect();
      for (const [element, properties] of originals) {
        for (const [property, [value, priority]] of properties) {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        }
      }
      scrollOwnerRef.current = null;
    };
  }, []);

  const [problems, setProblems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(blankProblem);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

function scrollToPageTop() {
  requestAnimationFrame(() => {
    pageTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  });
}

  async function refreshProblems() {
    const { data } = await api.get(BASE);
    setProblems(data);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [problemResponse, subjectResponse] = await Promise.all([
          api.get(BASE),
          api.get("/problems/meta/subjects"),
        ]);

        if (!active) return;

        setProblems(problemResponse.data);
        setSubjects(subjectResponse.data);
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function updateCase(index, field, value) {
    setForm((previous) => ({
      ...previous,
      test_cases: previous.test_cases.map((tc, position) =>
        position === index ? { ...tc, [field]: value } : tc,
      ),
    }));
  }

  function addCase() {
    setForm((previous) => ({
      ...previous,
      test_cases: [...previous.test_cases, blankCase()],
    }));
  }

  function removeCase(index) {
    setForm((previous) => ({
      ...previous,
      test_cases: previous.test_cases.filter(
        (_, position) => position !== index,
      ),
    }));
  }

  function startNew() {
    if (!window.confirm("Discard the current form and start a new problem?")) {
      return;
    }

    setEditingId(null);
    setForm(blankProblem());
    setError("");
    setMessage("");
  }

  async function editProblem(id) {
    if (!window.confirm("Load this problem? Unsaved form changes will be lost.")) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.get(`${BASE}/${id}`);

      setEditingId(data.id);
      setForm({
        title: data.title ?? "",
        statement: data.statement ?? "",
        input_format: data.input_format ?? "",
        output_format: data.output_format ?? "",
        constraints: data.constraints ?? "",
        difficulty: data.difficulty,
        time_limit_ms: data.time_limit_ms,
        memory_limit_kb: data.memory_limit_kb,
        subject_id: data.subject_id ?? "",
        is_public: data.is_public,
        test_cases: data.test_cases.map((tc) => ({
          input: tc.input,
          expected_output: tc.expected_output,
          is_sample: tc.is_sample,
        })),
      });

      scrollOwnerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function importCases(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setMessage("");

    try {
      if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Choose a .json file.");
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error("The JSON file must be at most 2 MB.");
      }

      const parsed = JSON.parse(await file.text());
      const cases = Array.isArray(parsed) ? parsed : parsed.test_cases;

      if (!Array.isArray(cases) || cases.length === 0) {
        throw new Error("The file must contain a non-empty test-case array.");
      }

      if (cases.length + form.test_cases.length > 200) {
        throw new Error("A problem can contain at most 200 test cases.");
      }

      const normalized = cases.map((tc, index) => {
        if (
          !tc ||
          typeof tc.input !== "string" ||
          typeof tc.expected_output !== "string" ||
          (tc.is_sample !== undefined &&
            typeof tc.is_sample !== "boolean")
        ) {
          throw new Error(`Invalid test case at position ${index + 1}.`);
        }

        return {
          input: tc.input,
          expected_output: tc.expected_output,
          is_sample: tc.is_sample ?? false,
        };
      });

      setForm((previous) => ({
        ...previous,
        test_cases: [...previous.test_cases, ...normalized],
      }));

      setMessage(
        `${normalized.length} test cases imported. Save the problem to store them.`,
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveProblem(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      ...form,
      subject_id: form.subject_id === "" ? null : Number(form.subject_id),
      time_limit_ms: Number(form.time_limit_ms),
      memory_limit_kb: Number(form.memory_limit_kb),
    };

    if (payload.is_public) {
      const hasSample = payload.test_cases.some((tc) => tc.is_sample);
      const hasHidden = payload.test_cases.some((tc) => !tc.is_sample);

      if (!hasSample || !hasHidden) {
        setError(
          "Publishing requires at least one sample and one hidden test case.",
        );
        scrollToPageTop();
        return;
      }
    }

    setBusy(true);

    try {
      const response = editingId
        ? await api.put(`${BASE}/${editingId}`, payload)
        : await api.post(BASE, payload);

      // Keep the saved problem open. Future saves update this ID.
      setEditingId(response.data.id);
      setMessage(response.data.message);

      try {
        await refreshProblems();
      } catch {
        setError(
          "The problem was saved, but the problem list could not refresh. Reload the page.",
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
        setBusy(false);
        scrollToPageTop();
    }
  }

  const sampleCount = form.test_cases.filter((tc) => tc.is_sample).length;
  const hiddenCount = form.test_cases.length - sampleCount;

  return (
    <div ref={pageRef} className="bg-slate-950 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header ref={pageTopRef} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Problem Management</h1>
            <p className="mt-2 text-slate-400">
              Create problems, manage tests, and control publication.
            </p>
          </div>

          <button
            type="button"
            onClick={startNew}
            disabled={busy}
            className={buttonClass}
          >
            New problem
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-200"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-200"
          >
            {message}
          </div>
        )}

        <form
          onSubmit={saveProblem}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5"
        >
          <fieldset disabled={busy || loading} className="space-y-6">
            <h2 className="text-xl font-semibold">
              {editingId ? `Edit problem #${editingId}` : "Create a problem"}
            </h2>

            <label className="block space-y-2">
              <span>Title</span>
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                maxLength={200}
                required
                className={inputClass}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span>Subject</span>
                <select
                  name="subject_id"
                  value={form.subject_id}
                  onChange={updateField}
                  className={inputClass}
                >
                  <option value="">No subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      Semester {subject.semester_no} — {subject.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span>Difficulty</span>
                <select
                  name="difficulty"
                  value={form.difficulty}
                  onChange={updateField}
                  className={inputClass}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span>Time limit (milliseconds)</span>
                <input
                  type="number"
                  name="time_limit_ms"
                  value={form.time_limit_ms}
                  onChange={updateField}
                  min="1"
                  max="60000"
                  step="1"
                  required
                  className={inputClass}
                />
              </label>

              <label className="block space-y-2">
                <span>Memory limit (KB)</span>
                <input
                  type="number"
                  name="memory_limit_kb"
                  value={form.memory_limit_kb}
                  onChange={updateField}
                  min="1"
                  max="1048576"
                  step="1"
                  required
                  className={inputClass}
                />
              </label>
            </div>

            {[
              ["statement", "Problem statement", 8],
              ["input_format", "Input format", 4],
              ["output_format", "Output format", 4],
              ["constraints", "Constraints", 4],
            ].map(([name, label, rows]) => (
              <label key={name} className="block space-y-2">
                <span>{label}</span>
                <textarea
                  name={name}
                  value={form[name]}
                  onChange={updateField}
                  rows={rows}
                  required={name === "statement"}
                  className={inputClass}
                />
              </label>
            ))}

            <section className="space-y-4 border-t border-slate-800 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Test cases</h3>
                  <p className="text-sm text-slate-400">
                    {sampleCount} sample · {hiddenCount} hidden
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={addCase}
                    disabled={form.test_cases.length >= 200}
                    className={buttonClass}
                  >
                    Add test case
                  </button>

                  <label
                    className={`${buttonClass} relative inline-flex cursor-pointer items-center justify-center overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400`}
                    >
                    <span>Import JSON</span>

                    <input
                        type="file"
                        accept=".json,application/json"
                        onChange={importCases}
                        aria-label="Import test cases from a JSON file"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Imported cases are appended. Sample cases are visible to users;
                hidden cases must remain server-side.
              </p>

              {form.test_cases.map((tc, index) => (
                <article
                  key={index}
                  className="space-y-4 rounded-lg border border-slate-700 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4>Test case {index + 1}</h4>

                    <button
                      type="button"
                      onClick={() => removeCase(index)}
                      className="text-sm text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span>Input</span>
                      <textarea
                        value={tc.input}
                        onChange={(event) =>
                          updateCase(index, "input", event.target.value)
                        }
                        rows={5}
                        spellCheck={false}
                        className={`${inputClass} font-mono text-sm`}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span>Expected output</span>
                      <textarea
                        value={tc.expected_output}
                        onChange={(event) =>
                          updateCase(
                            index,
                            "expected_output",
                            event.target.value,
                          )
                        }
                        rows={5}
                        spellCheck={false}
                        className={`${inputClass} font-mono text-sm`}
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tc.is_sample}
                      onChange={(event) =>
                        updateCase(index, "is_sample", event.target.checked)
                      }
                    />
                    Visible sample case
                  </label>
                </article>
              ))}
            </section>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={form.is_public}
                  onChange={updateField}
                />
                Published — visible in the public problem archive
              </label>

              <button
                    type="submit"
                    disabled={busy || loading}
                    className="rounded-lg bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-500 disabled:opacity-50"
                >
                 {busy ? "Saving..." : "Save problem"}
                </button>
            </footer>
          </fieldset>
        </form>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-xl font-semibold">Existing problems</h2>

          {loading ? (
            <p className="text-slate-400">Loading problems...</p>
          ) : problems.length === 0 ? (
            <p className="text-slate-400">No problems found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Problem</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tests</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {problems.map((problem) => (
                    <tr
                      key={problem.id}
                      className="border-b border-slate-800"
                    >
                      <td className="p-3">{problem.id}</td>
                      <td className="p-3">
                        <div>{problem.title}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {problem.difficulty}
                        </div>
                      </td>
                      <td className="p-3">
                        {problem.subject_name || "—"}
                      </td>
                      <td className="p-3">
                        {problem.is_public ? "Published" : "Draft"}
                      </td>
                      <td className="p-3">{problem.test_case_count}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => editProblem(problem.id)}
                            disabled={busy || loading}
                            className="text-indigo-300 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          {Boolean(problem.is_public) && (
                            <Link
                              to={`/problems/${problem.id}`}
                              className="text-slate-300"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}