import { Routes, Route, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Problems from './pages/Problems'
import ProblemDetails from './pages/ProblemDetails'
import Submissions from './pages/Submissions'
import Navbar from './components/Navbar'

function App() {
  const location = useLocation()

  const getPageTitle = () => {
    if (location.pathname.startsWith('/login')) return 'Login'
    if (location.pathname.startsWith('/register')) return 'Register'
    if (location.pathname.startsWith('/submissions')) return 'Submissions'
    if (location.pathname.startsWith('/problems/')) return 'Problem Details'
    return 'Problems'
  }

  const getPageSubtitle = () => {
    if (location.pathname.startsWith('/login')) return 'Access your futuristic coding workspace'
    if (location.pathname.startsWith('/register')) return 'Create your account and start solving'
    if (location.pathname.startsWith('/submissions')) return 'Track code runs, verdicts, and results'
    if (location.pathname.startsWith('/problems/')) return 'Read the statement and submit your solution'
    return 'Browse challenges and sharpen your problem solving'
  }

  return (
    <div className="app-shell">
      <Navbar />

      <main className="main-area">
        <div className="topbar">
          <div>
            <h1>{getPageTitle()}</h1>
            <p>{getPageSubtitle()}</p>
          </div>

          <div className="topbar-right">
            <div className="pill">Dark Neon UI</div>
            <div className="pill">CoolOJ v1</div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Problems />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:id" element={<ProblemDetails />} />
          <Route path="/submissions" element={<Submissions />} />
        </Routes>
      </main>
    </div>
  )
}

export default App