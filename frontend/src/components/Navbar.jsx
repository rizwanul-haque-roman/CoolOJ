import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import dpc from "../assets/dpc.png";
import {
  Code2,
  FileCode2,
  GraduationCap,
  LogIn,
  UserPlus,
  ShieldUser,
  Trophy,
  LogOut,
  UserRound,
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

  const words = name.trim().split(/\s+/).filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const updateUser = () => setUser(readStoredUser());

    window.addEventListener("authChanged", updateUser);
    window.addEventListener("storage", updateUser);

    return () => {
      window.removeEventListener("authChanged", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  const mainItems = [
    { to: "/problems", label: "Problems", icon: Code2 },
    { to: "/submissions", label: "Submissions", icon: FileCode2 },
    { to: "/learn", label: "Learn", icon: GraduationCap },
    { to: "/contests", label: "Contests", icon: Trophy },
  ];

  const loggedOutItems = [
    { to: "/login", label: "Login", icon: LogIn },
    { to: "/register", label: "Register", icon: UserPlus },
  ];

  const linkClasses = ({ isActive }) =>
    [
      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
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
    <aside className="sticky top-0 flex min-h-screen w-64 flex-col border-r border-white/10 bg-slate-950/70 px-4 py-6 shadow-2xl backdrop-blur-xl max-md:min-h-auto max-md:w-full max-md:border-r-0 max-md:border-b">
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white text-white shadow-[0_0_30px_rgba(109,124,255,0.35)]">
          <img src={dpc} alt="DPC" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-50">DPC-OJ</h2>
          <p className="text-xs text-slate-400">Future Judge Platform</p>
        </div>
      </div>

      <div className="mb-3 pl-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        Navigation
      </div>

      <nav className="flex flex-col gap-2">
        {mainItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className={linkClasses}>
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mb-3 mt-8 pl-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        Account
      </div>

      {user ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold text-white shadow-lg">
              {getInitials(user.name)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user.name || "User"}
              </p>
              <p className="mt-0.5 truncate text-xs capitalize text-cyan-200/80">
                {user.role || "student"}
              </p>
            </div>
          </div>

          {user.role === "admin" && (
            <NavLink to="/admin/contests" className={linkClasses}>
              <ShieldUser size={18} />
              <span>Admin</span>
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-rose-400/20 hover:bg-rose-400/10 hover:text-rose-200"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <nav className="flex flex-col gap-2">
          {loggedOutItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className={linkClasses}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </aside>
  );
}

export default Navbar;