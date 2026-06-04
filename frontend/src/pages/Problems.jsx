import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

function Problems() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await api.get('/problems')
        setProblems(res.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load problems')
      } finally {
        setLoading(false)
      }
    }

    fetchProblems()
  }, [])

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      const title = (problem.title || '').toLowerCase()
      const difficulty = (problem.difficulty || '').toLowerCase()
      const query = search.toLowerCase()

      return title.includes(query) || difficulty.includes(query)
    })
  }, [problems, search])

  const totalProblems = problems.length
  const easyCount = problems.filter(
    (problem) => (problem.difficulty || '').toLowerCase() === 'easy'
  ).length
  const mediumCount = problems.filter(
    (problem) => (problem.difficulty || '').toLowerCase() === 'medium'
  ).length
  const hardCount = problems.filter(
    (problem) => (problem.difficulty || '').toLowerCase() === 'hard'
  ).length

  const getDifficultyClass = (difficulty) => {
    const value = (difficulty || '').toLowerCase()

    if (value === 'easy') return 'badge badge-easy'
    if (value === 'medium') return 'badge badge-medium'
    if (value === 'hard') return 'badge badge-hard'
    return 'badge'
  }

  return (
    <div>
      <section className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Total Problems</p>
          <h3 className="stat-value">{totalProblems}</h3>
          <p className="stat-sub">All available coding challenges</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Easy Track</p>
          <h3 className="stat-value">{easyCount}</h3>
          <p className="stat-sub">Warm-up and beginner-friendly tasks</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Medium Track</p>
          <h3 className="stat-value">{mediumCount}</h3>
          <p className="stat-sub">Core problem-solving practice</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Hard Track</p>
          <h3 className="stat-value">{hardCount}</h3>
          <p className="stat-sub">Advanced challenge mode</p>
        </div>
      </section>

      <section className="problem-layout">
        <div className="problem-panel">
          <div className="panel-heading">
            <div>
              <h2>Problem Archive</h2>
              <p>Search, explore, and enter any challenge from the archive.</p>
            </div>

            <input
              type="text"
              className="search-box"
              placeholder="Search by title or difficulty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading && <div className="loading-box">Loading problems...</div>}

          {error && !loading && <div className="error-box">{error}</div>}

          {!loading && !error && filteredProblems.length === 0 && (
            <div className="empty-box">No problems matched your search.</div>
          )}

          {!loading && !error && filteredProblems.length > 0 && (
            <div className="problem-list">
              {filteredProblems.map((problem) => (
                <div key={problem.id} className="problem-item">
                  <div className="problem-top">
                    <div>
                      <h3 className="problem-title">{problem.title}</h3>
                      <p className="problem-meta">
                        Problem ID: {problem.id}
                      </p>
                    </div>

                    <span className={getDifficultyClass(problem.difficulty)}>
                      {problem.difficulty || 'Unknown'}
                    </span>
                  </div>

                  <p className="problem-description">
                    Solve this problem, test your logic, and push your solution
                    through the judge.
                  </p>

                  <div className="problem-actions">
                    <p className="problem-meta">
                      Ready for coding and submission workflow
                    </p>

                    <Link to={`/problems/${problem.id}`} className="problem-link">
                      Open Problem
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="problem-panel side-widget">
            <h3>Archive Status</h3>
            <div className="mini-kpi">
              <span>Total visible</span>
              <strong>{filteredProblems.length}</strong>
            </div>
            <div className="mini-kpi">
              <span>Search query</span>
              <strong>{search ? search : 'None'}</strong>
            </div>
            <div className="mini-kpi">
              <span>System mode</span>
              <strong>Online</strong>
            </div>
          </div>

          <div className="problem-panel side-widget">
            <h3>Difficulty Guide</h3>
            <ul>
              <li><strong style={{ color: '#62f0b3' }}>Easy:</strong> basic implementation and warm-up level.</li>
              <li><strong style={{ color: '#ffc76b' }}>Medium:</strong> stronger logic, patterns, and careful handling.</li>
              <li><strong style={{ color: '#ff8a9d' }}>Hard:</strong> advanced reasoning and tighter constraints.</li>
            </ul>
          </div>

          <div className="problem-panel side-widget">
            <h3>Quick Tip</h3>
            <p>
              Start with easier tasks, get your submission flow working, then move
              toward medium and hard problems once the judge integration is fully stable.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Problems