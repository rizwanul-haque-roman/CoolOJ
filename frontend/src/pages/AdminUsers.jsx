import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

function readStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function roleBadgeClass(role) {
  return role === "admin"
    ? "border-violet-400/20 bg-violet-400/10 text-violet-200"
    : "border-sky-400/20 bg-sky-400/10 text-sky-200";
}

function statusBadgeClass(status) {
  if (status === "active") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "suspended") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-200";
}

function getInitials(name) {
  if (!name) return "U";

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function AdminUsers() {
  const currentUser = useMemo(readStoredUser, []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to load users. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        [user.id, user.name, user.email, user.role, user.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const updateUserInList = (updatedUser) => {
    setUsers((previousUsers) =>
      previousUsers.map((user) =>
        Number(user.id) === Number(updatedUser.id)
          ? { ...user, ...updatedUser }
          : user,
      ),
    );

    setSelectedUser((previousSelectedUser) => {
      if (
        !previousSelectedUser ||
        Number(previousSelectedUser.id) !== Number(updatedUser.id)
      ) {
        return previousSelectedUser;
      }

      return {
        ...previousSelectedUser,
        ...updatedUser,
      };
    });
  };

  const handleRoleChange = async (user, role) => {
    if (user.role === role) return;

    const confirmed = window.confirm(
      `Change ${user.name}'s role from ${user.role} to ${role}?`,
    );

    if (!confirmed) return;

    try {
      setActionLoading(`role-${user.id}`);
      setError("");
      setSuccess("");

      const response = await api.patch(`/admin/users/${user.id}/role`, {
        role,
      });

      updateUserInList(response.data.user);
      setSuccess(response.data.message || "User role updated successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to update user role.");
    } finally {
      setActionLoading("");
    }
  };

  const handleStatusChange = async (user, status) => {
    if (user.status === status) return;

    let reason = "";

    if (status === "suspended") {
      reason = window.prompt(
        `Why are you suspending ${user.name}? This is optional.`,
        suspensionReason,
      );

      if (reason === null) return;
    }

    const actionLabel =
      status === "active"
        ? "restore"
        : status === "suspended"
          ? "suspend"
          : "soft-delete";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${user.name}?`,
    );

    if (!confirmed) return;

    try {
      setActionLoading(`status-${user.id}`);
      setError("");
      setSuccess("");

      const response = await api.patch(`/admin/users/${user.id}/status`, {
        status,
        reason,
      });

      updateUserInList(response.data.user);
      setSuspensionReason("");
      setSuccess(response.data.message || "User status updated successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to update user status.");
    } finally {
      setActionLoading("");
    }
  };

  const isCurrentUser = (user) =>
    Number(user.id) === Number(currentUser?.id);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const suspendedUsers = users.filter(
    (user) => user.status === "suspended",
  ).length;
  const adminUsers = users.filter((user) => user.role === "admin").length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Administration
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              User Management
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              Search user accounts, inspect activity, manage roles, suspend
              accounts, restore access, or safely soft-delete accounts without
              deleting their submissions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading || Boolean(actionLoading)}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Users"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Users
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              {users.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/70">
              Active
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {activeUsers}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
              Suspended
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-300">
              {suspendedUsers}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/70">
              Administrators
            </p>
            <p className="mt-2 text-3xl font-bold text-violet-300">
              {adminUsers}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ID, username, email, role, or status..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/10"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {!loading && !error && (
          <p className="mt-4 text-sm text-slate-400">
            Showing {filteredUsers.length} of {users.length} user
            {users.length === 1 ? "" : "s"}.
          </p>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            Loading users...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-200">
              No user accounts found.
            </p>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[1250px] w-full text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Submissions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Accepted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = isCurrentUser(user);
                  const isUpdating =
                    actionLoading === `role-${user.id}` ||
                    actionLoading === `status-${user.id}`;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold text-white">
                            {getInitials(user.name)}
                          </span>

                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold text-white">
                                {user.name}
                              </span>

                              {isSelf && (
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                                  You
                                </span>
                              )}
                            </span>

                            <span className="mt-1 block truncate text-xs text-slate-500">
                              #{user.id} · {user.email}
                            </span>
                          </span>
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${roleBadgeClass(
                            user.role,
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(
                            user.status,
                          )}`}
                        >
                          {user.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-slate-200">
                        {Number(user.submission_count || 0)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-emerald-300">
                        {Number(user.accepted_count || 0)}
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-400">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleString()
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {isSelf ? (
                          <span className="text-xs text-slate-500">
                            Self actions locked
                          </span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                handleRoleChange(
                                  user,
                                  user.role === "admin" ? "student" : "admin",
                                )
                              }
                              className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionLoading === `role-${user.id}`
                                ? "Saving..."
                                : user.role === "admin"
                                  ? "Make Student"
                                  : "Make Admin"}
                            </button>

                            {user.status === "active" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStatusChange(user, "suspended")
                                }
                                className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            )}

                            {user.status === "suspended" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStatusChange(user, "active")
                                }
                                className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Restore
                              </button>
                            )}

                            {user.status === "deleted" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStatusChange(user, "active")
                                }
                                className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Restore
                              </button>
                            )}

                            {user.status !== "deleted" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStatusChange(user, "deleted")
                                }
                                className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading &&
          !error &&
          users.length > 0 &&
          filteredUsers.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-200">
                No users match the selected filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-3 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                Clear filters
              </button>
            </div>
          )}
      </section>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
          onMouseDown={() => setSelectedUser(null)}
        >
          <section
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-lg font-bold text-white">
                  {getInitials(selectedUser.name)}
                </span>

                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedUser.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    #{selectedUser.id} · {selectedUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.1]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Role
                </p>
                <p className="mt-2 font-semibold capitalize text-white">
                  {selectedUser.role}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Account Status
                </p>
                <p className="mt-2 font-semibold capitalize text-white">
                  {selectedUser.status}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total Submissions
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {Number(selectedUser.submission_count || 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Accepted Solutions
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {Number(selectedUser.accepted_count || 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Joined
                </p>
                <p className="mt-2 font-semibold text-white">
                  {selectedUser.created_at
                    ? new Date(selectedUser.created_at).toLocaleString()
                    : "—"}
                </p>
              </div>

              {selectedUser.status === "suspended" && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-amber-200/70">
                    Suspension Information
                  </p>

                  <p className="mt-2 text-sm text-amber-100">
                    Reason:{" "}
                    {selectedUser.suspended_reason ||
                      "No reason was recorded."}
                  </p>

                  <p className="mt-2 text-xs text-amber-200/70">
                    Suspended at:{" "}
                    {selectedUser.suspended_at
                      ? new Date(
                          selectedUser.suspended_at,
                        ).toLocaleString()
                      : "—"}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;