import { NavLink } from 'react-router-dom'
import { Code2, FileCode2, LogIn, UserPlus, LayoutDashboard } from 'lucide-react'

function Navbar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <Code2 size={22} />
        </div>
        <div className="brand-text">
          <h2>CoolOJ</h2>
          <p>Future Judge Platform</p>
        </div>
      </div>

      <div className="nav-section">
        <p className="nav-section-title">Navigation</p>

        <NavLink
          to="/problems"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Problems</span>
        </NavLink>

        <NavLink
          to="/submissions"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileCode2 size={18} />
          <span>Submissions</span>
        </NavLink>

        <NavLink
          to="/login"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LogIn size={18} />
          <span>Login</span>
        </NavLink>

        <NavLink
          to="/register"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <UserPlus size={18} />
          <span>Register</span>
        </NavLink>
      </div>
    </aside>
  )
}

export default Navbar