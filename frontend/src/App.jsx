import { Routes, Route, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Problems from './pages/Problems'
import ProblemDetails from './pages/ProblemDetails'
import Submissions from './pages/Submissions'
import Learn from './pages/Learn'
import LearnTopic from './pages/LearnTopic'
import Navbar from './components/Navbar'

function App() {
  const location = useLocation()

  const getPageTitle = () => {
    if (location.pathname.startsWith('/login')) return 'Login'
    if (location.pathname.startsWith('/register')) return 'Register'
    if (location.pathname.startsWith('/submissions')) return 'Submissions'
    if (location.pathname.startsWith('/learn/topic/')) return 'Learn Topic'
    if (location.pathname.startsWith('/learn')) return 'Learning Hub'
    if (location.pathname.startsWith('/problems/')) return 'Problem Details'
    return 'Problems'
  }

  const getPageSubtitle = () => {
    if (location.pathname.startsWith('/login')) return 'Access your futuristic coding workspace'
    if (location.pathname.startsWith('/register')) return 'Create your account and start solving'
    if (location.pathname.startsWith('/submissions')) return 'Track code runs, verdicts, and results'
    if (location.pathname.startsWith('/learn/topic/')) return 'Study the lesson and practice in the editor'
    if (location.pathname.startsWith('/learn')) return 'Explore semester-wise learning and guided coding'
    if (location.pathname.startsWith('/problems/')) return 'Read the statement and submit your solution'
    return 'Browse challenges and sharpen your problem solving'
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(61,217,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(109,124,255,0.18),transparent_32%),linear-gradient(135deg,#070b17,#0b1020)] text-slate-100 md:flex">
      <Navbar />

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-[22px] border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {getPageTitle()}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {getPageSubtitle()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300">
              Dark Neon UI
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300">
              CoolOJ v1
            </span>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Problems />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:id" element={<ProblemDetails />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/topic/:topicId" element={<LearnTopic />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  )
}

export default App