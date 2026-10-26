import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "../components/ProfileDashboard.css";

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
    <div ref={pageRef} className="pd-stack">
      <div className="pd-row" ref={pageTopRef}>
        <div>
          <h1 className="pd-title" style={{ fontSize: "1.5rem" }}>Problem Management</h1>
          <p className="pd-note">
            Create problems, manage tests, and control publication.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={busy}
          className="pd-button"
        >
          New problem
        </button>
      </div>

      {error && (
        <p role="alert" className="pd-error">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="pd-note" style={{ color: "#34d399", padding: "12px", border: "1px solid #05966933", backgroundColor: "#064e3b1a", borderRadius: "6px" }}>
          {message}
        </p>
      )}

      <form onSubmit={saveProblem} className="pd-panel">
        <fieldset disabled={busy || loading} style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2 className="pd-title">
            {editingId ? `Edit problem #${editingId}` : "Create a problem"}
          </h2>

          <label style={{ display: "block" }}>
            <div className="pd-note" style={{ marginBottom: "6px" }}>Title</div>
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              maxLength={200}
              required
              className="pd-input"
              style={{ width: "100%" }}
            />
          </label>

          <div className="pd-row" style={{ alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 200px" }}>
              <div className="pd-note" style={{ marginBottom: "6px" }}>Subject</div>
              <select
                name="subject_id"
                value={form.subject_id}
                onChange={updateField}
                className="pd-input"
                style={{ width: "100%" }}
              >
                <option value="">No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    Semester {subject.semester_no} — {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ flex: "1 1 200px" }}>
              <div className="pd-note" style={{ marginBottom: "6px" }}>Difficulty</div>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={updateField}
                className="pd-input"
                style={{ width: "100%" }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label style={{ flex: "1 1 200px" }}>
              <div className="pd-note" style={{ marginBottom: "6px" }}>Time limit (milliseconds)</div>
              <input
                type="number"
                name="time_limit_ms"
                value={form.time_limit_ms}
                onChange={updateField}
                min="1"
                max="60000"
                step="1"
                required
                className="pd-input"
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ flex: "1 1 200px" }}>
              <div className="pd-note" style={{ marginBottom: "6px" }}>Memory limit (KB)</div>
              <input
                type="number"
                name="memory_limit_kb"
                value={form.memory_limit_kb}
                onChange={updateField}
                min="1"
                max="1048576"
                step="1"
                required
                className="pd-input"
                style={{ width: "100%" }}
              />
            </label>
          </div>

          {[
            ["statement", "Problem statement", 8],
            ["input_format", "Input format", 4],
            ["output_format", "Output format", 4],
            ["constraints", "Constraints", 4],
          ].map(([name, label, rows]) => (
            <label key={name} style={{ display: "block", marginTop: "8px" }}>
              <div className="pd-note" style={{ marginBottom: "6px" }}>{label}</div>
              <textarea
                name={name}
                value={form[name]}
                onChange={updateField}
                rows={rows}
                required={name === "statement"}
                className="pd-input"
                style={{ width: "100%", fontFamily: "inherit" }}
              />
            </label>
          ))}

          <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #ffffff0a" }}>
            <div className="pd-row">
              <div>
                <h3 className="pd-title">Test cases</h3>
                <p className="pd-note" style={{ marginTop: "4px" }}>
                  {sampleCount} sample · {hiddenCount} hidden
                </p>
              </div>

              <div className="pd-row" style={{ gap: "12px" }}>
                <button
                  type="button"
                  onClick={addCase}
                  disabled={form.test_cases.length >= 200}
                  className="pd-button"
                >
                  Add test case
                </button>

                <label
                  className="pd-button"
                  style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
                >
                  <span>Import JSON</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={importCases}
                    aria-label="Import test cases from a JSON file"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                  />
                </label>
              </div>
            </div>

            <p className="pd-note" style={{ marginTop: "8px", marginBottom: "16px" }}>
              Imported cases are appended. Sample cases are visible to users;
              hidden cases must remain server-side.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {form.test_cases.map((tc, index) => (
                <div key={index} className="pd-panel" style={{ padding: "16px", backgroundColor: "#ffffff05", border: "1px solid #ffffff0a" }}>
                  <div className="pd-row">
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#e2e8f0" }}>Test case {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeCase(index)}
                      style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "13px" }}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="pd-row" style={{ alignItems: "flex-start", marginTop: "12px", gap: "16px" }}>
                    <label style={{ flex: 1 }}>
                      <div className="pd-note" style={{ marginBottom: "6px" }}>Input</div>
                      <textarea
                        value={tc.input}
                        onChange={(event) =>
                          updateCase(index, "input", event.target.value)
                        }
                        rows={5}
                        spellCheck={false}
                        className="pd-input"
                        style={{ width: "100%", fontFamily: "monospace", fontSize: "13px" }}
                      />
                    </label>

                    <label style={{ flex: 1 }}>
                      <div className="pd-note" style={{ marginBottom: "6px" }}>Expected output</div>
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
                        className="pd-input"
                        style={{ width: "100%", fontFamily: "monospace", fontSize: "13px" }}
                      />
                    </label>
                  </div>

                  <label className="pd-row" style={{ justifyContent: "flex-start", gap: "8px", marginTop: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={tc.is_sample}
                      onChange={(event) =>
                        updateCase(index, "is_sample", event.target.checked)
                      }
                    />
                    <span className="pd-note">Visible sample case</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-row" style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #ffffff0a" }}>
            <label className="pd-row" style={{ justifyContent: "flex-start", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                name="is_public"
                checked={form.is_public}
                onChange={updateField}
              />
              <span className="pd-note">Published — visible in the public problem archive</span>
            </label>

            <button
              type="submit"
              disabled={busy || loading}
              className="pd-button"
              style={{ backgroundColor: "#3b82f6", color: "#fff", border: "none" }}
            >
              {busy ? "Saving..." : "Save problem"}
            </button>
          </div>
        </fieldset>
      </form>

      <section className="pd-panel" style={{ marginTop: "24px" }}>
        <h2 className="pd-title" style={{ marginBottom: "16px" }}>Existing problems</h2>

        {loading ? (
          <p className="pd-note">Loading problems...</p>
        ) : problems.length === 0 ? (
          <p className="pd-note">No problems found.</p>
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Problem</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Tests</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.id}>
                    <td>{problem.id}</td>
                    <td>
                      <div>{problem.title}</div>
                      <div className="pd-note" style={{ marginTop: "4px" }}>
                        {problem.difficulty}
                      </div>
                    </td>
                    <td>
                      {problem.subject_name || "—"}
                    </td>
                    <td>
                      {problem.is_public ? "Published" : "Draft"}
                    </td>
                    <td>{problem.test_case_count}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => editProblem(problem.id)}
                        disabled={busy || loading}
                        style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", marginRight: "12px" }}
                      >
                        Edit
                      </button>

                      {Boolean(problem.is_public) && (
                        <Link
                          to={`/problems/${problem.id}`}
                          className="pd-link"
                        >
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}