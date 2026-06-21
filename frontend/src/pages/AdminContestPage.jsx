import { useEffect, useState } from "react";
import api from "../api/axios";

function AdminContestPage() {
  const [contests, setContests] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("contests");

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    is_public: true,
  });

  const [selectedContest, setSelectedContest] = useState(null);
  const [contestProblems, setContestProblems] = useState([]);
  const [addProblemId, setAddProblemId] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    fetchContests();
    fetchProblems();
  }, []);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/contests");
      setContests(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  const fetchProblems = async () => {
    try {
      const res = await api.get("/problems");
      setProblems(res.data);
    } catch (err) {
      console.error("Failed to load problems");
    }
  };

  const fetchContestProblems = async (contestId) => {
    try {
      const res = await api.get(`/admin/contests/${contestId}/problems`);
      setContestProblems(res.data);
    } catch (err) {
      console.error("Failed to load contest problems");
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleCreateContest = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    try {
      await api.post("/admin/contests", form);
      setFormSuccess("Contest created successfully.");
      setForm({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        is_public: true,
      });
      fetchContests();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create contest");
    }
  };

  const handleSelectContest = (contest) => {
    setSelectedContest(contest);
    fetchContestProblems(contest.id);
    setActiveTab("manage");
  };

  const handleAddProblem = async () => {
    if (!addProblemId) return;
    try {
      await api.post(`/admin/contests/${selectedContest.id}/problems`, {
        problem_id: addProblemId,
      });
      fetchContestProblems(selectedContest.id);
      setAddProblemId("");
    } catch (err) {
      console.error("Failed to add problem");
    }
  };

  const handleRemoveProblem = async (problemId) => {
    try {
      await api.delete(
        `/admin/contests/${selectedContest.id}/problems/${problemId}`
      );
      fetchContestProblems(selectedContest.id);
    } catch (err) {
      console.error("Failed to remove problem");
    }
  };

  const getStatusBadge = (contest) => {
    const now = new Date();
    const start = new Date(contest.start_time);
    const end = new Date(contest.end_time);

    if (now < start)
      return (
        <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
          Upcoming
        </span>
      );
    if (now >= start && now <= end)
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Live
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full border border-slate-400/20 bg-slate-400/10 px-3 py-1 text-xs font-semibold text-slate-300">
        Ended
      </span>
    );
  };

  const tabs = [
    { key: "contests", label: "All Contests" },
    { key: "create", label: "Create Contest" },
    { key: "manage", label: selectedContest ? `Manage: ${selectedContest.title}` : "Manage Contest" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total Contests
          </p>
          <h3 className="mt-3 text-3xl font-bold text-white">
            {contests.length}
          </h3>
          <p className="mt-2 text-sm text-slate-400">All hosted contests</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Live Now
          </p>
          <h3 className="mt-3 text-3xl font-bold text-emerald-300">
            {
              contests.filter((c) => {
                const now = new Date();
                return (
                  now >= new Date(c.start_time) && now <= new Date(c.end_time)
                );
              }).length
            }
          </h3>
          <p className="mt-2 text-sm text-slate-400">Currently running</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Upcoming
          </p>
          <h3 className="mt-3 text-3xl font-bold text-amber-300">
            {
              contests.filter((c) => new Date() < new Date(c.start_time))
                .length
            }
          </h3>
          <p className="mt-2 text-sm text-slate-400">Scheduled contests</p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              activeTab === tab.key
                ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* All Contests Tab */}
      {activeTab === "contests" && (
        <section className="grid gap-6 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl xl:col-span-3">
            <h2 className="text-xl font-semibold text-white">Contest Archive</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              Click a contest to manage its problems and view rankings.
            </p>

            {loading && (
              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200">
                Loading contests...
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {!loading && contests.length === 0 && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                No contests yet. Create one to get started.
              </div>
            )}

            <div className="mt-5 space-y-4">
              {contests.map((contest) => (
                <div
                  key={contest.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-sky-400/20 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-white">
                        {contest.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {contest.description || "No description provided."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>
                          Start:{" "}
                          <strong className="text-slate-200">
                            {new Date(contest.start_time).toLocaleString()}
                          </strong>
                        </span>
                        <span>
                          End:{" "}
                          <strong className="text-slate-200">
                            {new Date(contest.end_time).toLocaleString()}
                          </strong>
                        </span>
                        <span>
                          Visibility:{" "}
                          <strong className="text-slate-200">
                            {contest.is_public ? "Public" : "Private"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-3">
                      {getStatusBadge(contest)}
                      <button
                        onClick={() => handleSelectContest(contest)}
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6 xl:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setActiveTab("create")}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
                >
                  + Create Contest
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Contest Status</h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                <li>
                  <strong className="text-emerald-300">Live:</strong> Contest is
                  currently running.
                </li>
                <li>
                  <strong className="text-amber-300">Upcoming:</strong> Scheduled
                  for the future.
                </li>
                <li>
                  <strong className="text-slate-300">Ended:</strong> Past the end
                  time.
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Create Contest Tab */}
      {activeTab === "create" && (
        <section className="grid gap-6 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl xl:col-span-3">
            <h2 className="text-xl font-semibold text-white">Create New Contest</h2>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              Fill in the details below to host a new contest.
            </p>

            <form onSubmit={handleCreateContest} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Contest Title
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                  type="text"
                  name="title"
                  placeholder="e.g. Weekly Contest #12"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Description
                </label>
                <textarea
                  className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                  name="description"
                  placeholder="Short description of the contest..."
                  rows={3}
                  value={form.description}
                  onChange={handleFormChange}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Start Time
                  </label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                    type="datetime-local"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    End Time
                  </label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 outline-none transition focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                    type="datetime-local"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  name="is_public"
                  checked={form.is_public}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded accent-indigo-500"
                />
                <label
                  htmlFor="is_public"
                  className="text-sm font-medium text-slate-200"
                >
                  Make this contest public
                </label>
              </div>

              {formError && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
              >
                Create Contest
              </button>
            </form>
          </div>

          <div className="space-y-6 xl:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Tips</h3>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
                <li>Set a clear title that describes the contest theme.</li>
                <li>Make sure start time is in the future.</li>
                <li>After creating, go to Manage to add problems.</li>
                <li>Public contests are visible to all users.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Manage Contest Tab */}
      {activeTab === "manage" && selectedContest && (
        <section className="grid gap-6 xl:grid-cols-4">
          <div className="space-y-6 xl:col-span-3">
            {/* Problem Management */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">
                Problems in "{selectedContest.title}"
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Add or remove problems assigned to this contest.
              </p>

              {/* Add problem */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                  value={addProblemId}
                  onChange={(e) => setAddProblemId(e.target.value)}
                >
                  <option value="">Select a problem to add...</option>
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} — {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddProblem}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
                >
                  Add Problem
                </button>
              </div>

              {/* Problem list */}
              <div className="mt-5 space-y-3">
                {contestProblems.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                    No problems added yet.
                  </div>
                )}

                {contestProblems.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-400/15 text-sm font-semibold text-indigo-200">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {p.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          ID: {p.id} · {p.difficulty}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveProblem(p.id)}
                      className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking Table */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">
                Contest Ranking
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Live leaderboard for this contest.
              </p>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Solved
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Penalty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Last Submission
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-slate-400"
                      >
                        Ranking data will appear here once submissions come in.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side info */}
          <div className="space-y-6 xl:col-span-1">
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">
                Contest Info
              </h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Title</span>
                  <strong className="max-w-[130px] truncate text-right text-sm text-white">
                    {selectedContest.title}
                  </strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Status</span>
                  {getStatusBadge(selectedContest)}
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Visibility</span>
                  <strong className="text-sm text-white">
                    {selectedContest.is_public ? "Public" : "Private"}
                  </strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Problems</span>
                  <strong className="text-sm text-white">
                    {contestProblems.length}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">Actions</h3>
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setActiveTab("contests")}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  ← Back to All Contests
                </button>
                <button
                  onClick={() => setActiveTab("create")}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:translate-y-[-1px]"
                >
                  + Create New Contest
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* No contest selected in manage tab */}
      {activeTab === "manage" && !selectedContest && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-slate-400">
          Select a contest from the All Contests tab to manage it.
        </div>
      )}
    </div>
  );
}

export default AdminContestPage;