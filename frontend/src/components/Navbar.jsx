import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import dpc from "../assets/dpc.png";
import {
  Code2,
  FileCode2,
  FilePenLine,
  GraduationCap,
  LogIn,
  UserPlus,
  ShieldUser,
  Trophy,
  LogOut,
  UserRound,
  Users,
  LayoutDashboard,
  ClipboardList,
  ScrollText,
} from "lucide-react";

function readStoredUser() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
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

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const updateUser = () => {
      setUser(readStoredUser());
    };

    window.addEventListener("authChanged", updateUser);
    window.addEventListener("storage", updateUser);

    return () => {
      window.removeEventListener("authChanged", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  const mainItems = [
    {
      to: "/problems",
      label: "Problems",
      icon: Code2,
    },
    {
      to: "/submissions",
      label: "Submissions",
      icon: FileCode2,
    },
    {
      to: "/learn",
      label: "Learn",
      icon: GraduationCap,
    },
    {
      to: "/contests",
      label: "Contests",
      icon: Trophy,
    },
  ];

  const adminItems = [
    {
      to: "/admin/problems",
      label: "Manage Problems",
      icon: FilePenLine,
    },
    {
      to: "/admin/contests",
      label: "Contest Control",
      icon: ClipboardList,
    },
    {
      to: "/admin/submissions",
      label: "Submission Review",
      icon: ScrollText,
    },
    {
      to: "/admin/users",
      label: "User Management",
      icon: Users,
    },
    {
      to: "/admin/dashboard",
      label: "Admin Dashboard",
      icon: LayoutDashboard,
    },
  ];

  const loggedOutItems = [
    {
      to: "/login",
      label: "Login",
      icon: LogIn,
    },
    {
      to: "/register",
      label: "Register",
      icon: UserPlus,
    },
  ];

  const linkClasses = ({ isActive }) =>
    [
      "flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
      isActive
        ? "border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 text-white shadow-[0_10px_30px_rgba(109,124,255,0.18)]"
        : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100",
    ].join(" ");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  return (
    <aside className="flex h-auto w-full shrink-0 flex-col border-b border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl md:h-screen md:w-64 md:overflow-hidden md:border-b-0 md:border-r md:p-5">
      <div className="shrink-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <img
            src={dpc}
            alt="DPC-OJ logo"
            className="h-12 w-12 rounded-2xl object-cover"
          />

          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">DPC-OJ</p>
            <p className="truncate text-xs text-slate-400">
              Future Judge Platform
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(148,163,184,0.35)_transparent] [scrollbar-width:thin]">
        <section>
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>

          <nav className="space-y-2">
            {mainItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink key={item.to} to={item.to} className={linkClasses}>
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </section>

        {user?.role === "admin" && (
          <section className="mt-7">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/70">
              Administration
            </p>

            <nav className="space-y-2">
              {adminItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink key={item.to} to={item.to} className={linkClasses}>
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </section>
        )}

        {!user && (
          <section className="mt-7">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Account
            </p>

            <nav className="space-y-2">
              {loggedOutItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink key={item.to} to={item.to} className={linkClasses}>
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </section>
        )}
      </div>

      {user && (
        <div className="mt-5 shrink-0 border-t border-white/10 pt-5">
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Account
          </p>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold text-white">
                {getInitials(user.name)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.name}
                </p>

                <p
                  className={[
                    "text-xs font-medium capitalize",
                    user.role === "admin"
                      ? "text-cyan-300"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {user.role || "student"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
            >
              <UserRound size={18} strokeWidth={1.8} />
              <span>Profile</span>
            </button>

            {user.role === "admin" && (
              <NavLink to="/admin/contests" className={linkClasses}>
                <ShieldUser size={18} strokeWidth={1.8} />
                <span>Admin Control</span>
              </NavLink>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:border-rose-400/20 hover:bg-rose-400/10 hover:text-rose-200"
            >
              <LogOut size={18} strokeWidth={1.8} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Navbar;