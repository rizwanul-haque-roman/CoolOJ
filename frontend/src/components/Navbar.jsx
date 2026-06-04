import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav style={{ padding: '16px', borderBottom: '1px solid #ddd', display: 'flex', gap: '16px' }}>
      <Link to="/problems">Problems</Link>
      <Link to="/submissions">Submissions</Link>
      <Link to="/login">Login</Link>
      <Link to="/register">Register</Link>
    </nav>
  )
}

export default Navbar