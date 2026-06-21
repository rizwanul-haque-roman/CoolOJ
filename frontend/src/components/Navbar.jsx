import { NavLink } from "react-router-dom";
import dpc from "../assets/dpc.png";
import {
  BookOpen,
  Code2,
  FileCode2,
  GraduationCap,
  LogIn,
  UserPlus,
  ShieldUser,
  Trophy
} from "lucide-react";

function Navbar() {
  const mainItems = [
    { to: "/problems", label: "Problems", icon: Code2 },
    { to: "/submissions", label: "Submissions", icon: FileCode2 },
    { to: "/learn", label: "Learn", icon: GraduationCap },
    { to: "/contests", label: "Contests", icon: Trophy },
  ];

  const accountItems = [
    { to: "/login", label: "Login", icon: LogIn },
    { to: "/register", label: "Register", icon: UserPlus },
    { to: "/admin/contests", label: "Admin", icon: ShieldUser },
  ];

  const linkClasses = ({ isActive }) =>
    [
      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
      isActive
        ? "border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 text-white shadow-[0_10px_30px_rgba(109,124,255,0.18)]"
        : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100",
    ].join(" ");

  return (
    <aside className="sticky top-0 flex min-h-screen w-64 flex-col border-r border-white/10 bg-slate-950/70 px-4 py-6 shadow-2xl backdrop-blur-xl max-md:min-h-auto max-md:w-full max-md:border-r-0 max-md:border-b">
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-white shadow-[0_0_30px_rgba(109,124,255,0.35)]">
          {/* <BookOpen size={18} /> */}
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

      <nav className="flex flex-col gap-2">
        {accountItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className={linkClasses}>
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Navbar;